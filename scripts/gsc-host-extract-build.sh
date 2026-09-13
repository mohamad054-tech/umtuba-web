#!/bin/bash
set -eu
REL=/opt/umtuba/production/releases/0431c65b-20260907123000
rm -rf "$REL"
mkdir -p "$REL"
python3 -c 'import zipfile; zipfile.ZipFile("/tmp/gsc-0431c65b.zip").extractall("/opt/umtuba/production/releases/0431c65b-20260907123000")'
test -f "$REL/package.json"
echo EXTRACT_OK
cd "$REL"
npm ci --include=dev
npx next build
echo BUILD_OK