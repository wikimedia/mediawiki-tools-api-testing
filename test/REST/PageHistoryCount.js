const { assert } = require('chai');
const fixtures = require('../../fixtures');
const api = require('../../actionapi');
const REST = require('./REST');

describe('Page History Count', () => {
    const title = api.title('HistoryCount_');
    const client = new REST();

    before(async () => {
        // Users
        const bot = await fixtures.robby();
        const anon = new api.Client();
        const alice = await fixtures.alice();
        const mindy = await fixtures.mindy();

        // Create a page and make edits by various users
        await alice.edit(title, { text: 'Counting 1' });
        await anon.edit(title, { text: 'Counting 1 2' });
        await anon.edit(title, { text: 'Counting 1 2 3' });
        await bot.edit(title, { text: 'Counting 1 2 3 4' });
        await bot.edit(title, { text: 'Counting 1 2 3 4 5' });

        // Rollback edits by bot
        await mindy.action('rollback', {
            title,
            user: bot.username,
            summary: 'revert edits by bot',
            token: await mindy.token('rollback')
        }, 'POST');

        await bot.edit(title, { text: 'Counting 1 2 3 4' });
        const edit = await bot.edit(title, { text: 'Counting 1 2 3 4 555' });

        // Undo last edit
        await mindy.edit(title, { undo: edit.newrevid });
    });

    describe('GET /page/{title}/history/counts/edits', () => {
        it('should get total number of edits', async () => {
            const res = await client.get(`/page/${title}/history/counts/edits`);

            assert.deepEqual(res.body, { count: 9 });
            assert.equal(res.status, 200);
        });

        it('should return 400 for invalid parameter', async () => {
            const res = await client.get(`/page/${title}/history/counts/editts`);

            assert.equal(res.status, 400);
        });

        it('should return 404 for title that does not exist', async () => {
            const title2 = api.title('Random_');
            const res = await client.get(`/page/${title2}/history/counts/edits`);

            assert.equal(res.status, 404);
        });
    });

    describe('GET /page/{title}/history/counts/anonedits', () => {
        it('should get total number of anonymous edits', async () => {
            const res = await client.get(`/page/${title}/history/counts/anonedits`);

            assert.deepEqual(res.body, { count: 2 });
            assert.equal(res.status, 200);
        });
    });

    describe('GET /page/{title}/history/counts/botedits', () => {
        it('should get total number of edits by bots', async () => {
            const res = await client.get(`/page/${title}/history/counts/botedits`);

            assert.deepEqual(res.body, { count: 4 });
            assert.equal(res.status, 200);
        });
    });

    describe('GET /page/{title}/history/counts/revertededits', () => {
        it('should get total number of reverted edits', async () => {
            const res = await client.get(`/page/${title}/history/counts/revertededits`);

            assert.deepEqual(res.body, { count: 2 });
            assert.equal(res.status, 200);
        });
    });

    describe('GET /page/{title}/history/counts/editors', () => {
        it('should get total number of unique editors', async () => {
            const res = await client.get(`/page/${title}/history/counts/editors`);

            assert.deepEqual(res.body, { count: 4 });
            assert.equal(res.status, 200);
        });
    });
});
