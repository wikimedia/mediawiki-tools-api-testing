'use strict';

const path = require('path');
const chai = require('chai');
const { assert } = chai;
const { openApi } = require('../index');
const fake = require('./fake.js');

const BASE = 'https://schema.example.org/api/';
const localRefs = { [BASE]: path.join(__dirname, 'fixtures', 'openapi') };

function serveSpec(errorRef) {
	fake.install().newMock().path['/rest.php/specs/v0/module/-'] = () => ({
		openapi: '3.0.0',
		info: { title: 'Test module', version: '1.0' },
		paths: {},
		components: { schemas: { Error: { $ref: errorRef } } }
	});
}

async function rejectionMessage(promise) {
	try {
		await promise;
	} catch (e) {
		return e.message;
	}
	assert.fail('expected a rejection');
}

describe('openApi.useModuleSpec', () => {
	it('resolves external refs from local copies, without JSON Schema 2020-12 keywords', async () => {
		serveSpec(BASE + 'fragments/error.json');
		const spec = await openApi.useModuleSpec('/-', { localRefs });
		const error = spec.components.schemas.Error;

		assert.strictEqual(error.title, 'Test error schema');
		assert.notProperty(error, '$schema');
		assert.notProperty(error, '$id');
		assert.notProperty(error.properties.httpCode, 'examples');
	});

	it('registers the chai assertions for the spec', async () => {
		serveSpec(BASE + 'fragments/error.json');
		await openApi.useModuleSpec('-', { localRefs });

		chai.expect({ httpCode: 404, extra: true }).to.satisfySchemaInApiSpec('Error');
		assert.throws(() => chai.expect({ httpCode: '404' }).to.satisfySchemaInApiSpec('Error'), /httpCode must be integer/);
	});

	it('rejects an external ref without a local mapping, without using the network', async () => {
		serveSpec('https://elsewhere.example.org/error.json');

		assert.include(await rejectionMessage(openApi.useModuleSpec('-', { localRefs })), 'https://elsewhere.example.org/error.json');
	});

	it('rejects a mapped ref without a local copy', async () => {
		serveSpec(BASE + 'fragments/missing.json');
		const message = await rejectionMessage(openApi.useModuleSpec('-', { localRefs }));

		assert.include(message, BASE + 'fragments/missing.json');
		assert.include(message, path.join('fixtures', 'openapi', 'fragments', 'missing.json'));
	});

	it('rejects when the spec cannot be fetched', async () => {
		fake.install().newMock(); // no handler: the fake wiki answers 500
		const message = await rejectionMessage(openApi.useModuleSpec('nope', { localRefs }));

		assert.include(message, '/specs/v0/module/nope');
		assert.include(message, '500');
	});
});
