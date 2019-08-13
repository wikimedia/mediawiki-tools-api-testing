const { assert } = require('chai');
const supertest = require('supertest');
const config = require('./config.json');

/**
 * Returns a unique string of random alphanumeric characters.
 *
 * @param {int} n the desired number of characters
 * @return {string}
 */
const uniq = (n=10) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < n; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

/**
 * Returns a unique title for use in tests.
 *
 * @param {string} prefix
 * @return {string}
 */
const title = (prefix = '') => {
    return prefix + uniq();
};

/**
 * Returns a promise that will resolve in no less than the given number of milliseconds.
 * @param {int} ms wait time in milliseconds
 * @returns {Promise<void>}
 */
const sleep = (ms = 1000) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Converts a title string to DB key form by replacing any spaces with underscores.
 * @param {string} title
 * @returns {string}
 */
const dbkey = (title) => title.replace( / /g, '_');

/**
 * Compares two titles, applying some normalization
 * @param a
 * @param b
 */
const sameTitle = (a, b) => assert.equal(dbkey(a), dbkey(b));


class Client {
    /**
     * Constructs a new agent for making HTTP requests to the MediaWiki
     * action API. The agent acts like a browser session and has its own
     * cookie jar.
     *
     * Until account() is used to attach the client to a user account,
     * the client behaves like an "anonymous" user.
     *
     * Note that all anonymous users share the same IP address, even though they
     * don't share a browser session (cookie jar). This means that are treated
     * as the same user in some respects, but not in others.
     */
    constructor() {
        this.req = supertest.agent(config.base_uri);

        this.username = '<anon>';
        this.userid = 0;
    }

    /**
     * Attaches this API client to a user account.
     *
     * A login for this user is performed,
     * and the corresponding server session is associated with this client.
     * This should only be used when instantiating fixtures.
     *
     * If no password is given, a new user account is created with a random
     * password and a random suffix appended to the user name. The new user is
     * then logged in. This should be used to construct a temporary unique
     * user account that can be modified and destroyed by tests.
     *
     * @param {string} name
     * @param {string|null} passwd
     * @return {Promise<Client>}
     */
    async account(name, passwd = null) {
        let uname = name;
        let upass = passwd;

        if (!upass) {
            uname = title(name);
            upass = title();

            const account = await this.createAccount({ username: uname, password: upass });
            uname = account.username;
        }

        await this.login(uname, upass);
        return this;
    }

    /**
     * Constructs an HTTP request to the action API and returns the
     * corresponding supertest Test object, which behaves like a
     * superagent Request. It can be used like a Promise that resolves
     * to a Response.
     *
     * The request has not been sent when this method returns,
     * and can still be modified like a superagent request.
     * Call end() or then(), use use await to send the request.
     *
     * @param {string} actionName
     * @param {Object} params
     * @param {boolean|string} post
     * @return {Promise<*>}
     */
    async request(actionName, params, post = false) {
        // TODO: it would be nice if we could resolve/await any promises in params
        // TODO: convert any arrays in params to strings
        const defaultParams = {
            action: actionName,
            format: 'json'
        };

        let req;
        if (post) {
            req = this.req.post('api.php')
                .type('form')
                .send({ ...defaultParams, ...params });
        } else {
            req = this.req.get('api.php')
                .query({ ...defaultParams, ...params });
        }

        return req;
    }

    /**
     * Executes an HTTP request to the action API and returns the parsed
     * response body. Will fail if the reponse contains an error code.
     *
     * @param {string} actionName
     * @param {Object} params
     * @param {boolean|string} post
     * @return {Promise<Object>}
     */
    async action(actionName, params, post = false) {
        const response = await this.request(actionName, params, post);

        assert.equal(response.status, 200);
        assert.exists(response.body);

        if (response.body.error) {
            assert.fail(`User "${this.username}": Action "${actionName}" returned error code "${response.body.error.code}": ${response.body.error.info}!`);
        }

        return response.body;
    }

