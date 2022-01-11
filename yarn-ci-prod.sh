#!/bin/bash

set +e
rm -rf node_modules/
yarn install --non-interactive --production  --frozen-lockfile

