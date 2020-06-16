'use strict';

const { assert, action } = require('../index');

describe('Action Api', () => {

    describe('Tag creation', () => {

        // If running this locally, the tag will already exist after the test has run once.
        it('Should create a new tag and return existing', async () => {
            const tagName = 'api-test-new';
            const tag = await action.makeTag(tagName);
            assert.deepEqual(tag, tagName);

            // If tag has already been created, should still return because it has been cached
            const tag2 = await action.makeTag(tagName);
            assert.deepEqual(tag2, tagName);
        });

    });
});
