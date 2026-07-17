'use strict';

const { assert } = require('chai');
const { openApiLinter } = require('../index');

describe('The OpenAPI linter', () => {
	it('lints the REST API OAD without ever throwing', async () => {
		const output = await openApiLinter.lint();

		assert.isString(output);
		assert.isNotEmpty(output);
	});
});
