@echo off
cls
git checkout -b NPM-Update
ncu -u && npm install
git add -A && git commit -m "NPM Update"
got push -u origin NPM-Update