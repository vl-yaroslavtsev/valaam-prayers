@echo off
chcp 65001

set USER="valaam.ru@valaam.ru"
set REMOTE_FOLDER="/var/www/app.valaam.ru/data"


ssh %USER% "rm -rf %REMOTE_FOLDER%/app/*"
scp -r ./www/* %USER%:%REMOTE_FOLDER%/app/
ssh %USER% "find %REMOTE_FOLDER%/app/ -type d -exec chmod 4755 {} \;"
