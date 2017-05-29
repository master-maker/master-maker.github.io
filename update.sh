#!/bin/sh
GIT_COMMIT_REV=$(git rev-parse HEAD);

if [ "$?" -ne 0 ]; then
  echo "Error getting git commit hash";
  exit -1;
fi

echo "Git commit: $GIT_COMMIT_REV";

echo "Calling Travis...";

body="{\"request\":{\"message\":\"triggered from content at $GIT_COMMIT_REV\",\"branch\":\"src\"}}";

curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Travis-API-Version: 3" \
  -H "Authorization: token $TRAVIS_API_TOKEN" \
  -d "$body" \
  https://api.travis-ci.org/repo/master-maker%2Fmaster-maker.github.io/requests

if [ "$?" -ne 0 ]; then
  echo "Failed to connect to Travis";
  exit -1;
fi
