chcp 65001
ssh -i "C:\\Users\\Владимир\\.ssh\\id_rsa_valaam" valaam_vladimir.ya@valaam.ru "rm -rf /pub/home/valaam/htdocs.molitvoslov/app/*"
scp -r -i "C:\\Users\\Владимир\\.ssh\\id_rsa_valaam" ./www/* valaam_vladimir.ya@valaam.ru:/pub/home/valaam/htdocs.molitvoslov/app/
ssh -i "C:\\Users\\Владимир\\.ssh\\id_rsa_valaam" valaam_vladimir.ya@valaam.ru "find /pub/home/valaam/htdocs.molitvoslov/app/ -type d -exec chmod 4750 {} \;"