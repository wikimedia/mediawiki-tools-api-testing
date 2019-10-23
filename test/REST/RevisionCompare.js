const { assert } = require('chai');
const fixtures = require('../../fixtures');
const api = require('../../actionapi');
const REST = require('./REST');

describe('Revision Compare', () => {
    const client = new REST();
    let mindy;

    before(async () => {
        mindy = await fixtures.mindy();
    });

    describe('GET /revision/{from}/compare/{to}', () => {
        const page = api.title('RevisionCompare_');
        const pageTwo = api.title('RevisionCompare_2');
        const nonExistentRevId = 999;
        const validRevId = 1;
        const invalidRevId = '#';

        it('should return 400 if revision id is not an integer', async () => {
            const { status } = await client.get(`/revision/${validRevId}/compare/${invalidRevId}`);
            assert.equal(status, 400);
        });

        it('should successfully get diff between 2 valid revisions', async () => {
            const { newrevid: revId1 } = await mindy.edit(page, { text: 'Mindy Edit 1' });
            const { newrevid: revId2 } = await mindy.edit(page, { text: 'Mindy Edit 2' });
            const { status, body } = await client.get(`/revision/${revId1}/compare/${revId2}`);
            assert.strictEqual(status, 200);
            assert.nestedPropertyVal(body, 'from.id', revId1);
            assert.nestedPropertyVal(body, 'to.id', revId2);
            assert.nestedProperty(body, 'diff');
            assert.isArray(body.diff);
        });

        it('should return 404 for revision that does not exist', async () => {
            const { status } = await client.get(`/revision/${validRevId}/compare/${nonExistentRevId}`);
            assert.strictEqual(status, 404);
        });

        it('should return 400 if revision ids belong to different pages', async () => {
            const { newrevid: pageOneRev } = await mindy.edit(page, { text: 'Page 1 edit' });
            const { newrevid: pageTwoRev }  = await mindy.edit(pageTwo, { text: 'Page 2 edit' });
            const { status } = await client.get(`/revision/${pageOneRev}/compare/${pageTwoRev}`);
            assert.strictEqual(status, 400);
        });
    });
});
