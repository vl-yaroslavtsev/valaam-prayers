@echo off
chcp 65001

set USER="valaam.ru@valaam.ru"
set REMOTE_FOLDER="/var/www/app.valaam.ru/data"


ssh %USER% "rm -rf %REMOTE_FOLDER%/webview/*"
scp -r ./www/* %USER%:%REMOTE_FOLDER%/webview/
ssh %USER% "find %REMOTE_FOLDER%/webview/ -type d -exec chmod 4755 {} \;"
