'use strict';

const { assert, utils } = require('../index');

describe('path normalization', () => {
	const normalizePathCases = [
		[ 'foo', 'bar', '/foo/bar' ],
		[ 'foo', '', '/foo' ],
		[ 'foo', null, '/foo' ],
		[ '', 'bar', '/bar' ],
		[ null, 'bar', '/bar' ],
		[ '/', null, '/' ],
		[ '/', '/', '/' ],
		[ '', '', '/' ],
		[ '/foo/', '/bar/', '/foo/bar/' ],
		[ '/foo///moo//', '/bar///dar/', '/foo/moo/bar/dar/' ],
		[ '/foo///moo//', '', '/foo/moo' ]
	];

	for (const [ path, suffix, result ] of normalizePathCases) {
		it(`normalizePath(${ path }, ${ suffix }) should return ${ result }`, () => {
			assert.deepEqual(utils.normalizePath(path, suffix), result);
		});
	}

	const trimTrailingSlashCases = [
		[ 'foo', 'foo' ],
		[ '/foo/', '/foo' ],
		[ '/foo///', '/foo' ],
		[ '/foo///moo///', '/foo///moo' ],
		[ '/', '/' ],
		[ '', '' ]
	];

	for (const [ path, result ] of trimTrailingSlashCases) {
		it(`trimTrailingSlash(${ path }) should return ${ result }`, () => {
			assert.deepEqual(utils.trimTrailingSlash(path), result);
		});
	}

	const addLeadingSlashCases = [
		[ 'foo', '/foo' ],
		[ '/foo/', '/foo/' ],
		[ '///foo///', '///foo///' ],
		[ '/', '/' ],
		[ '', '/' ]
	];

	for (const [ path, result ] of addLeadingSlashCases) {
		it(`addLeadingSlash(${ path }) should return ${ result }`, () => {
			assert.deepEqual(utils.addLeadingSlash(path), result);
		});
	}

});
