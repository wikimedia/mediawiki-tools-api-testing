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
  "base_uri": "http://default.web.mw.localhost:8080/mediawiki/",
  "main_page": "Main_Page",
  "root_user": {
    "name": "Admin",
    "password": "dockerpass"
  },
  "secret_key": "",
  "extra_parameters": {
    "xdebug_session": "PHPSTORM"
  }
}
```

The default values were chosen to "Just Work" with a default setup of
MediaWiki-Docker-Dev (see above), you just have to supply the target wiki's
`$wgSecretKey` in the `secret_key` configuration option. `$wgSecretKey`
can be found in the wiki's LocalSettings.php - if you are using
MediaWiki-Docker-Dev, this file can be found under `config/mediawiki/`.

If you have a custom setup, you need to provide the following configuration settings:

* `base_uri`: Full base URI of the MediaWiki installation to target.
Must end with a slash (`/`).
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

### Resetting the target wiki
Before running tests, it's advisable to ensure a known state of the wiki the tests run against.
While tests should be written to be robust against pre-existing content, e.g. by randomizing all
resource names, a known base state is useful. Also, test runs tend to pollute the wiki a lot,
so a reset is bound to save space, even if not done for every test run.

The easiest way to achieve a known state of the wiki is to take a snapshot of that known state,
preferably right after installation, when the wiki contains just one page and one user, and then
loading that dump into the database before running tests. For convenience, two pairs of scripts are
supplied to achieve this, one pair for use with a local MediaWiki installation, and another pair
for a MediaWiki-Docker-Dev environment.

#### Local snapshots
If you have MediaWiki installed locally, you can use:

    $ bin/take-snapshot <name.tar> [db] [host]

This saves a snapshot of a wiki in the given tar file. The `[db]` parameter is the database name.
If not given, `"wiki"` is used, which is the default name proposed by the MediaWiki installer.
The `[host]` parameter allows the database host to be specified, in case it's not localhost.

    $ bin/medd-load-snapshot <name.tar> [db] [host]

This restores the snapshot in the given tar file. The tar file contains the name of the wiki
database the snapshot was taken from. If the `[db]` parameter is not given, the dump will be loaded
into that same database. The name of the database is also shown in the confirmation prompt.

Before you can use these scripts, you need to configure the location of your MediaWiki
installation in bin/local.env:

```
MW_DIR="../../mediawiki"
```

Set this to something like `/var/www/html/mediawiki/` or wherever you have installed MediaWiki.

#### MediaWiki-Docker-Dev snapshots
If you have your wiki instances managed by MediaWiki-Docker-Dev, you can use:

    $ bin/mwdd-take-snapshot <name.tar> [db]

This saves a snapshot of a wiki in the given tar file. The `[db]` parameter is the database name,
which is the name you gave your wiki when running the `addsite` script. If not given, `"default"`
is used, which is the name of the wiki pre-installed by MediaWiki-Docker-Dev.

    $ bin/mwdd-load-snapshot <name.tar> [db]

This restores the snapshot in the given tar file. The tar file contains the name of the wiki
database the snapshot was taken from. If the `[db]` parameter is not given, the dump will be loaded
into that same database. The name of the database is also shown in the confirmation prompt.

Before you can use these scripts, you need to configure the location of your MediaWiki-Docker-Dev
installation in bin/local.env:

```
MWDD_DIR="../../mediawiki-docker-dev"
```

Set this to something like `$HOME/opt/mediawiki-docker-dev/` or wherever you have installed
MediaWiki-Docker-Dev.
