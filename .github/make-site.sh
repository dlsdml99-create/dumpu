#!/usr/bin/env bash
# 다운로드 페이지(_site) 만들기: site/ + 아이폰·웹용 앱(web/ → _site/app/)
set -euo pipefail
v=$(grep -oP 'name="app-version" content="\K[0-9]+\.[0-9]+' web/index.html)
d=$(TZ=Asia/Seoul date +%Y.%m.%d)
rm -rf _site && mkdir -p _site/app
cp -r site/. _site/
cp -r web/. _site/app/
sed -i "s/{{VERSION}}/$v/g; s/{{DATE}}/$d/g" _site/index.html
if grep -q '{{' _site/index.html; then echo "::error::페이지에 채우지 못한 칸이 있어요"; exit 1; fi
echo "페이지 버전 v$v"
