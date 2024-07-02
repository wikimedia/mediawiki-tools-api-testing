'use strict';

const { assert, action } = require('../index');

describe('Action Api', () => {

	describe('Tag creation', () => {
		let alice;

		before(async () => {
			alice = await action.alice();
		});

		// If running this locally, the tag will already exist after the test has run once.
		it('Should create a new tag and return existing', async () => {
			const tagDisplay = 'TestTagDisplay';
			const tagName = 'api-test-create-new';
			const tag = await action.makeTag(tagName, `''${ tagDisplay }''`);
			assert.deepEqual(tag, tagName);

			const tagList = await alice.list('tags', { tglimit: 50, tgprop: 'displayname' });
			assert.deepInclude(tagList, { name: tagName, displayname: `<i>${ tagDisplay }</i>` });

			// If tag has already been created, should still return because it has been cached
			const tag2 = await action.makeTag(tagName);
			assert.deepEqual(tag2, tagName);
			await action.deleteTag(tagName);
		});

		it('Should be idempotent with respect to new tag creation if force is true', async () => {
			const tagDisplay = 'TestTagDisplay';
			const tagName = 'api-test-create-new-with-existing';
			let tag = await action.makeTag(tagName, `''${ tagDisplay }''`);
			assert.deepEqual(tag, tagName);

			/* Set the 'force=true' option so that we try the create even if the tag exists.
			 * This test will pass whether or not the flag is set - making a test that requires
			 * the flag would mean recreating the race condition inside the test suite - maybe
			 * possible by mocking the API? But setting to `true` here at least exercises the
			 * new codepath */
			tag = await action.makeTag(tagName, `''${ tagDisplay }''`, true);
			assert.deepEqual(tag, tagName);

			const tagList = await alice.list('tags', { tglimit: 50, tgprop: 'displayname' });
			assert.deepInclude(tagList, { name: tagName, displayname: `<i>${ tagDisplay }</i>` });

			// If tag has already been created, should still return because it has been cached
			const tag2 = await action.makeTag(tagName);
			assert.deepEqual(tag2, tagName);
			await action.deleteTag(tagName);
		});

		it('Should delete a non-existent tag without complaining', async () => {
			const result = await action.deleteTag('SomeNonexistentTag');
			assert.deepEqual(result.error.code, 'tags-delete-not-found');
		});
	});
});
