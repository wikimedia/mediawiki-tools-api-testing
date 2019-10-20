const { assert } = require('chai');
const fixtures = require('../fixtures');
const api = require('../actionapi');

describe('Backlinks', function () {
    const randomPage = api.title('Esther');

    const linksToEsther1 = api.title('LinksToEsther1');
    const linksToEsther2 = api.title('LinksToEsther2');

    let bob;

    before(async () => {
        bob = await fixtures.bob();

        const randomPageText = `I'm guessing you came here from ${linksToEsther1} or ${linksToEsther2}.`;

        const text = `All I do is link to [[${randomPage}|Page]]`;

        await bob.edit(linksToEsther1, { text });
        await bob.edit(linksToEsther2, { text });
        await bob.edit(randomPage, { text: randomPageText });

    });

    describe('referrers', () => {
        it('can be listed', async () => {
            const result = await bob.list('backlinks', { bltitle: randomPage });
            const links = result.map((p)=>(p.title));
            assert.sameMembers(links, [linksToEsther1, linksToEsther2]);
        });
    });
});