    /**
     * Executes a prop query
     *
     * @param {string|Array} prop
     * @param {string|Array} titles
     * @param {Object} params
     * @return {Promise<Array>}
     */
    async prop(prop, titles, params = {}) {
        const defaults = {
            prop: typeof prop === 'string' ? prop : prop.join('|'),
            titles: typeof titles === 'string' ? titles : titles.join('|')
        };
        const result = await this.action('query', { ...defaults, ...params });

        const names = {};
        const pages = {};

        if (result.query.normalized) {
            for (const e of result.query.normalized) {
                names[e.to] = e.from;
            }
        }

        for (const k in result.query.pages) {
            let title = result.query.pages[k].title;

            // De-normalize the titles, so the keys in the result correspond
            // to the titles parameter.
            if (title in names) {
                title = names[title];
            }

            pages[title] = result.query.pages[k];
        }

        return pages;
    }

    /**
     * Executes a list query
     *
     * @param {string} list
     * @param {Object} params
     * @return {Promise<Array>}
     */
    async list(list, params) {
        const defaults = { list };
        const result = await this.action('query', { ...defaults, ...params });
        return result.query[list];
    }

    /**
     * Executes a meta query
     *
     * @param {string} meta
     * @param {Object} params
     * @return {Promise<Object>}
     */
    async meta(meta, params) {
        const defaults = { meta };
        const result = await this.action('query', { ...defaults, ...params });
        return result.query[meta];
    }

    /**
     * Executes an HTTP request to the action API and returns the error
     * stanza of the response body. Will fail if there is no error stanza.
     * This is intended as an easy way to test for expected errors.
     *
     * @param {string} actionName
     * @param {Object} params
     * @param {boolean|string} post
     * @return {Promise<Object>}
     */
    async actionError(actionName, params, post = false) {
        const response = await this.request(actionName, params, post);

        assert.equal(response.status, 200);
        assert.exists(response.body);
        assert.exists(response.body.error);
        return response.body.error;
    }

    /**
     * Loads the given tokens. Any cached tokens are reset.
     *
     * @param {string[]} ttypes
     * @return {Promise<Object>}
     */
    async loadTokens(ttypes) {
        this.tokens = await this.meta('tokens', { type: ttypes.join('|') });

        return this.tokens;
    }

    /**
     * Returns the given token. If the token is not cached, it is requested
     * and then cached.
     *
     * @param {string} ttype
     * @return {Promise<string>}
     */
    async token(ttype = 'csrf') {
        const tname = `${ttype}token`;
        if (this.tokens && this.tokens[tname]) {
            return this.tokens[tname];
        }

        // TODO: skip tokens we already have!
        const newTokens = await this.meta('tokens', { type: ttype });

        this.tokens = { ...this.tokens, ...newTokens };

        // const session = this.req.jar.getCookie('default_session', cookiejar.CookieAccessInfo.All);
        // console.log(`token(${ttype}): user id ${this.userid}: ${JSON.stringify(this.tokens)} (session: ${session})`);

        assert.exists(this.tokens[tname]);
        return this.tokens[tname];
    }

    /**
     * Logs this agent in as the given user.
     *
     * @param {string} username
     * @param {string} password
     * @return {Promise<Object>}
     */
    async login(username, password) {
        const result = await this.action(
            'login',
            {
                lgname: username,
                lgpassword: password,
                lgtoken: await this.token('login')
            },
            'POST',
        );
        assert.equal(result.login.result, 'Success',
            `Login for "${username}": ${result.login.reason}`);

        this.username = result.login.lgusername;
        this.userid = result.login.lguserid;
        this.tokens = {}; // discard anon tokens

        return result.login;
    }

