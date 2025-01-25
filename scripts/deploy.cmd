@echo off
chcp 65001

set KEY="C:\Users\Владимир\.ssh\id_rsa_valaam"
set REMOTE="valaam_vladimir.ya@valaam.ru"

ssh -i %KEY% %REMOTE% "rm -rf /pub/home/valaam/htdocs.molitvoslov/app/*"
scp -r -i %KEY% ./www/* %REMOTE%:/pub/home/valaam/htdocs.molitvoslov/app/
ssh -i %KEY% %REMOTE% "find /pub/home/valaam/htdocs.molitvoslov/app/ -type d -exec chmod 4750 {} \;"