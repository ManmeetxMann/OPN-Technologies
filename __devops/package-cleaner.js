const fs = require('fs');
const path = require('path');

const localPath = (packagePath) => {
    return `../packages/${packagePath}/package.json`
}

// Make sure that we have two arguments that we can get
if (process.argv.length <= 3) {
    throw new Error('Missing npm scripts key/name argument(s)');
}

// Grab the two arguments
const packagePath = process.argv[2];
const scriptsToKeep = process.argv[3].split(',');

// Grab the package we are focusing on
const ORIG_PKG_PATH = path.resolve(__dirname, localPath(`${packagePath}`));
const DIST_PKG_PATH = path.resolve(__dirname, localPath(`${packagePath}/dist`));
const pkgData = require(ORIG_PKG_PATH);

// Grab the common package
const COMMON_PKG_PATH = path.resolve(__dirname, localPath("common"));
const commonData = require(COMMON_PKG_PATH);

// Remove the specified named scripts from the scripts section.
Object.keys(pkgData.scripts).forEach(function (scriptName) {
    if (!scriptsToKeep.includes(scriptName))
    {
        delete pkgData.scripts[scriptName];
    }
});

// Remove dev depenedecies completely
delete pkgData.devDependencies;

// Add in dependecies from common package
const currentDependecies = Object.keys(pkgData.dependencies);
Object.keys(commonData.dependencies).forEach(function (dependecy) {
    if (!currentDependecies.includes(dependecy)) {
        pkgData.dependencies[dependecy] = commonData.dependencies[dependecy];
    }
});

// Overwrite original `package.json` with new data (i.e. minus the specific data).
fs.writeFile(DIST_PKG_PATH, JSON.stringify(pkgData, null, 2), function (err) {
  if (err) throw err;
});