const { assert } = require('chai');
const fs = require('fs');

const testRootDir = `${__dirname}/configuration`;
const testConfigDir = `${testRootDir}/configs`;

const renameFile =  (folder, from, to) => fs.existsSync(`${folder}/${from}`) ? fs.renameSync(`${folder}/${from}`, `${folder}/${to}`) : null;

describe('Configuration', () => {
    let envVar;
    const getConfig = require('../config');

    before(() => {
        // Save the env var for other tests
        envVar = process.env.API_TESTING_CONFIG_FILE;
        delete process.env.API_TESTING_CONFIG_FILE;
    });

    after(() => {
        if (envVar) {
            process.env.API_TESTING_CONFIG_FILE = envVar;
        }
    });

    describe(`Using ${testRootDir} as the configuration root folder`, () => {
        it('Select full path config set in API_TESTING_CONFIG_FILE env variable over local and default config', () => {
            process.env.API_TESTING_CONFIG_FILE = `${testRootDir}/quibble.json`;
            assert.equal(getConfig(testRootDir), `${testRootDir}/quibble.json`);
            delete process.env.API_TESTING_CONFIG_FILE;
        });

        it('Select filename only config file set in API_TESTING_CONFIG_FILE env variable over local and default config', () => {
            process.env.API_TESTING_CONFIG_FILE = 'quibble.json';
            assert.equal(getConfig(testRootDir), `${testConfigDir}/quibble.json`);
            delete process.env.API_TESTING_CONFIG_FILE;
        });

        it('Throw exception if config file set in API_TESTING_CONFIG_FILE does not exist', () => {
            process.env.API_TESTING_CONFIG_FILE = 'idonotexist.json';
            assert.throws(() => getConfig(testRootDir), Error, /API_TESTING_CONFIG_FILE was set but neither/);

            delete process.env.API_TESTING_CONFIG_FILE;
        });

        it('Select local.json in root folder over default.json', () => {
            assert.equal(getConfig(testRootDir), `${testRootDir}/local.json`);
        });

        describe('Renaming test root folder "local.json" to ensure "configs/local.json" is chosen', () => {
            before(() => renameFile(testRootDir, 'local.json', 'local.orig.json'));
            after(() => renameFile(testRootDir, 'local.orig.json', 'local.json'));

            it('Select local.json in configs folder over default.json', () => {
                assert.equal(getConfig(testRootDir), `${testConfigDir}/local.json`);
            });
        });

        describe('Renaming local.json files to ensure default.json is chosen', () => {
            before(() => [testRootDir, testConfigDir].forEach((folder) => renameFile(folder, 'local.json', 'local.orig.json')));
            after(() => [testRootDir, testConfigDir].forEach((folder) => renameFile(folder, 'local.orig.json', 'local.json')));

            it('Select "default.json" if neither local.json is present and API_TESTING_CONFIG_FILE is not set', () => {
                assert.equal(getConfig(testRootDir), `${testConfigDir}/default.json`);
            });
        });
    });
});
