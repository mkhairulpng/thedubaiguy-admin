#!/bin/bash
set -e
count=$(find api -type f -name '*.js' | wc -l | tr -d ' ')
if [ "$count" -gt 12 ]; then
  echo "ERROR: $count Vercel API functions detected. Hobby limit is 12."
  exit 1
fi
if [ "$count" -ne 1 ] || [ ! -f 'api/[...route].js' ]; then
  echo "ERROR: expected exactly one API function: api/[...route].js"
  exit 1
fi
node --check 'api/[...route].js'
node --check 'server/api/auth/login.js'
node --check 'server/api/auth/me.js'
node --check 'server/api/auth/_auth.js'
node --check 'server/api/analytics.js'
echo "OK: $count Vercel API function detected; Hobby function limit satisfied."
