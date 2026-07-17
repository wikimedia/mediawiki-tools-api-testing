'use strict';

/**
 * @file Lints the MediaWiki REST API's OpenAPI Description using Spectral
 * and the Wikimedia ruleset.
 * @module openApiLinter
 * @namespace api-testing
 */

const fs = require('fs');
const path = require('path');
const superagent = require('superagent');
const yaml = require('js-yaml');
const { Spectral, Ruleset, Document } = require('@stoplight/spectral-core');
const { Yaml } = require('@stoplight/spectral-parsers');
const { text: formatText } = require('@stoplight/spectral-formatters');
const wikimediaRuleset = require('@wikimedia/wikimedia-spectral-ruleset');
const config = require('./config');
const utils = require('./utils');

const RULESET_PATH = path.join(__dirname, '..', '.spectral.yaml');

// Built once at load time, from .spectral.yaml's severity overrides. The
// YAML file's "extends" entry is ignored: Ruleset requires an
// already-loaded ruleset object, not a package name string, so the
// Wikimedia ruleset is required directly instead.
const { rules } = yaml.load(fs.readFileSync(RULESET_PATH, 'utf8'));
const ruleset = new Ruleset({
	extends: [ wikimediaRuleset ],
	rules
}, { severity: 'recommended' });

/**
 * Describes an error as a non-empty string.
 * AggregateError has an empty top-level message
 *
 * @param {Error} err
 * @return {string}
 *
 * @namespace api-testing
 */
function describeError(err) {
	if (Array.isArray(err.errors) && err.errors.length > 0) {
		return err.errors.map((e) => e.message).join('; ');
	}

	return err.message || String(err);
}

/**
 * Lints an OpenAPI Description (OAD), fetched from the given URL, using
 * Spectral and the Wikimedia ruleset. Defaults to the unprefixed module
 * ("routes not in modules") of the configured wiki, but any module's spec
 * URL can be passed instead - e.g. one discovered via the wiki's
 * /rest.php/specs/v0/discovery endpoint - to lint that module instead.
 *
 * This never throws: it is meant to run as a report-only CI check (T422920).
 * Rule severities are left as defined by the ruleset (this function does
 * not downgrade them), since nothing here ever fails based on a finding's
 * severity in the first place - the only thing caught is an actual failure
 * to produce results at all: fetching the OAD failing, or linting itself
 * crashing (e.g. a bug in a Spectral rule). Either way, this function logs
 * what happened instead of propagating it.
 *
 * @param {string} oadUrl URL of the OpenAPI Description to lint.
 *   Defaults to the configured wiki's unprefixed module.
 * @return {Promise<string>} The linter's textual output, for logging/inspection.
 *
 * @namespace api-testing
 */
async function lint(oadUrl = `${ utils.trimTrailingSlash(config.base_uri) }/rest.php/specs/v0/module/-`) {
	try {
		const { text: body } = await superagent.get(oadUrl);

		const spectral = new Spectral();
		spectral.setRuleset(ruleset);

		const results = await spectral.run(new Document(body, Yaml, oadUrl));
		const output = results.length === 0 ? 'No issues found.' : formatText(results);

		console.log(output);
		return output;
	} catch (err) {
		// Neither a failed fetch nor a failure while linting (including a
		// crash in a Spectral rule) should ever fail the caller - see T422920.
		const description = describeError(err);
		console.warn(`OpenAPI linter did not complete cleanly: ${ description }`);
		return description;
	}
}

module.exports = { lint };
