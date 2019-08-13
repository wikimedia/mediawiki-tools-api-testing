const { assert } = require('chai');
const fixtures = require('../fixtures');
const api = require('../actionapi');

describe('Move action', function () {
    const page1 = api.title('MoveWithout_');
    const page2 = api.title('MoveWith_');
    const page1Subpage = api.title();
    const page2Subpage = api.title();
    const page1Talk = `Talk:${page1}`;
    const page2Talk = `Talk:${page2}`;
    let alice;

    before(async () => {
        alice = await fixtures.alice();

        // creating page1, a subpage, and talkpage
        await alice.edit(page1, { text: 'Move without redirect, subpage and talkpage' });
        await alice.edit(`${page1}/${page1Subpage}`, { text: `Subpage of ${page1}` });
        await alice.edit(page1Talk, { text: `Talk page of ${page1}` });

        // creating page2, a subpage, and talkpage
        await alice.edit(page2, { text: 'Move with redirect, subpage and talkpage' });
        await alice.edit(`${page2}/${page2Subpage}`, { text: `Subpage of ${page2}` });
        await alice.edit(page2Talk, { text: `Talk page of ${page2}` });
    });

    it('should move a page without a redirect or its subpages and talkpages', async () => {
        const newPage1 = `${page1}_${api.title()}`;
        const { move } = await alice.action('move',
            {
                from: page1,
                to: newPage1,
                noredirect: true,
                reason: 'testing',
                token: alice.tokens.csrftoken
            },
            'POST');

        api.assert.sameTitle(move.from, page1);
        api.assert.sameTitle(move.to, newPage1);
        assert.equal(move.reason, 'testing');
        assert.notExists(move.redirectcreated);
        assert.notExists(move.subpages);
        assert.notExists(move.talkto);
        assert.notExists(move.talkfrom);

        const newPage = await alice.getHtml(newPage1);
        const oldPage = await alice.actionError('parse', { page: page1 });

        assert.match(newPage, /Move without redirect, subpage and talkpage/);
        assert.equal(oldPage.code, 'missingtitle');
    });

    it('should move a page with a redirect and its subpages and talkpages', async () => {
        const newPage2 = `${page2}_${api.title()}`;
        const newPage2Talk = `Talk:${newPage2}`;
        const { move } = await alice.action('move',
            {
                from: page2,
                to: newPage2,
                reason: 'testing',
                movetalk: '',
                movesubpages: '',
                token: alice.tokens.csrftoken
            },
            'POST');

        api.assert.sameTitle(move.from, page2);
        api.assert.sameTitle(move.to, newPage2);
        api.assert.sameTitle(move.talkfrom, page2Talk);
        api.assert.sameTitle(move.talkto, newPage2Talk);
        api.assert.sameTitle(move.subpages[0].from, `${page2}/${page2Subpage}`);
        api.assert.sameTitle(move.subpages[0].to, `${newPage2}/${page2Subpage}`);
        assert.equal(move.reason, 'testing');
        assert.exists(move.redirectcreated);
        assert.exists(move['subpages-talk']);

        const newPage = await alice.getHtml(newPage2);
        const oldPage = await alice.getHtml(page2);

        assert.match(newPage, /Move with redirect, subpage and talkpage/);
        assert.include(oldPage, 'Redirect to:');
        assert.include(oldPage, `title=${newPage2}`);
    });
});
