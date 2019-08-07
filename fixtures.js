const { assert } = require('chai');
const uniqid = require('uniqid');
const api = require('./actionapi');
const config = require('./config.json');

module.exports = {

    // singletons
    singletons: {},

    async root() {
        if (this.singletons.root) {
            return this.singletons.root;
        }

        const root = new api.Client();
        await root.login(config.root_user.name,
            config.root_user.password);

        await root.loadTokens(['createaccount', 'userrights', 'csrf']);

        // FIXME: Something is wrong with the async stuff here, and Daniel can't figure out what.
        //   Without the sleep, the userrights token is sometimes the anon token, '+\\',
        //   which leads to silent failure of addGroups. None of this makes any sense.
        root.sleep(1000);
        const rightsToken = await root.token('userrights');
        assert.notEqual(rightsToken, '+\\');

        this.singletons.root = root;
        return root;
    },

    async user(name, groups = [], tokens = ['csrf']) {
        if (this.singletons[name]) {
            return this.singletons[name];
        }

        // TODO: Use a fixed user name for Alice. Works only on a blank wiki.
        let uname = `${name}_${uniqid()}`;
        const passwd = uniqid();
        const root = await this.root();
        const client = new api.Client();

        const account = await client.createAccount({ username: uname, password: passwd });
        uname = account.username;

        if (groups.length) {
            const groupResult = await root.addGroups(uname, groups);
            assert.sameMembers(groupResult.added, groups);
        }

        await client.account(uname, passwd);

        if (tokens.length) {
            await client.loadTokens(tokens);
        }

        this.singletons[name] = client;
        return client;
    },

    async alice() {
        return this.user('Alice');
    },

    async bob() {
        return this.user('Bob');
    },

    async mindy() {
        return this.user('Mindy', ['sysop'], ['userrights', 'csrf']);
    },

    async robby() {
        return this.user('Robby', ['bot']);
    }
};
