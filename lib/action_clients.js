'use strict';

const { assert } = require('./assert');
const Client = require('./actionapi');
const utils = require('./utils');
const config = require('./config')();
const wiki = require('./wiki');

const singletons = {};
let cachedTags = {};

module.exports = {

	/**
	 * Add tag to database if not already added.
	 *
	 * @param {string} tag name
	 * @param {string} display display text for tag. Affects new tags, will not update existing tag
	 * @param {boolean} force try and create the tag regardless of what is already on the server
	 * @return {Promise<string>} tag name
	 */
	async makeTag(tag, display, force = false) {
		if (!force && cachedTags[tag]) {
			return tag;
		}
		const root = await this.root();
		let existingTags = {};
		if (!force) {
			const tagList = await root.list('tags', { tglimit: 50, tgprop: 'displayname' });
			existingTags = tagList.reduce((obj, row) => {
				obj[row.name] = true;
				return obj;
			}, {});
		}
		if (!existingTags[tag]) {
			const allowedErrors = (force ? [ 'tags-create-already-exists' ] : []);
			const { managetags } = await root.actionWithErrors('managetags', {
				operation: 'create',
				tag,
				token: await root.token()
			}, true, allowedErrors);
			if (!force) {
				assert.isOk(managetags.tag);
				if (display) {
					const { param_text: summary } = await root.edit(`MediaWiki:tag-${ tag }`, { text: display });
					assert.deepEqual(display, summary);
				}
			}
			// We don't really need to run all jobs, but we do need to wait
			// for replication.
			await wiki.runAllJobs();
		}
		cachedTags = { ...existingTags };
		return tag;
	},

	/**
	 * Delete a tag if it exists.
	 *
	 * @param tag
	 * @returns {Promise<Object>}
	 */
	async deleteTag(tag) {
		const root = await this.root();
		const response = await root.actionWithErrors('managetags', {
			operation: 'delete',
			tag,
			token: await root.token()
		}, true, [ 'tags-delete-not-found' ]);

		// We don't really need to run all jobs, but we do need to wait
		// for replication.
		await wiki.runAllJobs();
		return response;
	},

	async root() {
		if (singletons.root) {
			return singletons.root;
		}

		const root = new Client();
		await root.login(config.root_user.name,
			config.root_user.password);

		await root.loadTokens(['createaccount', 'userrights', 'csrf']);

		const rightsToken = await root.token('userrights');
		assert.notEqual(rightsToken, '+\\');

		singletons.root = root;
		return root;
	},

	async user(name, groups = [], tokens = ['csrf'], blocked = false) {
		if (singletons[name]) {
			return singletons[name];
		}

		// TODO: Use a fixed user name for Alice. Works only on a blank wiki.
		let uname = utils.title(name);
		const passwd = utils.uniq();
		const root = await this.root();
		const client = new Client();

		const account = await root.createAccount({ username: uname, password: passwd });
		uname = account.username;

		if (groups.length) {
			// HACK: This reduces the chance of race conditions due to
			// replication lag. For the proper solution, see T230211.
			await wiki.runAllJobs();

			const groupResult = await root.addGroups(uname, groups);
			assert.sameMembers(groupResult.added, groups);
		}

		if (blocked) {
			const blockResult = await root.action('block', {
				user: uname,
				reason: 'Set up blocked user',
				token: await root.token()
			}, 'POST');
			assert.exists(blockResult.block);
		}

		await client.account(uname, passwd);

		if (tokens.length) {
			await client.loadTokens(tokens);
		}

		singletons[name] = client;
		return client;
	},

	async alice() {
		return this.user('Alice');
	},

	async bob() {
		return this.user('Bob');
	},

	async blockedUser() {
		return this.user('Blocked user', [], ['csrf'], true);
	},

	async mindy() {
		return this.user('Mindy', ['sysop'], ['userrights', 'csrf']);
	},

	async robby() {
		return this.user('Robby', ['bot']);
	},

	getAnon() {
		return new Client();
	}
};
