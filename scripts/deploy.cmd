@echo off
chcp 65001

rem set KEY="C:\Users\Владимир\.ssh\id_rsa_valaam_ru"
set USER="valaam.ru@valaam.ru"
set REMOTE_FOLDER="/var/www/app.valaam.ru/data"


ssh %USER% "rm -rf %REMOTE_FOLDER%/app/*"
scp -r ./www/* %USER%:%REMOTE_FOLDER%/app/
ssh %USER% "find %REMOTE_FOLDER%/app/ -type d -exec chmod 4755 {} \;"

rem ssh -i %KEY% %USER% "rm -rf %REMOTE_FOLDER%/index.html %REMOTE_FOLDER%/service-worker.js %REMOTE_FOLDER%/icons/* %REMOTE_FOLDER%/assets/*"
rem scp -r -i %KEY% ./www/* %USER%:%REMOTE_FOLDER%/
rem ssh -i %KEY% %USER% "find %REMOTE_FOLDER%/icons/ %REMOTE_FOLDER%/assets/ -type d -exec chmod 4750 {} \;"
