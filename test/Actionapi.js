'use strict';

// install fake before initializing other modules
const mock = require('./fake.js').install().newMock();

const { assert, action } = require('../index');

mock.action.fail = (req) => {
	throw new Error('something went wrong');
};

const tagDisplay = 'TestTagDisplay';
const tags = {};

mock.query.list.tags = (req) => {
	const list = Object.entries(tags).map(([key, value]) => ({ name: key, displayname: value }));

	return {
		tags: list
	};
};

mock.action.managetags = (req) => {
	const op = req.params.operation;
	const name = req.params.tag;

	if (op === 'create') {
		tags[name] = `<i>${ tagDisplay }</i>`;
	} else if (op === 'delete') {
		if (tags[name]) {
			delete tags[name];
		} else {
			return {
				error: {
					code: 'tags-delete-not-found'
				}
			};
		}
	}

	return {
		managetags: {
			tag: name
		}
	};
};

describe('The action api', () => {

	describe('framework', () => {

		it('should be able to make a request to the action API', async () => {
			const res = await action.getAnon().action('test');
			assert.property(res, 'test');
			assert.property(res.test, 'result');
			assert.equal(res.test.result, 'Success');
		});

		it('should return the original error text if something goes wrong', async () => {
			try {
				const anon = action.getAnon();
				await anon.action('fail');
				assert.throwsException('this request should have failed');
			} catch (e) {
				if (e.name === 'AssertionError') {
					assert.include(e.message, 'something went wrong');
				} else {
					throw e;
				}
			}
		});
	});

	describe('tag management helpers', () => {
		let alice;

		before(async () => {
			alice = await action.alice();
		});

		// If running this locally, the tag will already exist after the test has run once.
		it('should create a new tag and return existing', async () => {
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

		it('should be idempotent with respect to new tag creation if force is true', async () => {
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

		it('should handle deleting a non-existent tag gracefully', async () => {
			const result = await action.deleteTag('SomeNonexistentTag');
			assert.property(result, 'error', 'should return an error');
			assert.deepEqual(result.error.code, 'tags-delete-not-found');
		});
	});
});
