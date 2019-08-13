# MediaWiki Action API tests

This repo contains end-to-end integration tests for [MediaWiki's Action API](https://www.mediawiki.org/wiki/API).
The tests are implemented in JavaScript for node.js, using the
[supertest](https://www.npmjs.com/package/supertest)
HTTP testing library, the [Chai](https://www.npmjs.com/package/chai) assertion
library, and the [Mocha](https://www.npmjs.com/package/mocha) testing framework.

## Install
To run test API test suite, you need to have [node.js](https://nodejs.org/)
and [npm](https://www.npmjs.com/) installed.

Installation of the testing environment can then be done with npm:

    $ npm i

## Running Tests

To run tests, you need to have a MediaWiki installation to run them against.
Ideally, tests would run against an empty, freshly initialized wiki each time,
but tests should be written to also function when run against a wiki that
already has content from previous test runs and manual testing.

The recommended way to set up a wiki instance to test against is to spin up a
docker container that provides a wiki.
The **[MediaWiki-Docker-Dev](https://github.com/addshore/mediawiki-docker-dev)**
makes this simple, just follow the instructions provided in the readme there.
MediaWiki-Docker-Dev uses [docker-compose](https://docs.docker.com/compose/)
to provide all necessary services for MediaWiki, such as a database and caching.

### Configuration

The Action API test Suite needs some configuration that tells it how to access
the target wiki. This configuration is contained in the `config.json` file:

```json
{
  "base_uri": "http://default.web.mw.localhost:8080/mediawiki/api.php",
  "main_page": "Main_Page",
  "root_user": {
    "name": "Admin",
    "password": "dockerpass"
  }
}
```

The default values were chosen to "Just Work" with a default setup of
MediaWiki-Docker-Dev (see above).
If you have a custom setup, you need to provide the following configuration settings:

* `base_uri`: Full base URI of the MediaWiki installation to target.
* `main_page`: The name of the wiki's main page.
* `root_user`: Login credentials for a user that has bureaucrat privileges
(most importantly, the right to add users to groups to grant them privileged access).

**CAUTION:** The content of the wiki you are running the tests against will be
polluted with test content! Do not run tests against a wiki with valuable content.

**CAUTION:** Be careful about running tests against a wiki that is publicly
accessible.
Tests *should* be written to use randomized passwords for all accounts they
create, but there is no guarantee that no tests creates a privileged user with
a known or easy to guess password. Also, if your test wiki is publicly accessible,
be careful not to publish the `root_user` credentials, and to not use the default
credentials.
Even if the wiki itself doesn't have valuable content, having your test wiki
compromised may open you up to attacks if it shares a domain or host with a real
wiki.

### Running all tests
To run all tests containing in the test directory, simply type

    $ npm test

### Running specific tests
You can run individual test files or directories containing test files by
invoking Mocha directly and pointing it to the desired path:

    $ ./node_modules/.bin/mocha <test-file-or-dir> --timeout 0

For more information on running Mocha tests and controlling the output,
see https://mochajs.org/.
