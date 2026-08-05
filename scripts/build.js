// Builds Touch Portal plugin packages (.tpp) for the platform this script runs on.
//
// The plugin ships as a Node Single Executable Application: the bundled plugin code is
// injected into a copy of the running node binary. A build can therefore only ever target
// its own host platform, which is why CI runs this script once per OS rather than
// cross-compiling everything from one runner. See .github/workflows/build.yml.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const AdmZip = require("adm-zip");
const esbuild = require("esbuild");

const packageJson = require("../package.json");

const ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(ROOT, "build");
const INSTALLERS_DIR = path.join(ROOT, "Installers");

// Touch Portal unpacks the .tpp into a folder of this name, and the plugin_start_cmd_*
// paths in entry.tp are written against it.
const PLUGIN_FOLDER = packageJson.name;

// https://nodejs.org/api/single-executable-applications.html
const SEA_FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";

// Unix permission bits the extracted files should end up with.
const MODE_EXEC = 0o755;
const MODE_DATA = 0o644;

// Zip "version made by": high byte 3 = UNIX, low byte = spec version 2.0. Extractors only
// apply the permission bits from a member's external attributes when this field says the
// archive was made on UNIX. adm-zip defaults to the host it runs on, so a package built on
// Windows used to advertise host 10 (NTFS) and every extractor silently discarded the mode
// bits - which is why the executable came out non-executable on Linux and macOS.
const ZIP_MADE_BY_UNIX = 0x0314;

const isWindows = process.platform === "win32";
const isMac = process.platform === "darwin";

const TARGETS = {
  win32: () => "Windows",
  linux: () => "Linux",
  darwin: () => (process.arch === "arm64" ? "MacOS-Arm64" : "MacOS"),
};

// Discord release channels differ only in discordPaths.js, and only in its win32 entry, so
// alternate channels are Windows-only. The value is compiled into the bundle, so each
// channel needs its own executable.
const CHANNELS = {
  Windows: [undefined, "Canary", "PTB"],
};

const run = (file, args) => execFileSync(file, args, { cwd: ROOT, stdio: "inherit" });

const resolveTarget = () => {
  const target = TARGETS[process.platform];
  if (!target) {
    throw new Error(`Unsupported build platform: ${process.platform} (${process.arch})`);
  }
  return target();
};

const target = resolveTarget();
const executableName = isWindows ? `${PLUGIN_FOLDER}.exe` : PLUGIN_FOLDER;

// touchportal-api publishes uncompiled sources; its package "main" points at dist/src,
// which does not exist until the package's own tsconfig has been compiled. Doing it here
// rather than as a separate CI step keeps `npm run build` working from a bare npm ci.
const buildDependencies = () => {
  const entryPoint = path.join(ROOT, "node_modules/touchportal-api/dist/src/index.js");
  if (fs.existsSync(entryPoint)) {
    return;
  }

  console.log("Compiling touchportal-api");
  try {
    run(process.execPath, [
      path.join(ROOT, "node_modules/typescript/bin/tsc"),
      "-p",
      path.join(ROOT, "node_modules/touchportal-api/tsconfig.json"),
    ]);
  } catch (error) {
    // checkJs is on in that tsconfig, so tsc can report errors in the dependency's own
    // sources while still emitting usable output. Only treat it as fatal if nothing landed.
    if (!fs.existsSync(entryPoint)) {
      throw error;
    }
    console.warn("touchportal-api reported compile warnings but emitted output; continuing");
  }
};

const bundle = (channel) => {
  const config = channel ? `configs/discordPaths.js.${channel}` : "configs/discordPaths.js";
  fs.copyFileSync(path.join(ROOT, config), path.join(ROOT, "src/discordPaths.js"));

  const outfile = path.join(BUILD_DIR, "bundle.cjs");
  esbuild.buildSync({
    entryPoints: [path.join(ROOT, "src/index.js")],
    outfile,
    bundle: true,
    platform: "node",
    target: "node22",
    format: "cjs",
    // Both of these are optional requires in discord-rpc's util.js, already wrapped in
    // try/catch and neither is installed. Leaving them unresolved preserves the fallback.
    external: ["electron", "register-scheme"],
    // touchportal-api reads the plugin version out of the app's package.json at runtime.
    // There is no package.json beside a single-file executable, so the shim supplies it.
    alias: { "require-from-app-root": path.join(__dirname, "shims/require-from-app-root.js") },
    define: { "process.env.__TPDISCORD_VERSION__": JSON.stringify(packageJson.version) },
  });

  return outfile;
};

