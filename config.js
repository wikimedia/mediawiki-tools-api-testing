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
        // If config.local.json doesnt exist in root folder, throw helpful error
        const localConfigFile = 'config.local.json';
        requireFile = `${baseDir}/${localConfigFile}`;
        if (!fs.existsSync(requireFile)) {
            throw Error(`Missing local config! Please create a ${localConfigFile} config using ${configsDir}/example.json as an example`);
        }
    }

    return requireFile;
};
