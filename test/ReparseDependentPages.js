const { assert } = require('chai');
const fixtures = require('../fixtures');
const api = require('../actionapi');

describe('Reparse of dependent pages', function () {
    const title = api.title('Reparse_');
    const template = api.title('Template');
    const link = api.title('Link');

    let alice;

    before(async () => {
        alice = await fixtures.alice();
    });

    it('should create a page with missing template and link', async () => {
        await alice.edit(title, { text: `{{${template}}} [[${link}]]`, createonly: true });

        const html = await alice.getHtml(title);

        assert.match(html, new RegExp(`title=Template:${template}&amp;action=edit&amp;redlink=1`));
        assert.match(html, new RegExp(`title=${link}&amp;action=edit&amp;redlink=1`));
    });

    it('should create missing template and link', async () => {
        await alice.edit(`Template:${template}`, { text: 'Howdy', createonly: true });
        await alice.edit(link, { text: 'Test link', createonly: true });
    });

    // FIXME: T230211
    it.skip('should get page with updated template and link', async function () {
        const { parse } = await alice.action('parse', { page: title });

        assert.notInclude(parse.text['*'], 'redlink=1');
        assert.exists(parse.links[0].exists);
        assert.exists(parse.templates[0].exists);
    });
});
