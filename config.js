'use strict';

module.exports = (baseDir = __dirname) => {
    const fs = require('fs');

    const configsDir = `${baseDir}/configs`;
    const configFileEnv = process.env.API_TESTING_CONFIG_FILE;

    let requireFile = configFileEnv;

    if (requireFile) {
        if (!fs.existsSync(requireFile)) {
            // was it just the filename without the default config dir?
            requireFile = `${configsDir}/${configFileEnv}`;
            if (!fs.existsSync(requireFile)) {
                throw Error(`API_TESTING_CONFIG_FILE was set but neither '${configFileEnv}' nor '${requireFile}' exist.`);
            }
        }
    } else {
        // Check the root folder first then configs dir.
        requireFile = `${baseDir}/local.json`;
        if (!fs.existsSync(requireFile)) {
            requireFile = fs.existsSync(`${configsDir}/local.json`) ? `${configsDir}/local.json` : `${configsDir}/default.json`;
        }
    }

    return requireFile;
};
