#!/bin/bash
# Rebuild and diff every rendered page against the phase-1 baseline snapshot.
SNAP="${SNAP:-/private/tmp/claude-501/-Users-albertvolkman-Sites-studiosayso-com/71b8c700-f832-43db-8ebc-270b477d4bc8/scratchpad/baseline}"
cd "$(dirname "$0")/.." || exit 1
npm run build >/dev/null 2>&1 || { echo "BUILD FAILED"; npm run build 2>&1 | tail -20; exit 1; }
d=$(diff -rq "$SNAP/_site" _site 2>&1 | grep -v '^Only in _site' )
if [ -z "$d" ]; then echo "IDENTICAL — all $(find _site -name '*.html'|wc -l|tr -d ' ') pages match baseline"; else echo "$d"; fi
