const { assert } = require('chai');
const api = require('../actionapi');

describe('Listing Users', function () {
    // disable timeouts
    this.timeout(0);

    let prefix;

    // users
    let user1 = new api.Client();
    let user2 = new api.Client();
    let user3 = new api.Client();

    before(async () => {
        prefix = await api.title();
        prefix = prefix.substring(0, 7);
        [user1, user2, user3] = await Promise.all([
            user1.account(`${prefix}1`),
            user2.account(`${prefix}2`),
            user3.account(`${prefix}3`)
        ]);
    });

    it('should get a list of registered users that begin with a given prefix', async () => {
        const result = await user1.list('allusers', { auprefix: prefix.charAt(0).toUpperCase() + prefix.slice(1) });

        assert.sameDeepMembers(result, [
            { name: user1.username, userid: user1.userid },
            { name: user2.username, userid: user2.userid },
            { name: user3.username, userid: user3.userid }
        ]);
        assert.lengthOf(result, 3);
    });
});
