'use strict';

/**
 * @file Defines a fake wikiApp and provides a mocking facility for testing the api-testing
 * framework without the need for an actual MediaWiki instance.
 * Exports a Node Express app that can act as a fake MediaWiki, handling requests to api.php,
 * rest.php, and index.php. In addition, it provided a newMock() method that returns a newMock
 * object that can be used to register callback function.
 *
 * @module fake
 * @namespace testing-api-testing
 */

const supertest = require('supertest');
const express = require('express');
const wikiApp = express();
const config = require('../lib/config');

// Add support for urlencoded POST bodies
wikiApp.use(express.urlencoded({ extended: true }));

/**
 * Mock handler for the "test" action.
 *
 * @param {Request} req
 * @return {Object}
 */
function testAction(req) {
	return {
		test: {
			result: 'Success'
		}
	};
}

/**
 * Mock handler for the "edit" action.
 *
 * @param {Request} req
 * @return {Object}
 */
function editAction(req) {
	return {
		edit: {
			result: 'Success'
		}
	};
}

/**
 * Mock handler for the "tokens" query.
 *
 * @param {Request} req
 * @return {Object}
 */
function tokensQuery(req) {
	const types = req.params.type.split('|');

	const data = {
		tokens: {}
	};

	types.forEach((t) => {
		data.tokens[t + 'token'] = '!token!';
	});

	return data;
}

/**
 * Mock handler for the "query" query.
 * Will delegate to the appropriate query newMock (list or meta).
 *
 * @param {Request} req
 * @return {object|string}
 */
function queryAction(req) {
	let queryName;
	let queryType;

	if (req.params.list) {
		queryName = req.params.list;
		queryType = 'list';
	} else if (req.params.meta) {
		queryName = req.params.meta;
		queryType = 'meta';
	} else {
		return {
			error: {
				code: 'bad_requests',
				info: `can't determin query type for "${ req.query }"`
			}
		};
	}

	if (wikiApp._currentMock.query[queryType][queryName]) {
		const fn = wikiApp._currentMock.query[queryType][queryName];
		return {
			query: fn(req),
			batchComplete: ''
		};
	} else {
		return {
			error: {
				code: 'missing_mock',
				info: `no ${ queryType } query function for "${ queryName }"`
			}
		};
	}
}

/**
 * Mock endpoint for the "test" path.
 *
 * @param {Request} req
 * @return {Object}
 */
function testEndpoint(req) {
	return {
		test: {
			result: 'ok'
		}
	};
}

/**
 * Mock handler for the "login" action.
 *
 * @param {Request} req
 * @return {Object}
 */
function loginAction(req) {
	return {
		login: {
			result: 'Success',
			lgusername: req.params.lgname,
			lguserid: 123
		}
	};
}

/**
 * Mock handler for the "createaccount" action.
 *
 * @param {Request} req
 * @return {Object}
 */
function createAccountAction(req) {
	return {
		createaccount: {
			status: 'PASS',
			username: req.params.username
		}
	};
}

/**
 * Mock handler for the "Special:Runjobs" page.
 *
 * @param {Request} req
 * @return {Object}
 */
function specialRunJobsPage(req) {
	return {
		reached: 'none-ready',
		jobs: [ 123 ]
	};
}

/**
 * The newMock() function installs a newMock object and returns it.
 * Mock handlers for actions, rest endpoints, etc can be defined by registering callback
 * functions in the newMock object. It has the following structure:
 *
 * @return {Object}
 * @example
 * {
 *    action: { .... },
 *    query: {
 *      list: { ... },
 *      meta: { ... },
 *    },
 *    path: { .... },
 *    page: { .... },
 * }
 * @example
 * const newMock = fake.newMock();
 * newMock.action.foo = function(req) {
 *   return { fook: { result: "Success" } };
 * }
 */
wikiApp.newMock = function () {
	// set the default mocks
	wikiApp._currentMock = {
		action: {
			test: testAction,
			query: queryAction,
			login: loginAction,
			createaccount: createAccountAction,
			edit: editAction
		},
		path: {
			test: testEndpoint
		},
		query: {
			list: {},
			meta: {
				tokens: tokensQuery
			}
		},
		page: {
			'Special:RunJobs': specialRunJobsPage
		}
	};

	// return the newMock object, so it can be modified.
	return wikiApp._currentMock;
};

// initialize default mocks
wikiApp.newMock();

/**
 * Express handler for api.php
 *
 * @param {Request} req
 * @param {Response} res
 */
function action(req, res) {
	if (req.body) {
		req.params = req.body;
	} else {
		req.params = req.query;
	}

	const actionName = req.params.action;
	let data;

	if (wikiApp._currentMock.action[actionName]) {
		const fn = wikiApp._currentMock.action[actionName];

		try {
			data = fn(req);
		} catch (e) {
			res.status(500);

			if (typeof e === 'string') {
				data = e;
			} else {
				data = e.message;
			}
		}
	} else {
		data = {
			error: {
				code: 'missing_mock',
				info: `no action function for "${ actionName }"`
			}
		};
	}

	if (typeof data === 'string') {
		res.send(data);
	} else {
		res.json(data);
	}
	res.end();
}

/**
 * Express handler for rest.php
 *
 * @param {Request} req
 * @param {Response} res
 */
function rest(req, res) {
	const routeName = req.baseUrl;
	let data;

	if (wikiApp._currentMock.path[routeName]) {
		// FIXME: try this out!
		const fn = wikiApp._currentMock.path[routeName];
		try {
			data = fn(req);
		} catch (e) {
			res.status(500);

			if (typeof e === 'string') {
				data = e;
			} else {
				data = e.message;
			}
		}

		if (typeof data === 'string') {
			res.send(data);
		} else {
			res.json(data);
		}
	} else {
		res.status(500);
		res.render('error', { error: `no route handler function for "${ routeName }"` });
	}

	res.end();
}

/**
 * Express handler for index.php
 *
 * @param {Request} req
 * @param {Response} res
 */
function page(req, res) {
	if (req.body) {
		req.params = req.body;
	} else {
		req.params = req.query;
	}

	const pageTitle = req.params.title;
	let data;

	if (wikiApp._currentMock.page[pageTitle]) {
		const fn = wikiApp._currentMock.page[pageTitle];
		try {
			data = fn(req);
		} catch (e) {
			res.status(500);

			if (typeof e === 'string') {
				data = e;
			} else {
				data = e.message;
			}
		}
	} else {
		data = `no page function for "${ pageTitle }"`;
	}

	if (typeof data === 'string') {
		res.send(data);
	} else {
		res.json(data);
	}
	res.end();
}

wikiApp.all('/api.php', action);
wikiApp.all('/rest.php', rest);
wikiApp.all('/index.php', page);

/**
 * Installs the fake wiki into the global configuration, so that the client libraries
 * use it instead of a connection to a real wiki.
 *
 * @return {Object} this
 *
 * A typical use of the fake module is:
 * @example
 * const fake = require('./fake.js').install();
 * const newMock = fake.newMock();
 *
 * This installs the fake wiki for testing and returns it, so a newMock object can be
 * initialized on it.
 *
 * If only a single newMock object is needed, this can be shortened:
 * @example
 * const newMock = require('./fake.js').install().newMock();
 */
wikiApp.install = function () {
	config.dummy();
	config.set('factory', () => supertest.agent(wikiApp));

	return wikiApp;
};

// Export the fake express app, with extra methods install() and newMock()
module.exports = wikiApp;
