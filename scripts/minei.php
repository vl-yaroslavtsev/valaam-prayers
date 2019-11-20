<?php
require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/modules/main/include/prolog_before.php");
set_time_limit(0);
/* @noinspection PhpStatementHasEmptyBodyInspection */
while(ob_end_flush());

use \Bitrix\Main\Error;
use \Bitrix\Main\Result;

define("NO_KEEP_STATISTIC", true);

define('AZBYKA_MINEI_URL', 'https://azbyka.ru/otechnik/Pravoslavnoe_Bogosluzhenie/');
define('BX_IBLOCK_WORSHIP', 28);
define('BX_WORSHIP_SECTION_GREEN_MINEI', 1035);
define('BX_PROP_SLAVONIC_TEXT', 'SLAVONIC_TEXT');

header('Content-Type: text/plain', true);

if(!\Bitrix\Main\Loader::includeModule("iblock"))
{
	echo("Невозможно подключить модуль iblock!");
	exit;
}

$http = new Bitrix\Main\Web\HttpClient();
$dom = new DOMDocument;
$el = new CIBlockElement;

$url = 'mineja-avgust/';//'mineja-dekabr/'; //'mineja-nojabr-grazhdanskim-shriftom/';
$date = new DateTime('2019-08-02');
$endDate = new DateTime('2019-08-31');
$cntAdded = 0;

while ($date <= $endDate) {
	
	$res = getMinei($url . $date->format('d'));
	if (!$res->isSuccess()) {
		print("Не удалось получить минею за дату $date");
		die();
	}
	$minei = $res->getData();
	
	foreach($minei as $key => $m) {
		$m['date'] = $date->format('md');
		$m['sort'] = 500 + $key * 100;
		
		$res = bxAddMinei($m);
		if (!$res->isSuccess()) {
			print("Не удалось получить минею за дату $date");
			die();
		}
		$cntAdded = $cntAdded + $res->getData()['count'];
	}
	
	$date->add(new DateInterval("P1D"));
}
print("Добалено $cntAdded миней.");

/**
 * Добавляем в битрикс святого или икону
 * @param $item
 * @return Result
 * @throws Exception
 */
function bxAddMinei($item) {
    global $el;
	$res = new Result();

    //print_r($item);
    //return $res;
    if ( !$item['title'] && !$item['text']) return $res;

    $arFields = Array(
        "IBLOCK_SECTION_ID" => bxGetSIdByCode($item['date']),
        "IBLOCK_ID"      => BX_IBLOCK_WORSHIP,
        "NAME"           => $item['title'],
        "ACTIVE"         => "Y",            // активен
        "SORT"			 => $item['sort']
    );

    if(!$id = $el->Add($arFields)) {
        $res->addError(new Error("Не удалось добавить элемент минеи {$item['title']}: {$el->LAST_ERROR} "));
        return $res;
    }
	CIBlockElement::SetPropertyValues($id , BX_IBLOCK_WORSHIP, $item['text'], BX_PROP_SLAVONIC_TEXT);
	
	$res->setData(['count' => 1]);
	return $res;
}

/**
 * Получаем ID разела минеи по дате
 * @param string|DateTime $date in format YYYY-MM-DD
 * @return int section Id
 */
function bxGetSIdByCode($code) {
    $sectionId = 0;

    $res = CIBlockSection::GetList(
        ['ID' => 'DESC'],
        [
            'IBLOCK_ID' => BX_IBLOCK_WORSHIP,
			'IBLOCK_SECTION_ID' => BX_WORSHIP_SECTION_GREEN_MINEI,
            'CODE' => $code
        ],
        false,
        ['ID', 'NAME', 'CODE']
    );

    if($ob = $res->GetNext()){
        $sectionId = $ob['ID'];
    }

    return $sectionId;
}

/**
 * Получаем текст минеи по определенному урл
 * @param $url
 * @return Array
 */
function getMinei($url) {
	global $http, $dom;
	
	$res = new Result();
	$url = AZBYKA_MINEI_URL . $url;
	
	if(false === $resp = $http->get($url)) {
		$res->addError(new Error("Ошибка загрузки c $url"));
        return $res;
	}
	
	$resp = str_replace(['</i><i>', '</b><b>'], '', $resp);
	
	$dom->loadHTML($resp);
	$xpath = new DomXPath( $dom );
	$nodes = $xpath->query("//div[@id='selectable-content']//h2[@class='text-center']");

	$data = [];
	foreach( $nodes as $node ) {
		$worship = [];
		$worship['title'] = trim(preg_replace(['/\s+/', '/В то́йже день/'], [' ', ''], $node->textContent));
		
		$text = $node->nextSibling;
		//$worship['old_text'] = $text->ownerDocument->saveHTML($text);
		
		$spans = $xpath->query(".//span[@class='color-red']", $text);
		foreach( $spans as $span ) {
			$value = trim(str_replace(chr(194).chr(160), ' ', $span->nodeValue));
			
			if (strpos($value, '**') === 0 ) continue;
			$span->nodeValue = str_replace($value, '**' . $value . '**', $span->nodeValue);
		}
		
		$bolds = $xpath->query(".//b", $text);
		foreach( $bolds as $bold  ) {
			$value = trim(str_replace(chr(194).chr(160), ' ', $bold->nodeValue));

			if (strpos($value, '**') === 0 ) continue;
			$bold->nodeValue = str_replace($value, '**' . $value . '**', $bold->nodeValue);
		}
		
		$italics = $xpath->query(".//i", $text);
		foreach( $italics  as $italic ) {
			$italic->nodeValue = '_' . trim($italic->nodeValue) . '_';
		}
		
		$worship['text'] = HTMLToTxt(
			$text->ownerDocument->saveHTML($text),
			"",
			[
				'/<a .*?<\/a>/',
				'/src="[^"]*"/'
			],
			false
		);
		
		$data[] = $worship;
	}
	
	$res->setData($data);
	return $res;
}

?>

  