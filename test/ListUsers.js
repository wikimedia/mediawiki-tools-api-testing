const { action, assert, utils } = require('../index');

describe('Listing Users', function () {
    let prefix;

    // users
    let user1 = action.getAnon();
    let user2 = action.getAnon();
    let user3 = action.getAnon();

    before(async () => {
        prefix = await utils.title();
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
