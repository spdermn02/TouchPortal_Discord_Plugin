const AdmZip = require("adm-zip");
const path  = require("path");
const fs = require("fs");
const pkg = require("pkg");
const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"))
const { exit } = require("process")

const build = async(platform, options ) => {
    if( fs.existsSync(`./base/${platform}`) ) {
      fs.rmdirSync(`./base/${platform}`, { recursive : true})
    }
    fs.mkdirSync(`./base/${platform}`)
    fs.copyFileSync("./base/entry.tp", `./base/${platform}/entry.tp`)
    fs.copyFileSync("./base/plugin_icon.png", `./base/${platform}/${packageJson.name}.png`)
    
    if(options !== undefined && fs.existsSync(`./configs/config.js.${options.type}`) ){
      fs.copyFileSync(`./configs/config.js.${options.type}`, './src/config.js')
    }
    else {
      fs.copyFileSync(`./configs/config.js`, './src/config.js')
    }

    let nodeVersion = 'node18-win-x64'
    let execName = `${packageJson.name}.exe`

    if( platform != "Windows" ) {
        execName = packageJson.name
        fs.copyFileSync("./base/start_tpdiscord.sh", `./base/${platform}/start_tpdiscord.sh`)
    }

    if( platform == "MacOS") {
        nodeVersion = 'node18-macos-x64'
    }
    if( platform == "MacOS-Arm64") {
        nodeVersion = '???'
    }
    if( platform == "Linux") {
        nodeVersion = 'node18-linux-x64'
    }

    console.log("Running pkg")
    await pkg.exec([
      "--targets",
      nodeVersion,
      "--output",
      `base/${platform}/${execName}`,
      ".",
    ]);
    
    console.log("Running Zip File Creation")
    const zip = new AdmZip()
    zip.addLocalFolder(
      path.normalize(`./base/${platform}/`),
      packageJson.name
    );
    
    let packageName = `./Installers/${packageJson.name}-${platform}-${packageJson.version}.tpp`
    if( options?.type !== undefined ) {
      packageName = `./Installers/${packageJson.name}-${platform}-${options.type}-${packageJson.version}.tpp`
    }

    zip.writeZip(path.normalize(packageName))

    console.log("Cleaning Up")
    fs.unlinkSync(`./src/config.js`)
    fs.rmSync(`./base/${platform}`, { recursive : true})
}

const cleanInstallers  = () => {
    try {
      fs.rmSync('./Installers/', { recursive : true})
      fs.mkdirSync('./Installers/')
      } catch (err) {
        console.error(err);
      }
}

const executeBuilds= async () => {
    cleanInstallers()
    await build("Windows")
    await build("MacOS")
    await build("Linux")
    await build("Windows", { type: "Canary"} )
    await build("Windows", { type: "PTB"} )
    //await build("Windows", { type: "DEVELOP"} )
    
    fs.copyFileSync(`./configs/config.js`, './src/config.js')
}

executeBuilds();