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

        this.singletons.root = new api.Client();
        await this.singletons.root.login(config.root_user.name,
            config.root_user.password);
        await this.singletons.root.loadTokens(['createaccount', 'userrights', 'csrf']);

        return this.singletons.root;
    },

    async user(name, groups = [], tokens = ['csrf']) {
        if (this.singletons[name]) {
            return this.singletons[name];
        }

        // TODO: Use a fixed user name for Alice. Works only on a blank wiki.
        const uname = `${name}_${uniqid()}`;
        const passwd = uniqid();
        const root = await this.root();
        const client = new api.Client();

        await root.createAccount({ username: uname, password: passwd });
        if (groups.length) {
            await root.addGroups(uname, groups);
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
