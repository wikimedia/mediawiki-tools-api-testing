'use strict';

/* eslint security/detect-non-literal-require: 0 */
/* eslint security/detect-non-literal-fs-filename: 0 */

/**
 * @file Provides access to test configuration.
 * @module config
 * @namespace api-testing
 */

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

// Proxy object that provides access to config values
// on the globalConfig, allowing the globalConfig to change dynamically.
class MagicConfig {
	data = null;

	baseDir = process.cwd();

	get factory() {
		return this.init().factory;
	}

	get base_uri() {
		return this.init().base_uri;
	}

	get main_page() {
		return this.init().main_page;
	}

	get root_user() {
		return this.init().root_user;
	}

	get secret_key() {
		return this.init().secret_key;
	}

	get extra_parameters() {
		return this.init().extra_parameters;
	}

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
	load(requireFile) {
		console.log(`Loading api-testing config from ${ requireFile }`);
		const cfg = require(requireFile);

		this.data = {
			...defaultConfig,
			...cfg
		};

		return this;
	}

	/**
	 * Initialize the config data.
	 * If a config data was already loaded or otherwise defined, this does nothing.
	 * If no config is known so far, this function detects the location of the config file
	 * and loads it. The location can be set using the API_TESTING_CONFIG_FILE environment
	 * variable. Otherwise, the config will is expected to be placed in the base directory.
	 *
	 * @return {Object} the config proxy object
	 *
	 * @namespace api-testing
	 */
	init() {
		if (this.data) {
			return this.data;
		}

		const fs = require('fs');

		const configsDir = `${ this.baseDir }/configs`;
		const configFileEnv = process.env.API_TESTING_CONFIG_FILE;
		const baseURLEnv = process.env.REST_BASE_URL;

		let requireFile = configFileEnv;

		if (baseURLEnv) {
			// XXX: shouldn't this include defaultConfig?
			this.data = {
				base_uri: baseURLEnv
			};
			return this.data;
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
			requireFile = `${ this.baseDir }/${ localConfigFile }`;
			if (!fs.existsSync(requireFile)) {
				throw new Error(`Missing local config! Please create a ${ localConfigFile } config`);
			}
		}

		return this.load(requireFile);
	}

	/**
	 * Replace the configuration.
	 * The new configuration will be reflected by the proxy object returned by the main function.
	 * The configuration will be copied, so changes made to cfg later will not have an effect.
	 *
	 * @param {Object} cfg
	 *
	 * @namespace api-testing
	 */
	replace(cfg) {
		this.data = {
			...defaultConfig,
			...cfg
		};
	}

	/**
	 * Sets a configuration value.
	 * The new configuration will be reflected by the proxy object returned by the main function.
	 *
	 * @param {string} key
	 * @param {any} value
	 *
	 * @namespace api-testing
	 */
	set(key, value) {
		if (this.data === null) {
			this.dummy();
		}
		this.data[key] = value;
	}

	/**
	 * Resets the configuration (for testing).
	 * This allows to main function to detect the config file again, instead of just returning
	 * whatever config was already defined.
	 *
	 * @namespace api-testing
	 */
	reset() {
		this.data = null;
	}

	/**
	 * Sets the base directory for locating the config file (for testing).
	 * Should be used together with reset() when testing the behavior of the main function.
	 *
	 * @param {string} dir
	 *
	 * @namespace api-testing
	 */
	setBaseDir(dir) {
		this.baseDir = dir;
	}

	/**
	 * Initializes the config to dummy values, for testing.
	 * The dummy values will not be functional and need to be replaced before use.
	 *
	 * @namespace api-testing
	 */
	dummy() {
		this.replace({});
	}

}

const magicConfig = new MagicConfig();
module.exports = magicConfig;
