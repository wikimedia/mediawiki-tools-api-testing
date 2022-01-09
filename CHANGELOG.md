## 1.5.0
* Run mocha tests in parallel
* Attempt to re-run createAccount when exceptions occur (https://phabricator.wikimedia.org/T199393)

## 1.3.0 / 2020-08-17
* Ability to add a display name in changetag creation utility function
* Run all job queue jobs after changetag creation to ensure changes have propagated

## 1.2.0 / 2020-06-22
* Add utility function in action API for creating change tags.

## 1.1.0 / 2020-06-09
* Removed tests for MediaWiki core action API and REST API.
* Added clientFactory for constructing different clients that share a cookie jar.
* Updated eslint rules
