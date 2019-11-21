const { assert } = require('chai');
const fixtures = require('../../fixtures');
const api = require('../../actionapi');
const REST = require('./REST');

describe('Page History', () => {
    const title = api.title('PageHistory_');
    const client = new REST();

    const edits = {
        all: [],
        anon: [],
        bot: [],
        reverts: []
    };

    const addEditInfo = (editInfo, editBucket) => {
        const obj = {
            id: editInfo.newrevid,
            comment: editInfo.param_summary,
            'user.name': editInfo.param_user,
            minor: !!editInfo.param_minor
        };

        edits.all.unshift(obj);
        if (editBucket) {
            editBucket.unshift(obj);
        }
    };

    before(async () => {
        // Users
        const bot = await fixtures.robby();
        const anon = new api.Client();
        const alice = await fixtures.alice();
        const mindy = await fixtures.mindy();

        // Update anon's username
        const anonInfo = await anon.meta('userinfo');
        anon.username = anonInfo.name;

        // Create a page and make edits by various users and store edit information
        addEditInfo(await alice.edit(title, { text: 'Counting 1', summary: 'creating page' }), false);
        addEditInfo(await anon.edit(title, { text: 'Counting 1 2', summary: 'anon edit 1' }), edits.anon);
        addEditInfo(await anon.edit(title, { text: 'Counting 1 2 3', summary: 'anon edit 2' }), edits.anon);
        addEditInfo(await bot.edit(title, { text: 'Counting 1 2 3 4', summary: 'bot edit 1' }), edits.bot);
        addEditInfo(await bot.edit(title, { text: 'Counting 1 2 3 4 5', summary: 'bot edit 2' }), edits.bot);

        // Rollback edits by bot
        const summary = 'revert edits by bot';
        const { rollback } = await mindy.action('rollback', {
            title,
            user: bot.username,
            summary,
            token: await mindy.token('rollback')
        }, 'POST');

        // record info for use by addEditInfo()
        rollback.newrevid = rollback.revid;
        rollback.param_summary = summary;
        rollback.param_user = mindy.username;
        // Rollbacks are minor by default
        rollback.param_minor = true;

        // Make sure we have something in cache in MW, so that we can verify later on it's updated
        await client.get(`/page/${title}/history/counts/edits`);

        addEditInfo(rollback, edits.reverts);
        addEditInfo(await bot.edit(title, { text: 'Counting 1 2 3 4', summary: 'bot edit 3', minor: true }), edits.bot);
        addEditInfo(await bot.edit(title, { text: 'Counting 1 2 3 4 555', summary: 'bot edit 4' }), edits.bot);

        // Undo last edit
        addEditInfo(await mindy.edit(title, { undo: edits.all[0].id }), edits.reverts);
    });

    describe('GET /page/{title}/history/counts/edits', () => {
        it('should get total number of edits', async () => {
            // we do 2 requests to verify the second value coming from cache is the same
            for (let i = 0; i < 2; i++) {
                const res = await client.get(`/page/${title}/history/counts/edits`);
                assert.deepEqual(res.body, { count: 9, limit: false });
                assert.equal(res.status, 200);
            }
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

        it('should get total number of edits between revisions, normal order', async () => {
            const fromRev = edits.all[1].id;
            const toRev = edits.all[edits.all.length - 2].id;
            const res = await client.get(`/page/${title}/history/counts/edits?from=${fromRev}&to=${toRev}`);

            assert.strictEqual(res.status, 200);
            assert.deepEqual(res.body, { count: 5, limit: false });
        });

        it('should get total number of edits between revisions, reverse order', async () => {
            const fromRev = edits.all[1].id;
            const toRev = edits.all[edits.all.length - 2].id;
            const res = await client.get(`/page/${title}/history/counts/edits?from=${toRev}&to=${fromRev}`);

            assert.strictEqual(res.status, 200);
            assert.deepEqual(res.body, { count: 5, limit: false });
        });
    });

    describe('GET /page/{title}/history/counts/anonymous', () => {
        it('should get total number of anonymous edits', async () => {
            const res = await client.get(`/page/${title}/history/counts/anonymous`);

            assert.deepEqual(res.body, { count: 2, limit: false });
            assert.equal(res.status, 200);
        });
    });

    describe('GET /page/{title}/history/counts/bot', () => {
        it('should get total number of edits by bots', async () => {
            const res = await client.get(`/page/${title}/history/counts/bot`);

            assert.deepEqual(res.body, { count: 4, limit: false });
            assert.equal(res.status, 200);
        });
    });

    describe('GET /page/{title}/history/counts/reverted', () => {
        it('should get total number of reverted edits', async () => {
            const res = await client.get(`/page/${title}/history/counts/reverted`);

            assert.deepEqual(res.body, { count: 2, limit: false });
            assert.equal(res.status, 200);
        });
    });

    describe('GET /page/{title}/history/counts/editors', () => {
        it('should get total number of unique editors', async () => {
            const res = await client.get(`/page/${title}/history/counts/editors`);

            assert.deepEqual(res.body, { count: 4, limit: false });
            assert.equal(res.status, 200);
        });

        it('should get total number of unique editors between revisions, normal order', async () => {
            const fromRev = edits.all[1].id;
            const toRev = edits.all[edits.all.length - 2].id;
            const res = await client.get(`/page/${title}/history/counts/editors?from=${fromRev}&to=${toRev}`);

            assert.strictEqual(res.status, 200);
            assert.deepEqual(res.body, { count: 3, limit: false });
        });

        it('should get total number of unique editors between revisions, reverse order', async () => {
            const fromRev = edits.all[1].id;
            const toRev = edits.all[edits.all.length - 2].id;
            const res = await client.get(`/page/${title}/history/counts/editors?from=${toRev}&to=${fromRev}`);

            assert.strictEqual(res.status, 200);
            assert.deepEqual(res.body, { count: 3, limit: false });
        });
    });

    describe('GET page/{title}/history?filter={tag}', () => {
        it('should get all revisions', async () => {
            const res = await client.get(`/page/${title}/history`);

            assert.lengthOf(res.body.revisions, edits.all.length);
            res.body.revisions.forEach((rev, i) => assert.deepNestedInclude(rev, edits.all[i]));
            assert.include(res.body.latest, `page/${title}/history`);
            assert.equal(res.status, 200);
        });

        it('should get revisions by anonymous users', async () => {
            const res = await client.get(`/page/${title}/history`, { filter: 'anonymous' });

            assert.lengthOf(res.body.revisions, edits.anon.length);
            res.body.revisions.forEach((rev, i) => assert.deepNestedInclude(rev, edits.anon[i]));
            assert.include(res.body.latest, `page/${title}/history?filter=anonymous`);
            assert.equal(res.status, 200);
        });

        it('should get revisions by bots', async () => {
            const res = await client.get(`/page/${title}/history`, { filter: 'bot' });

            assert.lengthOf(res.body.revisions, edits.bot.length);
            res.body.revisions.forEach((rev, i) => assert.deepNestedInclude(rev, edits.bot[i]));
            assert.include(res.body.latest, `page/${title}/history?filter=bot`);
            assert.equal(res.status, 200);
        });

        it('should get reverted revisions', async () => {
            const res = await client.get(`/page/${title}/history`, { filter: 'reverted' });

            assert.lengthOf(res.body.revisions, edits.reverts.length);
            res.body.revisions.forEach((rev, i) => assert.deepNestedInclude(rev, edits.reverts[i]));
            assert.include(res.body.latest, `page/${title}/history?filter=reverted`);
            assert.equal(res.status, 200);
        });

        it('should return 400 for invalid filter parameter', async () => {
            const res = await client.get(`/page/${title}/history`, { filter: 'anon' });

            assert.equal(res.status, 400);
        });

        it('should return 404 for title that does not exist', async () => {
            const title2 = api.title('Random_');
            const res = await client.get(`/page/${title2}/history`, { filter: 'bot' });

            assert.equal(res.status, 404);
        });
    });

    describe('GET /page/{title}/history?{older_than|newer_than={id}}', () => {
        it('should get revisions newer than specified id for a page', async () => {
            const { id } = edits.all[3];
            const expected = edits.all.slice(0, 3);
            const res = await client.get(`/page/${title}/history`, { newer_than: id });

            assert.lengthOf(res.body.revisions, expected.length);
            res.body.revisions.forEach((rev, i) => assert.deepNestedInclude(rev, expected[i]));
            assert.include(res.body.latest, `page/${title}/history`);
            assert.include(res.body.older, `page/${title}/history?older_than=${expected[expected.length - 1].id}`);
            assert.equal(res.status, 200);
        });

        it('should get revisions older than specified id for a page', async () => {
            const { id } = edits.all[3];
            const expected = edits.all.slice(4);
            const res = await client.get(`/page/${title}/history`, { older_than: id });

            assert.lengthOf(res.body.revisions, expected.length);
            res.body.revisions.forEach((rev, i) => assert.deepNestedInclude(rev, expected[i]));
            assert.include(res.body.latest, `page/${title}/history`);
            assert.include(res.body.newer, `page/${title}/history?newer_than=${expected[0].id}`);
            assert.equal(res.status, 200);
        });

        it('should get revisions using both filter and newer_than|older_than parameters', async () => {
            const { id } = edits.all[3];
            const res = await client.get(`/page/${title}/history`, { newer_than: id, filter: 'bot' });

            assert.lengthOf(res.body.revisions, 2);
            res.body.revisions.forEach((rev, i) => assert.deepNestedInclude(rev, edits.bot[i]));
            assert.include(res.body.latest, `page/${title}/history?filter=bot`);
            assert.include(res.body.older, `page/${title}/history?filter=bot&older_than=${edits.bot[1].id}`);
            assert.equal(res.status, 200);
        });

        it('should return 400 for revision id less than 0 ', async () => {
            const res = await client.get(`/page/${title}/history`, { newer_than: -1 });

            assert.equal(res.status, 400);
        });

        it('should return 400 when using both newer_than and older_than', async () => {
            const id1 = edits.all[8].id;
            const id2 = edits.all[2].id;
            const res = await client.get(`/page/${title}/history`, { newer_than: id1, older_than: id2 });

            assert.equal(res.status, 400);
        });

        it('should return 404 for a revision that does not exist for a specified page', async () => {
            const anon2 = new api.Client();
            const title2 = api.title('AnotherPage');
            const edit = await anon2.edit(title2, { text: 'Hello world' });
            const res = await client.get(`/page/${title}/history`, { newer_than: edit.newrevid });

            assert.equal(res.status, 404);
        });
    });
});
