'use strict';

/**
 * @file Validates REST API responses against a module's OpenAPI spec, resolving
 * external JSON Schema references from local copies.
 * @module openApi
 * @namespace api-testing
 */

const fs = require('fs');
const path = require('path');
const chai = require('chai');
const $RefParser = require('@apidevtools/json-schema-ref-parser');
const chaiResponseValidator = require('chai-openapi-response-validator').default;
const REST = require('./REST');
const utils = require('./utils');

const OPENAPI_30_UNSUPPORTED = [ '$schema', '$id', 'examples' ];

/**
 * Fetches the OpenAPI spec of a REST module, bundles the external JSON Schemas it
 * references from local copies (never over the network), and registers
 * chai-openapi-response-validator for it, enabling `expect(res).to.satisfyApiSpec`
 * and `expect(body).to.satisfySchemaInApiSpec(name)`.
 *
 * The JSON Schema 2020-12 keywords that OpenAPI 3.0 doesn't allow ($schema, $id,
 * examples) are dropped from the local copies, wherever they appear.
 *
 * @param {string} module Module name as in /specs/v0/module/{module}, e.g. '-' or 'content/v2-beta'
 * @param {Object} [options]
 * @param {Object<string,string>} [options.localRefs] URL prefix => local directory
 * @return {Promise<Object>} The bundled spec
 *
 * @namespace api-testing
 */
async function useModuleSpec(module, { localRefs = {} } = {}) {
	const specPath = utils.normalizePath('/specs/v0/module', module);
	const { status, text } = await new REST('rest.php').get(specPath);
	if (status !== 200) {
		throw new Error(`Failed to fetch the OpenAPI spec at ${ specPath }: HTTP ${ status }`);
	}

	const prefixOf = (url) => Object.keys(localRefs).find((prefix) => url.startsWith(prefix));
	const spec = await $RefParser.bundle(JSON.parse(text), { resolve: {
		file: false,
		http: false,
		localRefs: {
			canRead: (file) => prefixOf(file.url) !== undefined,
			read: (file) => {
				const prefix = prefixOf(file.url);
				const localFile = path.join(localRefs[prefix], file.url.slice(prefix.length));
				try {
					return JSON.parse(
						// eslint-disable-next-line security/detect-non-literal-fs-filename
						fs.readFileSync(localFile, 'utf8'),
						(key, value) => (OPENAPI_30_UNSUPPORTED.includes(key) ? undefined : value)
					);
				} catch (e) {
					// json-schema-ref-parser replaces the message of any other error type
					throw new $RefParser.ResolverError(
						new Error(`Cannot load the local copy of ${ file.url } (${ localFile }): ${ e.message }`),
						file.url
					);
				}
			}
		}
	} });

	chai.use(chaiResponseValidator(spec));
	return spec;
}

module.exports = { useModuleSpec };
