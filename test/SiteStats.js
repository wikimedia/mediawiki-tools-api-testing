const { assert } = require('chai');
const fixtures = require('../fixtures');
const api = require('../actionapi');

describe("Testing site statistics' edits value", function () {
    // disable timeouts
    this.timeout(0);

    const siteStatsParams = {
        meta: 'siteinfo',
        siprop: 'statistics',
        format: 'json'
    };

    const variables = {};
    let wikiuser;

    before(async () => {
        wikiuser = await fixtures.alice();
    });

    it('should GET site statistics', async () => {
        const stats = await wikiuser.action('query', siteStatsParams);
        variables.editsStats = parseInt(stats.query.statistics.edits, 10);
        assert.isNumber(variables.editsStats);
    });

    it('should edit a page', async () => {
        await wikiuser.edit(api.title('TestingSiteStats_'), { text: 'testing site stats ...' });
    });

    it('should GET an increased site edits stat', async () => {
        const stats = await wikiuser.action('query', siteStatsParams);
        const edits = parseInt(stats.query.statistics.edits, 10);

        assert.isNumber(edits);
        assert.isAbove(edits, variables.editsStats);
    });
});
