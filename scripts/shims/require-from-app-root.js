// Build-time shim for `require-from-app-root`.
//
// touchportal-api calls requireFromAppRoot('package.json').version to report the
// plugin version to Touch Portal. That walks the filesystem for a package.json,
// which does not exist next to a single-executable build, so the real module
// throws at startup. The bundler injects the version instead.
"use strict";

const appRoot = { version: process.env.__TPDISCORD_VERSION__ };

module.exports = {
  requireFromAppRoot: (request) => {
    if (request === "package.json" || request === "./package.json") {
      return appRoot;
    }
    throw new Error(`require-from-app-root shim: unsupported request "${request}"`);
  },
};
