'use strict';

/* eslint security/detect-non-literal-require: 0 */
/* eslint security/detect-non-literal-fs-filename: 0 */

/**
 * @file Provides access to test configuration.
 * @module config
 * @namespace api-testing
 */

let globalConfig = null;

const defaultConfig = {
	factory: null,
	base_uri: 'https://base_uri_not_set/',
	main_page: 'NOT SET',
	root_user: {
		name: 'NOT SET',
		password: 'NOT SET'
	},
	secret_key: 'NOT SET',
	extra_parameters: {}
};

// Cerate a proxy object that provides access to config values
// on the globalConfig, allowing the globalConfig to change dynamically.
const magicConfig = {
	_this_is_magic_: true,
	get factory() {
		return globalConfig.factory;
	},
	get base_uri() {
		return globalConfig.base_uri;
	},
	get main_page() {
		return globalConfig.main_page;
	},
	get root_user() {
		return globalConfig.root_user;
	},
	get secret_key() {
		return globalConfig.secret_key;
	},
	get extra_parameters() {
		return globalConfig.extra_parameters;
	}
};

/**
 * Load the config from the given file.
 * Returns a config proxy object that, for now, reflects the content of the file.
 * However, the state of that object will change when the configuration
 * is changed by calling load() again, or by calling set() or fake(), etc.
 * The object return by the main function is the same proxy object returned by this function.
 *
 * @param {string} requireFile
 * @return {Object} the config proxy object
 *
 * @namespace api-testing
 */
const load = function (requireFile) {
	console.log(`Loading api-testing config from ${ requireFile }`);
	const cfg = require(requireFile);

	globalConfig = {
		...defaultConfig,
		...cfg
	};

	return magicConfig;
};

let baseDir = process.cwd();

/**
 * The main method to get access to a config object, exported as the module.
 * If a config was already loaded or otherwise defined, that config will be returned.
 * If no config is known so far, this function detects the location of the config file
 * and loads it. The location can be set using the API_TESTING_CONFIG_FILE environment
 * variable. Otherwise, the config will is expected to be placed in the base directory.
 *
 * @return {Object} the config proxy object
 *
 * @namespace api-testing
 */
const main = function () {
	if (globalConfig) {
		return magicConfig;
	}

	const fs = require('fs');

	const configsDir = `${ baseDir }/configs`;
	const configFileEnv = process.env.API_TESTING_CONFIG_FILE;
	const baseURLEnv = process.env.REST_BASE_URL;

	let requireFile = configFileEnv;

	if (baseURLEnv) {
		return {
			base_uri: baseURLEnv
		};
	} else if (requireFile) {
		if (!fs.existsSync(requireFile)) {
			// was it just the filename without the default config dir?
			requireFile = `${ configsDir }/${ configFileEnv }`;
			if (!fs.existsSync(requireFile)) {
				throw new Error(`API_TESTING_CONFIG_FILE was set but neither '${ configFileEnv }' nor '${ requireFile }' exist.`);
			}
		}
	} else {
		// If .api-testing.config.json doesn't exist in root folder, throw helpful error
		const localConfigFile = '.api-testing.config.json';
		requireFile = `${ baseDir }/${ localConfigFile }`;
		if (!fs.existsSync(requireFile)) {
			throw new Error(`Missing local config! Please create a ${ localConfigFile } config`);
		}
	}

	return load(requireFile);
};

// We expose the load function as the module's sole export, but we set further functions
// as fields on that function object, to provide additional functionality. This is a bit
// of a hack, but preserves backwards compatibility.

// make the load function available directly.
main.load = load;

/**
 * Replace the configuration.
 * The new configuration will be reflected by the proxy object returned by the main function.
 * The configuration will be copied, so changes made to cfg later will not have an effect.
 *
 * @param {Object} cfg
 *
 * @namespace api-testing
 */
main.replace = function (cfg) {
	globalConfig = {
		...defaultConfig,
		...cfg
	};
};

/**
 * Sets a configuration value.
 * The new configuration will be reflected by the proxy object returned by the main function.
 *
 * @param {string} key
 * @param {any} value
 *
 * @namespace api-testing
 */
main.set = function (key, value) {
	globalConfig[key] = value;
};

/**
 * Resets the configuration (for testing).
 * This allows to main function to detect the config file again, instead of just returning
 * whatever config was already defined.
 *
 * @namespace api-testing
 */
main.reset = function () {
	globalConfig = null;
};

/**
 * Sets the base directory for locating the config file (for testing).
 * Should be used together with reset() when testing the behavior of the main function.
 *
 * @param {string} dir
 *
 * @namespace api-testing
 */
main.setBaseDir = function (dir) {
	baseDir = dir;
};

/**
 * Initializes the config to dummy values, for testing.
 * The dummy values will not be functional and need to be replaced before use.
 *
 * @namespace api-testing
 */
main.dummy = function () {
	this.replace({});
};

module.exports = main;
