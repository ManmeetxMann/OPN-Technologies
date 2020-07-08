const fs = require('fs');
const path = require('path');

if (process.argv.length <= 3) 
{
    throw new Error('Missing npm scripts key/name argument(s)');
}

// Get list of arguments passed to script.
const packagePath = process.argv[2];
const scriptsToKeep = process.argv[3].split(',');
// const devDepsToKeep = process.argv[4] ? process.argv[3].split(',') : [];


// Define absolute paths for original pkg and temporary pkg.
const ORIG_PKG_PATH = path.resolve(__dirname, `../packages/${packagePath}/package.json`);
const NEW_PKG_PATH = path.resolve(__dirname, `../packages/${packagePath}/dist/package.json`);

// Obtain original `package.json` contents.
const pkgData = require(ORIG_PKG_PATH);

// Remove the specified named scripts from the scripts section.
Object.keys(pkgData.scripts).forEach(function (scriptName) {
    if (!scriptsToKeep.includes(scriptName))
    {
        delete pkgData.scripts[scriptName];
    }
});

// Remove holistically
delete pkgData.devDependencies;

// Overwrite original `package.json` with new data (i.e. minus the specific data).
fs.writeFile(NEW_PKG_PATH, JSON.stringify(pkgData, null, 2), function (err) {
  if (err) throw err;
});