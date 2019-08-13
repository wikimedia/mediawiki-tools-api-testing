const { assert } = require('chai');
const fixtures = require('../fixtures');
const api = require('../actionapi');

describe('Testing undo functionality', function () {
    const title = api.title('Undo_');
    let alice, revisionID;

    before(async () => {
        alice = await fixtures.alice();
    });

    it('should create a page', async () => {
        await alice.edit(title, { text: 'Undo Page\n\nFoo', createonly: true });
    });

    it('should edit a page, revision 2', async () => {
        const edit = await alice.edit(title, { text: 'Undo Pages\n\nFoo' });
        revisionID = edit.newrevid;
    });

    it('should edit a page, revision 3', async () => {
        await alice.edit(title, { text: 'Undo Page\n\nFoo\n\nBar' });
    });

    it('should undo revision 2', async () => {
        await alice.edit(title, { undo: revisionID });
    });

    it('should confirm undo action', async () => {
        const html = await alice.getHtml(title);

        assert.match(html, /<p>Undo Page\n<\/p><p>Foo\n<\/p><p>Bar\n<\/p>/);
    });
});
