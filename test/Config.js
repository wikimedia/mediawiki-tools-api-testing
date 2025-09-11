'use strict';

/* eslint security/detect-non-literal-fs-filename: 0 */

const fs = require('fs');
const os = require('os');

const fsp = fs.promises;

// install dummy config before initializing other modules
require('../lib/config').dummy();

const { assert, utils } = require('../index');

const testRootDir = `${ os.tmpdir() }/${ utils.uniq() }`;
const testConfigsDir = `${ testRootDir }/configs`;
const testConfigFiles = [
	[`${ testConfigsDir }/quibble.json`, `{ "base_uri": "file:${ testConfigsDir }/quibble.json" }`],
	[`${ testConfigsDir }/example.json`, `{ "base_uri": "file:${ testConfigsDir }/example.json" }`],
	[`${ testRootDir }/.api-testing.config.json`, `{ "base_uri": "file:${ testRootDir }/.api-testing.config.json" }`]
];

// Setup our test configs in the temp directory
const createTestConfigs = async () => {
	await fsp.mkdir(testRootDir);
	await fsp.mkdir(testConfigsDir);
	const fileWritePromises = testConfigFiles.map(
		(fileInfo) => fsp.writeFile(fileInfo[0], fileInfo[1])
	);
	await Promise.all(fileWritePromises);
};

// Setup our test configs in the temp directory
const deleteTestConfigs = async () => {
	// NOTE: rmdir does not support recursion in node 11 and earlier.
	const filesInConfigDir = await fsp.readdir(testConfigsDir, { withFileTypes: true });
	await Promise.all(filesInConfigDir.map((dirent) => fsp.unlink(`${ testConfigsDir }/${ dirent.name }`)));

	const filesInRootDir = await fsp.readdir(testRootDir, { withFileTypes: true });
	await Promise.all(filesInRootDir.map(
		(dirent) => dirent.isDirectory() ?
			fsp.rmdir(`${ testRootDir }/${ dirent.name }`) :
			fsp.unlink(`${ testRootDir }/${ dirent.name }`)
	));

	// await fsp.rmdir(testConfigsDir);
	await fsp.rmdir(testRootDir);
};

const getConfig = require('../lib/config');

describe('Configuration', () => {
	let envVar;

	before(async () => {
		// Save the env var for other tests
		envVar = process.env.API_TESTING_CONFIG_FILE;
		delete process.env.API_TESTING_CONFIG_FILE;
		await createTestConfigs();
	});

	after(async () => {
		await deleteTestConfigs();

		if (envVar) {
			process.env.API_TESTING_CONFIG_FILE = envVar;
		}
	});

	describe(`using ${ testRootDir } as the configuration root folder`, () => {
		it('Use .api-testing.config.json file if API_TESTING_CONFIG_FILE does not exist', () => {
			getConfig.reset();
			getConfig.setBaseDir(testRootDir);
			delete process.env.API_TESTING_CONFIG_FILE;

			assert.deepEqual(getConfig().base_uri, `file:${ testRootDir }/.api-testing.config.json`);
		});

		it('Select full path config set in API_TESTING_CONFIG_FILE env variable over local config', () => {
			getConfig.reset();
			getConfig.setBaseDir(testRootDir);
			process.env.API_TESTING_CONFIG_FILE = `${ testConfigsDir }/quibble.json`;

			assert.deepEqual(getConfig().base_uri, `file:${ testConfigsDir }/quibble.json`);
			delete process.env.API_TESTING_CONFIG_FILE;
		});

		it('Throw exception if config file set in API_TESTING_CONFIG_FILE does not exist', () => {
			getConfig.reset();
			getConfig.setBaseDir(testRootDir);
			process.env.API_TESTING_CONFIG_FILE = 'idonotexist.json';

			assert.throws(() => getConfig(), Error, /API_TESTING_CONFIG_FILE was set but neither/);
			delete process.env.API_TESTING_CONFIG_FILE;
		});

		it('Throws exception if ".api-testing.config.json" doesnt exist and API_TESTING_CONFIG_FILE is not set', () => {
			getConfig.reset();
			getConfig.setBaseDir(testRootDir + '_DOES_NOT_EXIST');
			delete process.env.API_TESTING_CONFIG_FILE;

			assert.throws(() => getConfig(), Error, /Missing local config/);
		});
	});

	describe('Using REST_BASE_URL for configuration', () => {
		it('should return a json when REST_BASE_URL is set', () => {
			getConfig.reset();
			process.env.REST_BASE_URL = 'http://localhost:8081/';

			assert.deepEqual(getConfig(), { base_uri: process.env.REST_BASE_URL });
			delete process.env.REST_BASE_URL;
		});
	});

	describe('Dynamic modification', () => {
		it('should apply after calling set()', () => {
			getConfig.dummy();
			const config = getConfig();

			getConfig.set('base_uri', 'just a test');

			// The const object should provide dynamic access to the underlying configuration
			assert.deepEqual(config.base_uri, 'just a test');
		});

		it('should apply after calling replace()', () => {
			getConfig.dummy();
			const config = getConfig();

			getConfig.replace({ base_uri: 'another test' });

			// The const object should provide dynamic access to the underlying configuration
			assert.deepEqual(config.base_uri, 'another test');
		});

		it('should apply after calling load()', () => {
			getConfig.dummy();
			const config = getConfig();

			getConfig.load(`${ testConfigsDir }/quibble.json`);

			// The const object should provide dynamic access to the underlying configuration
			assert.deepEqual(config.base_uri, `file:${ testConfigsDir }/quibble.json`);
		});
	});
});
