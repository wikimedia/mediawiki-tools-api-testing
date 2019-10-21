const { assert } = require('chai');
const api = require('../actionapi');
const fixtures = require('../fixtures');

describe('Prefix Search', function () {
    const prefix = `R${api.title(api.uniq())}`;
    const firstPage = `${prefix}_first`;
    const secondPage = `${prefix}_second`;
    const thirdPage = `${prefix}_third`;

    let alice;

    before(async () => {
        alice = await fixtures.alice();

        const text = 'Random Text';

        await alice.edit(firstPage, { text });
        await alice.edit(secondPage, { text });
        await alice.edit(thirdPage, { text });
    });

    it('should search for pages with the `${prefix}` prefix', async () => {
        const result = await alice.list('prefixsearch', { pssearch: `${prefix}`, pslimit: 100 });
        const pageTitles = result.map((p)=>api.dbkey(p.title));
        assert.sameMembers(pageTitles, [firstPage, secondPage, thirdPage]);
    });
});
