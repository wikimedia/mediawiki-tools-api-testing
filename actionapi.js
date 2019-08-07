const { assert } = require('chai');
const supertest = require('supertest');
// const cookiejar = require('cookiejar'); // FIXME
const uniqid = require('uniqid');
const config = require('./config.json');

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
     * @returns {Promise<Client>}
     */
    async account(name, passwd = null) {
        let uname = name;
        let upass = passwd;

        if (!upass) {
            uname = name + uniqid();
            upass = uniqid();

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
     * @param actionName
     * @param {Object} params
     * @param post
     *
     * @returns Test
     */
    async request(actionName, params, post = false) {
        // TODO: it would be nice if we could resolve/await any promises in params
        const defaultParams = {
            action: actionName,
            format: 'json',
        };

        let req;
        if (post) {
            req = this.req.post('')
                .type('form')
                .send({ ...defaultParams, ...params });
        } else {
            req = this.req.get('')
                .query({ ...defaultParams, ...params });
        }

        return req;
    }

    /**
     * Executes an HTTP request to the action API and returns the parsed
     * response body. Will fail if the reponse contains an error code.
     *
     * @param actionName
     * @param {Object} params
     * @param post
     * @returns {Promise<Object>}
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
     * Executes an HTTP request to the action API and returns the error
     * stanza of the response body. Will fail if there is no error stanza.
     * This is intended as an easy way to test for expected errors.
     *
     * @param actionName
     * @param {Object} params
     * @param post
     * @returns {Promise<Object>}
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
     * @returns {Promise<Object>}
     */
    async loadTokens(ttypes) {
        const result = await this.action(
            'query',
            { meta: 'tokens', type: ttypes.join('|') },
        );

        this.tokens = result.query.tokens;

        // const session = this.req.jar.getCookie('default_session', cookiejar.CookieAccessInfo.All);
        // console.log(`loadTokens: user id ${this.userid}: ${JSON.stringify(this.tokens)} (session: ${session})`);

        return result.query.tokens;
    }

    /**
     * Returns the given token. If the token is not cached, it is requested
     * and then cached.
     *
     * @param {string} ttype
     * @returns {Promise<string>}
     */
    async token(ttype = 'csrf') {
        const tname = `${ttype}token`;
        if (this.tokens && this.tokens[tname]) {
            return this.tokens[tname];
        }

        // TODO: skip tokens we already have!
        const newTokens = (await this.action(
            'query',
            { meta: 'tokens', type: ttype },
        )).query.tokens;

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
     * @returns {Promise<Object>}
     */
    async login(username, password) {
        const result = await this.action(
            'login',
            {
                lgname: username,
                lgpassword: password,
                lgtoken: await this.token('login'),
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
     * @returns {Promise<Object>}
     */
    async edit(pageTitle, params) {
        const editParams = {
            title: pageTitle,
            text: 'Lorem Ipsum',
            comment: 'testing',
        };

        editParams.token = params.token || await this.token('csrf');

        const result = await this.action('edit', { ...editParams, ...params }, 'POST');
        assert.equal(result.edit.result, 'Success');

        return result.edit;
    }

    async getRevision(pageTitle, revid=0 ) {
        const params = {
            prop: 'revisions',
            rvslots: 'main',
            rvprop: 'ids|user|comment|content',
        };

        if (revid) {
            params.revids = revid;
        } else {
            params.titles = pageTitle;
            params.revlimit = 1;
        }

        const result = await this.action(
            'query',
            params
        );

        const pageid = Object.keys(result.query.pages)[0];
        const page = result.query.pages[pageid];
        return page.revisions[0];
    }

    /**
     * @param {Object} params
     * @returns {Promise<Object>}
     */
    async createAccount(params) {
        const defaults = {
            createtoken: params.token || await this.token('createaccount'),
            retype: params.retype || params.password,
            createreturnurl: config.base_uri,
        };

        const result = await this.action('createaccount', { ...defaults, ...params }, 'POST');
        assert.equal(result.createaccount.status, 'PASS');

        // TODO: wait for replication!
        return result.createaccount;
    }

    /**
     * @param {string} userName
     * @param {string[]} groups
     * @returns {Promise<Object>}
     */
    async addGroups(userName, groups) {
        const gprops = {
            user: userName,
            add: groups.join('|'),
            token: await this.token('userrights'),
        };

        const result = await this.action('userrights', gprops, 'POST');
        assert.isOk(result.userrights.added);

        // TODO: wait for replication!
        return result.userrights;
    }

    /**
     * Returns a promise that will resolve in no less than the given number of milliseconds.
     * @param {int} ms wait time in milliseconds
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, 1000));
    }
}

module.exports = {
    /**
     * API Client class.
     * Wraps a supertest Test, which emulates a superagent request.
     */
    Client,

    /**
     * Returns a unique title for use in tests.
     *
     * @param {string|null} namePrefix
     * @returns string
     */
    title: namePrefix => uniqid(namePrefix),
};
