const { assert } = require('chai');
const fixtures = require('../fixtures');
const { Client } = require('../actionapi');

describe('Testing a new talk page notification', function () {
    let kam = new Client();
    let alice;

    before(async () => {
        [alice, kam] = await Promise.all([
            fixtures.alice(),
            kam.account('Kam_')
        ]);
    });

    it('should edit a user\'s talk page', async () => {
        await alice.edit(`User_talk:${kam.username}`, { text: 'Hi, Kam! ~~~~', summary: 'saying hello', createonly: true });
    });

    it('user should have a new message notification', async () => {
        // FIXME: https://phabricator.wikimedia.org/T230211
        const result = await kam.meta('userinfo', { uiprop: 'hasmsg' });

        assert.exists(result.messages);
        assert.equal(result.name, kam.username);
        assert.equal(result.id, kam.userid);
    });
});
