'use strict';

/**
 * @file Provides utilities for API testing.
 * @module utils
 * @namespace api-testing
 */

module.exports = {
	/**
	 * Returns a unique string of random alphanumeric characters.
	 *
	 * @param {number} n the desired number of characters
	 * @return {string}
	 */
	uniq(n = 10) {
		const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let result = '';

		for (let i = 0; i < n; i++) {
			result += characters.charAt(Math.floor(Math.random() * characters.length));
		}
		return result;
	},

	/**
	 * Returns a unique title for use in tests.
	 *
	 * @param {string} prefix
	 * @return {string}
	 */
	title(prefix = '') {
		return prefix + this.uniq();
	},

	/**
	 * Returns a promise that will resolve in no less than the given number of milliseconds.
	 *
	 * @param {number} ms wait time in milliseconds
	 * @return {Promise}
	 */
	sleep(ms = 1000) {
		// eslint-disable-next-line no-promise-executor-return
		return new Promise((resolve) => setTimeout(resolve, ms));
	},

	/**
	 * Converts a title string to DB key form by replacing any spaces with underscores.
	 *
	 * @param {string} title
	 * @return {string}
	 */
	dbkey(title) {
		return title.replace(/ /g, '_');
	},

	/**
	 * Adds a leading slash to the path, if not present.
	 *
	 * @param {string} path
	 * @return {string}
	 */
	addLeadingSlash(path) {
		if (path === '') {
			return '/';
		}

		if (path[0] !== '/') {
			return '/' + path;
		} else {
			return path;
		}
	},

	/**
	 * Trims a trailing slash from the path, if present.
	 *
	 * @param {string} path
	 * @return {string}
	 */
	trimTrailingSlash(path) {
		if (path === '') {
			return '';
		}

		if (path[path.length - 1] === '/') {
			return path.slice(0, Math.max(0, path.length - 1));
		} else {
			return path;
		}
	},

	/**
	 * Normalizes a URL path.
	 * Adds a leading slash to the path, if not present.
	 * Trims a trailing slash from the path, if present.
	 *
	 * If a suffix is given, append it to the apth with a single slash as a separator.
	 * A trailing slash on the suffix will be retained.
	 *
	 * @param {string} path
	 * @param {string} suffix (optional)
	 * @return {string}
	 */
	normalizePath(path, suffix = null) {
		if (path === '') {
			return '/';
		}

		path = this.addLeadingSlash(path);
		path = this.trimTrailingSlash(path);

		if (suffix !== null) {
			path = path + this.addLeadingSlash(suffix);
		}

		return path;
	}

};
