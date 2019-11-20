<?php
require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/modules/main/include/prolog_before.php");
define("NO_KEEP_STATISTIC", true);
define("NOT_CHECK_PERMISSIONS", true);

set_time_limit(0);
/* @noinspection PhpStatementHasEmptyBodyInspection */
while(ob_end_flush());

use \Bitrix\Main\Error;
use \Bitrix\Main\Result;

header('Content-Type: text/plain', true);

spl_autoload_register(function ($name) {
	include_once $name . '.php';
});

$startDate = '2019-01-14'; //20180114
$endDate   = '2020-01-13'; //20190113 

if($_GET['start'] && $_GET['end']) {
	$startDate = $_GET['start'];
	$endDate   = $_GET['end']; 	

} else if($_GET['start'] && !$_GET['end']) {
	$startDate = $_GET['start'];
	$endDate   = $_GET['start']; 	

} else if ($_GET['year']) {
	$startDate = $_GET['year'] . '-01-14';
	$endDate   = ($_GET['year'] + 1) . '-01-13'; 

} else {
	$startDate = (new DateTime())->format('Y') . '-01-14';
	$endDate   = ((new DateTime())->format('Y') + 1) . '-01-13'; 
}

print("\nОбновляем календарь за даты c $startDate по $endDate\n");

print("\nДобавляем святых...\n");
$saints = new Saints();
$res = $saints->addForPeriod($startDate, $endDate);
if (!$res->isSuccess()) {
	print("Ошибка добавления святых: \n" . implode("\n", $res->getErrorMessages()));
	exit();
}
$stat = $res->getData();
print("Святые: получено {$stat['fetched']}, обновлено {$stat['updated']}, добавлено " . ($stat['added'] ?: 0) . "\n");
print("Молитвы: получено {$stat['prayer_fetched']}, уже есть {$stat['prayer_exist']}, добавлено " . ($stat['prayer_added'] ?: 0) . "\n");
print("Каноны: получено {$stat['canon_fetched']}, уже есть {$stat['canon_exist']}, добавлено " . ($stat['canon_added'] ?: 0) . "\n");
print("Акафисты: получено {$stat['akathist_fetched']}, уже есть {$stat['akathist_exist']}, добавлено " . ($stat['akathist_added'] ?: 0) . "\n");


print("\nДобавляем дни...\n");
$calendar = new Calendar();

$res = $calendar->addForPeriod($startDate, $endDate);
if (!$res->isSuccess()) {
	print("Ошибка добавления дней: \n" . implode("\n", $res->getErrorMessages()));
	exit();
}

$stat = $res->getData();
print("Дни: получено {$stat['fetched']}, добавлено " . ($stat['added'] ?: 0) . ", обновлено {$stat['updated']} \n");
print("Тропари, кондаки: добавлено " . ($stat['taks_added'] ?: 0) . ", обновлено " . ($stat['taks_updated'] ?: 0) . "\n");
print("Богослужебные указания: добавлено " . ($stat['bu_added'] ?: 0) . ", обновлено " . ($stat['bu_updated'] ?: 0) . ", не существует на patriarhia.ru: " . ($stat['bu_not_found'] ?: 0) . "\n");
print("Евангельские чтения: добавлено " . ($stat['er_added'] ?: 0) . ", обновлено " . ($stat['er_updated'] ?: 0) . "\n");
?>