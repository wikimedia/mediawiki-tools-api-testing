const { assert } = require('chai');
const fs = require('fs');
const os = require('os');
const fsp = fs.promises;

const testRootDir = os.tmpdir();
const testConfigsDir = `${testRootDir}/configs`;

// Setup our test configs in the temp directory
const createTestConfigs = async () => {
    try {
        await fsp.rmdir(testConfigsDir, { recursive: true }); // cleanup
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
    const files = [`${testConfigsDir}/quibble.json`, `${testConfigsDir}/example.json`, `${testRootDir}/config.local.json`];
    await fsp.mkdir(testConfigsDir);
    const fileWritePromises = files.map((file) => fsp.writeFile(file, '{}'));
    await Promise.all(fileWritePromises);
};

describe('Configuration', () => {
    let envVar;
    const getConfig = require('../config');

    before(async () => {
        // Save the env var for other tests
        envVar = process.env.API_TESTING_CONFIG_FILE;
        delete process.env.API_TESTING_CONFIG_FILE;
        await createTestConfigs();
    });

    after(() => {
        if (envVar) {
            process.env.API_TESTING_CONFIG_FILE = envVar;
        }
    });

    describe(`Using ${testRootDir} as the configuration root folder`, () => {
        it('Use config.local.json file if API_TESTING_CONFIG_FILE does not exist', () => {
            delete process.env.API_TESTING_CONFIG_FILE;
            assert.equal(getConfig(testRootDir), `${testRootDir}/config.local.json`);
        });

        it('Select full path config set in API_TESTING_CONFIG_FILE env variable over local config', () => {
            process.env.API_TESTING_CONFIG_FILE = `${testConfigsDir}/quibble.json`;
            assert.equal(getConfig(testRootDir), `${testConfigsDir}/quibble.json`);
            delete process.env.API_TESTING_CONFIG_FILE;
        });

        it('Throw exception if config file set in API_TESTING_CONFIG_FILE does not exist', () => {
            process.env.API_TESTING_CONFIG_FILE = 'idonotexist.json';
            assert.throws(() => getConfig(testRootDir), Error, /API_TESTING_CONFIG_FILE was set but neither/);
            delete process.env.API_TESTING_CONFIG_FILE;
        });

        describe('Renaming required root folder config "config.local.json"', () => {
            it('Throws exception if "config.local.json" doesnt exist and API_TESTING_CONFIG_FILE is not set', () => {
                delete process.env.API_TESTING_CONFIG_FILE;
                fs.rename(`${testRootDir}/config.local.json`, `${testRootDir}/wrong.json`, (err) => {
                    assert.throws(() => getConfig(testRootDir), Error, /Missing local config!/);
                });
            });
        });
    });
});
