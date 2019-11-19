const { assert } = require('chai');
const fixtures = require('../../fixtures');
const api = require('../../actionapi');
const REST = require('./REST');

describe('Search', () => {
    const client = new REST();
    const page = api.title('Search');
    const searchTerm = `Content_${api.uniq()}`;
    let alice;
    let mindy;

    before(async () => {
        alice = await fixtures.alice();
        mindy = await fixtures.mindy();
        await alice.edit(page, { text: searchTerm });
    });

    describe('GET /search/page?q={term}', () => {
        it('should return empty array when search term has no title or text matches', async () => {
            const nonExistentTerm = api.uniq();
            const { body } = await client.get(`/search/page?q=${nonExistentTerm}`);
            const noResultsResponse = { pages: [] };
            assert.deepEqual(noResultsResponse, body);
        });
        it('should return array of pages when there is only a text match', async () => {
            const { body } = await client.get(`/search/page?q=${searchTerm}`);
            assert.lengthOf(body.pages, 1);
            const returnPage = body.pages[0];
            assert.nestedProperty(returnPage, 'title');
            assert.nestedProperty(returnPage, 'id');
            assert.nestedProperty(returnPage, 'key');
            assert.nestedPropertyVal(returnPage, 'excerpt', `<span class='searchmatch'>${searchTerm}</span>\n`);
        });
        it('should return array of pages when there is only title match', async () => {
            const { body } = await client.get(`/search/page?q=${page}`);
            assert.lengthOf(body.pages, 1);
            const returnPage = body.pages[0];
            assert.nestedProperty(returnPage, 'title');
            assert.nestedProperty(returnPage, 'id');
            assert.nestedProperty(returnPage, 'key');
            assert.nestedPropertyVal(returnPage, 'excerpt', null);
        });
        it('should return a single page when there is a title and text match on the same page', async () => {
            await alice.edit(page, { text: page });
            const { body } = await client.get(`/search/page?q=${page}`);
            assert.lengthOf(body.pages, 1);
            const returnPage = body.pages[0];
            assert.nestedProperty(returnPage, 'title');
            assert.nestedProperty(returnPage, 'id');
            assert.nestedProperty(returnPage, 'key');
            assert.nestedPropertyVal(returnPage, 'excerpt', `<span class='searchmatch'>${page}</span>\n`);
        });
        it('should not return results when page with term has been deleted', async () => {
            const pageToDelete = 'Delete Page';
            const deleteTerm = `Delete_${api.uniq()}`;
            const { title } = await alice.edit(pageToDelete, { text: deleteTerm });
            await mindy.action('delete', {
                title,
                summary: 'testing',
                token: await mindy.token('csrf')
            }, 'POST');
            const { body } = await client.get(`/search/page?q=${deleteTerm}`);
            assert.lengthOf(body.pages, 0);
        });
    });
});
