const { assert } = require('chai');
const fixtures = require('../fixtures');
const api = require('../actionapi');

describe('Blocking a user', function testBlockingAUser() {
    // disable timeouts
    this.timeout(0);

    let eve = new api.Client();
    let pageTitle, mindy;

    before(async () => {
        [pageTitle, eve, mindy] = await Promise.all([
            api.title('Block_'),
            eve.account('Eve_'),
            fixtures.mindy()
        ]);
    });

    it('the user should edit a page', async () => {
        await eve.edit(pageTitle, { text: 'One', comment: 'first' });
    });

    it('an admin should block the user', async () => {
        const result = await mindy.action('block', {
            user: eve.username,
            reason: 'testing',
            token: await mindy.token()
        }, 'POST');

        assert.exists(result.block.id);
        assert.equal(result.block.userID, eve.userid);
        assert.equal(result.block.user, eve.username);
    });

    it('the user should fail to edit a page', async () => {
        const error = await eve.actionError(
            'edit',
            {
                title: pageTitle,
                text: 'Two',
                comment: 'second',
                token: await eve.token('csrf')
            },
            'POST',
        );
        assert.equal(error.code, 'blocked');
    });

    it('an admin should unblock the user', async () => {
        const result = await mindy.action('unblock', {
            user: eve.username,
            reason: 'testing',
            token: await mindy.token()
        }, 'POST');

        assert.exists(result.unblock.id);
        assert.equal(result.unblock.userid, eve.userid);
        assert.equal(result.unblock.user, eve.username);
    });

    it('the user should by able to edit a page again', async () => {
        await eve.edit(pageTitle, { text: 'Three', comment: 'third' });
    });
});
