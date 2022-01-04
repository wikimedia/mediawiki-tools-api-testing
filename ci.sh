#!/usr/bin/env bash

set +eu

TEST_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd $TEST_DIR

if [ -z "${QUIBBLE_APACHE-}" ]; then
  export API_TESTING_CONFIG_FILE=quibble.json
else
  export API_TESTING_CONFIG_FILE=quibble.apache.json
fi

npm install --no-package-lock
npm test
