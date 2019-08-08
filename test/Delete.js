const { assert } = require('chai');
const fixtures = require('../fixtures');
const api = require('../actionapi');

describe('The delete/undelete action', function testDeleteAction() {
    // disable timeouts
    this.timeout(0);

    const title = api.title('Delete_');
    let alice, mindy;

    before(async () => {
        [alice, mindy] = await Promise.all([
            fixtures.alice(),
            fixtures.mindy()
        ]);
    });

    it('allows an admin to delete a page', async () => {
        await alice.edit(title, {
            text: 'Testing the testy test',
            summary: 'first',
            createonly: true
        });

        const result = await mindy.action('delete', {
            title,
            summary: 'testing',
            token: await mindy.token('csrf')
        }, 'POST');

        assert.equal(result.delete.title, title.replace('_', ' '));

        const error = await mindy.actionError('parse', { page: title });
        assert.equal(error.code, 'missingtitle');
    });

    it('logs the deletion', async () => {
        const list = await alice.list('logevents', {
            leprop: 'ids|title|type|user',
            letype: 'delete',
            letitle: title,
            lelimit: 1
        });
        assert.equal(list[0].user, mindy.username);
        assert.equal(list[0].action, 'delete');
    });

    it('allows an admin to undelete a page', async () => {
        const result = await mindy.action('undelete', {
            title,
            summary: 'testing',
            token: await mindy.token('csrf')
        }, 'POST');

        assert.equal(result.undelete.title, title.replace('_', ' '));

        const html = await alice.getHtml(title);
        assert.match(html, /Testing the testy test/);
    });

    it('logs the undeletion', async () => {
        const list = await alice.list('logevents', {
            leprop: 'ids|title|type|user',
            letype: 'delete',
            letitle: title,
            lelimit: 1
        });
        assert.equal(list[0].user, mindy.username);
        assert.equal(list[0].action, 'restore');
    });
});