const createExecutable = (bundlePath, outFile) => {
  const seaConfig = path.join(BUILD_DIR, "sea-config.json");
  const blob = path.join(BUILD_DIR, "sea-prep.blob");

  fs.writeFileSync(
    seaConfig,
    JSON.stringify({ main: bundlePath, output: blob, disableExperimentalSEAWarning: true }, null, 2),
  );

  run(process.execPath, ["--experimental-sea-config", seaConfig]);
  fs.copyFileSync(process.execPath, outFile);

  // Injecting the blob rewrites the binary and invalidates the code signature node ships
  // with. On macOS that is fatal rather than cosmetic - the kernel refuses to exec a
  // Mach-O with a broken signature on arm64 - so strip it first and ad-hoc sign after.
  // (On Windows postject warns about the Authenticode signature; the binary still runs.)
  if (isMac) {
    run("codesign", ["--remove-signature", outFile]);
  }

  const postjectArgs = [
    require.resolve("postject/dist/cli.js"),
    outFile,
    "NODE_SEA_BLOB",
    blob,
    "--sentinel-fuse",
    SEA_FUSE,
  ];
  if (isMac) {
    postjectArgs.push("--macho-segment-name", "NODE_SEA");
  }
  run(process.execPath, postjectArgs);

  if (isMac) {
    run("codesign", ["--sign", "-", outFile]);
  }
  if (!isWindows) {
    fs.chmodSync(outFile, MODE_EXEC);
  }
};

const addEntry = (zip, name, data, mode) => {
  const entryName = `${PLUGIN_FOLDER}/${name}`;
  zip.addFile(entryName, data, "", mode);

  const entry = zip.getEntry(entryName);
  // S_IFREG | mode, in the high 16 bits of the external attributes where Unix extractors
  // look for it. Set explicitly rather than left to adm-zip, which derives it from the
  // source file's stat mode and so never produces an execute bit when built on Windows.
  entry.header.attr = ((0x8000 | mode) << 16) >>> 0;
  entry.header.made = ZIP_MADE_BY_UNIX;
};

const writePackage = (executablePath, channel) => {
  const zip = new AdmZip();
  addEntry(zip, "entry.tp", fs.readFileSync(path.join(ROOT, "base/entry.tp")), MODE_DATA);
  addEntry(zip, `${PLUGIN_FOLDER}.png`, fs.readFileSync(path.join(ROOT, "base/plugin_icon.png")), MODE_DATA);
  addEntry(zip, path.basename(executablePath), fs.readFileSync(executablePath), MODE_EXEC);

  const label = channel ? `${target}-${channel}` : target;
  const packagePath = path.join(INSTALLERS_DIR, `${PLUGIN_FOLDER}-${label}-${packageJson.version}.tpp`);
  zip.writeZip(packagePath);

  return packagePath;
};

const main = () => {
  buildDependencies();

  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.mkdirSync(INSTALLERS_DIR, { recursive: true });

  try {
    for (const channel of CHANNELS[target] ?? [undefined]) {
      console.log(`\n=== ${target}${channel ? ` (${channel})` : ""} ===`);

      const bundlePath = bundle(channel);
      const executablePath = path.join(BUILD_DIR, executableName);
      createExecutable(bundlePath, executablePath);

      console.log(`Wrote ${path.relative(ROOT, writePackage(executablePath, channel))}`);
      fs.rmSync(executablePath);
    }
  } finally {
    // src/discordPaths.js is checked in, so restore the stable-channel copy rather than
    // leaving a build dirtying the working tree or breaking `npm start`.
    fs.copyFileSync(path.join(ROOT, "configs/discordPaths.js"), path.join(ROOT, "src/discordPaths.js"));
  }
};

main();