    /**
     * Performs an edit on a page.
     *
     * @param {string} pageTitle
     * @param {Object} params
     * @return {Promise<Object>}
     */
    async edit(pageTitle, params) {
        const effectiveParams = {
            ...{
                title: pageTitle,
                summary: 'testing',
            },
            ...params
        };

        // use a unique default text
        effectiveParams.text = effectiveParams.text || 'Lorem ipsum ' + uniq();

        effectiveParams.token = params.token || await this.token('csrf');

        const result = await this.action('edit', effectiveParams, 'POST');
        assert.equal(result.edit.result, 'Success');

        // record parameters, for convenience
        result.edit.param_text = effectiveParams.text;
        result.edit.param_summary = effectiveParams.summary;
        result.edit.param_user = this.username;
        return result.edit;
    }

    /**
     * Returns a revision record of the given page.
     * If revid is not given or 0, the latest revision is returned.
     *
     * @param pageTitle
     * @param revid
     * @returns {Promise<Object>}
     */
    async getRevision(pageTitle, revid = 0) {
        const params = {
            rvslots: 'main',
            rvprop: 'ids|user|comment|content|timestamp|flags|contentmodel',
        };

        if (revid) {
            params.revids = revid;
        } else {
            params.titles = pageTitle;
            params.rvlimit = 1;
        }

        const result = await this.prop(
            'revisions',
            pageTitle,
            params
        );

        // XXX: pageTitle may need normalization!
        const page = result[pageTitle];
        return page.revisions[0];
    }

    /**
     * Returns the newest log entry matching the given parameters.
     *
     * @param params
     * @returns {Promise<Object>}
     */
    async getLogEntry(params) {
        const list = await this.list('logevents', {
            ...{
                leprop: 'ids|title|type|user|timestamp|comment',
                lelimit: 1
            },
            ...params
        });

        return list[0];
    }

    /**
     * Returns the newest recent changes entry matching the given parameters.
     *
     * @param params
     * @returns {Promise<Object>}
     */
    async getChangeEntry(params) {
        const list = await this.list('recentchanges', {
            ...{
                rcprop: 'ids|flags|user|comment|timestamp|title',
                rclimit: 1
            },
            ...params
        });

        return list[0];
    }

    async getHtml(title) {
        const result = await this.action('parse', { page: title });

        return result.parse.text['*'];
    }

    /**
     * @param {Object} params
     * @return {Promise<Object>}
     */
    async createAccount(params) {
        const defaults = {
            createtoken: params.token || await this.token('createaccount'),
            retype: params.retype || params.password,
            createreturnurl: config.base_uri
        };

        const result = await this.action('createaccount', { ...defaults, ...params }, 'POST');
        assert.equal(result.createaccount.status, 'PASS');

        // TODO: wait for replication!
        return result.createaccount;
    }

    /**
     * @param {string} userName
     * @param {string[]} groups
     * @return {Promise<Object>}
     */
    async addGroups(userName, groups) {
        const gprops = {
            user: userName,
            add: groups.join('|'),
            token: await this.token('userrights')
        };

        const result = await this.action('userrights', gprops, 'POST');
        assert.isOk(result.userrights.added);

        // TODO: wait for replication!
        return result.userrights;
    }

}
module.exports = {
    /**
     * API Client class.
     * Wraps a supertest Test, which emulates a superagent request.
     */
    Client,

    /**
     * Returns a unique string of random alphanumeric characters.
     */
    uniq,

    /**
     * Returns a unique title for use in tests.
     *
     * @param {string|null} namePrefix
     * @returns string
     */
    title,

    /**
     * Returns a promise that will resolve in no less than the given number of milliseconds.
     * @param {int} ms wait time in milliseconds
     * @returns {Promise<void>}
     */
    sleep,

    /**
     * Converts a title string to DB key form by replacing any spaces with underscores.
     * @param {string} title
     * @returns {string}
     */
    dbkey,

    /**
     * Convenient assertions
     */
    'assert': {
        /**
         * Compares two titles, applying some normalization
         * @param a
         * @param b
         */
        sameTitle,
    },

};
