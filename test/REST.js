'use strict';

const { assert } = require('chai');
const { REST } = require('../index');
const fake = require('./fake.js');
let fakeApp;

const restPath = '/rest.php';
const echoEndpointPath = 'v1/my/endpoint';

function installFakeApp() {
	fakeApp = fake.install();
	const mock = fakeApp.newMock();

	mock.path[`${ restPath }/${ echoEndpointPath }`] = function (req) {
		return {
			query: req.query,
			method: req.method,
			path: req.path,
			headers: req.headers,
			body: req.body,
			text: req.text
		};
	};
}

describe('The REST API', () => {
	before(async () => {
		installFakeApp();
	});

	describe('methods', () => {
		const methods = {
			get: 'GET',
			post: 'POST',
			put: 'PUT',
			del: 'DELETE'
		};

		const headers = { 'Foo-Header': 'Baz' };

		// eslint-disable-next-line mocha/no-setup-in-describe
		for (const [fn, mth] of Object.entries(methods)) {
			it(`should support ${ fn }() function for ${ mth } method`, async () => {
				const rest = new REST(restPath);

				assert.property(rest, fn, 'function exists');

				const { status, body, text } = await rest[fn](echoEndpointPath, {}, headers);

				assert.equal(status, 200, text);
				assert.equal(body.method, mth, 'method');
				assert.equal(body.path.endsWith(echoEndpointPath), true, `path ends with ${ echoEndpointPath }`);

				// headers get converted to lower case, and additional headers may be present.
				for (const h in headers) {
					const v = headers[h];
					const hNorm = h.toLowerCase();
					assert.equal(body.headers[hNorm], v, 'headers');
				}
			});
		}
	});

	describe('path normalization', () => {
		const cases = [
			// no leading slash in the path
			[ '/rest.php', 'v1/my/endpoint' ],
			[ '/rest.php/', 'v1/my/endpoint' ],
			[ 'rest.php/', 'v1/my/endpoint' ],

			// with leading slash in the path
			[ '/rest.php', '/v1/my/endpoint' ],
			[ '/rest.php/', '/v1/my/endpoint' ],
			[ 'rest.php/', '/v1/my/endpoint' ],

			// empty paths
			[ '/rest.php/v1/my/endpoint', '' ],
			[ '', '/rest.php/v1/my/endpoint' ]
		];

		const fullPath = `${ restPath }/${ echoEndpointPath }`;

		for (const [base, path] of cases) {
			it(`should correctly combine "${ base }" with "${ path }"`, async () => {
				const rest = new REST(base);
				const { status, body, text } = await rest.get(path);
				assert.equal(status, 200, text);
				assert.equal(body.path, fullPath);
			});
		}
	});
});
