<?php
require($_SERVER["DOCUMENT_ROOT"] . "/bitrix/modules/main/include/prolog_before.php");

set_time_limit(0);
/* @noinspection PhpStatementHasEmptyBodyInspection */
while(ob_end_flush());

use \Bitrix\Main\Error;
use \Bitrix\Main\Result;

define("NO_KEEP_STATISTIC", true);

define('AZBYKA_API_URL', 'https://azbyka.ru/days/api');
define('AZBYKA_IMG_URL', 'https://azbyka.ru/days/assets/img');

define('BX_IBLOCK_SAINTS', 34);
define('BX_IBLOCK_WORSHIP', 28);
define('BX_SECTION_PRAYERS_TO_SAINTS', 864);
define('BX_SECTION_PRAYERS_TO_ICONS', 860);

define('BX_SECTION_AKATHIST_TO_ICONS', 903);
define('BX_SECTION_AKATHIST_TO_SAINTS', 902);

define('BX_SECTION_СANON_TO_SAINTS', 886);

define('DATA_TYPE_SAINTS', 'saints');
define('DATA_TYPE_ICONS', 'ikons');
define('DATA_TYPE_HOLIDAYS', 'holidays');
define('DATA_TYPE_ALL', 'all');

define('PLURAL_TYPE_NONE', 0);
define('PLURAL_TYPE_SINGLE', 1);
define('PLURAL_TYPE_PLURAL', 2);
//define('GOOGLE_API_KEY', 'AIzaSyDxi_dlnHrXcv3gzmmzeJgH01dpjMPfWvw');

header('Content-Type: text/plain', true);

if(!\Bitrix\Main\Loader::includeModule("iblock"))
{
	echo("Невозможно подключить модуль iblock!");
	exit;
}

$http = new Bitrix\Main\Web\HttpClient();
$el = new CIBlockElement;


$str = '<img src="images/65464-1.jpg" alt="" />';
$re = '~<img([^>]*) src="([^"]*)"([^>]*)>~';
$replace = '<img$1 data-src="$2" class="lazy"$3>';
print preg_replace($re, $replace, $str);




// countSaintsWithProp ($prop = 'MINEA');

//$minCode = '20181015';
//$maxCode = '20191014';
//updateNotExistImg('2019-10-15', '2019-01-01');

//die();

//updatePrayers();

//linkWorshipToSaint(BX_SECTION_PRAYERS_TO_SAINTS,  'PRAYERS');
//clearWorshipCode(BX_SECTION_PRAYERS_TO_SAINTS);

//linkWorshipToSaint(BX_SECTION_PRAYERS_TO_ICONS, 'PRAYERS');
//clearWorshipCode(BX_SECTION_PRAYERS_TO_ICONS);

//countSaintsWithProp ('AKATHIST');

//updateWorshipIcons(BX_SECTION_AKATHIST_TO_ICONS);
//printSaintGenTitles();

//linkWorshipToSaint(BX_SECTION_AKATHIST_TO_ICONS, 'AKATHIST');
//countSaintsWithProp ('AKATHIST');
//clearWorshipCode(BX_SECTION_AKATHIST_TO_ICONS);

//countSaintsWithProp ('AKATHIST');

//clearWorshipCode(BX_SECTION_AKATHIST_TO_SAINTS);
//updateWorshipSaints(BX_SECTION_AKATHIST_TO_SAINTS, 'Акафист');

//preg_match_all('/(?<!^)[A-ZА-ЯЁ][a-zа-яё]*/u', "Акафист святому праведному Иоанну, пресвитеру Кронштадтскому, чудотворцу", $matches);
//print_r($matches);


//countSaintsWithProp ('AKATHIST'); //134

//linkWorshipToSaint(BX_SECTION_AKATHIST_TO_SAINTS, 'AKATHIST');
//countSaintsWithProp ('AKATHIST');
//clearWorshipCode(BX_SECTION_AKATHIST_TO_SAINTS);

//updateWorshipSaints(BX_SECTION_СANON_TO_SAINTS, 'Канон');

//countSaintsWithProp ('CANON'); //28
//linkWorshipToSaint(BX_SECTION_СANON_TO_SAINTS, 'CANON');
//countSaintsWithProp ('CANON'); //28
//clearWorshipCode(BX_SECTION_СANON_TO_SAINTS);


function printSaintGenTitles() {

    /**
     * Получаем имя святого в родительном падеже
     * @param array $item
     * @return string
     */
    function getGenTitle($item) {
        $title = $item['title_genitive'] ?: $item['title'];
        $title = preg_split("/[\s,]+/", $title)[0];
        $title = preg_replace('/\x{0301}/u', '', $title);

        return $title;
    }

    $date = new DateTime('2019-01-01');
    $endDate = new DateTime('2020-01-01');
    $titles = [];
    $cnt = 0;

    while ($date <= $endDate) {
        $formatDate = $date->format('Y-m-d');

        $res = getSaints($date, DATA_TYPE_SAINTS);
        if (!$res->isSuccess()) {
            print("Не удалось получить праздники/святых/иконы за дату $formatDate");
            return;
        }

        $items = $res->getData();

        foreach ($items as $item) {
            $title = getGenTitle($item);
            $cnt++;

            if (in_array($title, $titles))
                continue;

            $titles[] = $title;
        }

        $date->add(new DateInterval("P1D"));
    }

    sort($titles);

    print(implode("\n", $titles));

    print sprintf("\n\nОбработано святых %s, уникальных имен: %s\n", $cnt, count($titles));
}

function countSaintsWithProp ($prop = 'PRAYERS') {
    $res = CIBlockElement::GetList(
        ['ID' => 'ASC'],
        [
            'IBLOCK_ID' => BX_IBLOCK_SAINTS,
            "!PROPERTY_$prop"  => false
        ],
        false,
        false,
        ['ID', 'CODE', 'NAME', 'PROPERTY_PRAYERS']
    ); // 419 штук

    $count = 0;
    while ($item = $res->Fetch()) {
        print_r($item);
        $count++;
    }
    print("Количество святых с PROPERTY_$prop: $count\n");
}

function linkWorshipToSaint($sectionId = BX_SECTION_AKATHIST_TO_ICONS, $propId = 'AKATHIST') {
	$res = CIBlockElement::GetList(
		['ID' => 'ASC'],
		[
			'IBLOCK_ID' => BX_IBLOCK_WORSHIP,
			'IBLOCK_SECTION_ID' => $sectionId,
			'!CODE' => false,
		],
		false,
		false,
		['ID', 'CODE', 'NAME']
	);

	$cntUpdated = 0;
	while ($worship = $res->Fetch()) {

		$saintXmlIds = explode(';', $worship['CODE']);

		foreach($saintXmlIds as $saintXmlId) {
			$saint = bxGetSaintByXmlId($saintXmlId);

			$propValue = $saint["PROPERTY_${propId}_VALUE"];

			if (is_array($propValue)) {
				$propValue[] = $worship['ID'];
			} else {
				$propValue = $worship['ID'];
			}

			CIBlockElement::SetPropertyValues($saint['ID'], $saint['IBLOCK_ID'], $propValue, $propId);
			$cntUpdated++;
		}
	}

	print("Добавлено привязок $cntUpdated\n");
}

function clearWorshipCode($sectionId = BX_SECTION_PRAYERS_TO_SAINTS) {
    global $el;

    $res = CIBlockElement::GetList(
        ['ID' => 'ASC'],
        [
            'IBLOCK_ID' => BX_IBLOCK_WORSHIP,
            'IBLOCK_SECTION_ID' => $sectionId,
            '!CODE' => false,
        ],
        false,
        false,
        ['ID', 'CODE', 'NAME']
    );
    $cntUpdated = 0;
    while ($prayer = $res->Fetch()) {
        $arFields = [
            'CODE' => false,
            "MODIFIED_BY" => $prayer['MODIFIED_BY'],
            "TIMESTAMP_X" => false
        ];
        $el->Update( $prayer['ID'], $arFields);
        $cntUpdated++;
    }
    print("Изменено $cntUpdated");
}


/**
 * Убираем в массиве дубликаты по id
 * @param array $array Массив с элементами вида ['id' => 123, ...]
 * @return array
 */
function arrayUniqueById($array) {
    $ids = array_column($array, 'id');
    $ids = array_unique($ids);
    $array = array_filter($array, function ($value, $key) use ($ids) {
        return in_array($key, array_keys($ids));
    }, ARRAY_FILTER_USE_BOTH);

    return $array;
}

function updatePrayersSaints() {
    global $el;

    /**
     * Форматируем название святого для поиска
     * @param array $item
     * @param bool $strip_accent
     * @return string
     */
    function getSearchTitle($item, $strip_accent = false) {
        $title = $item['title'];
        $title = preg_match('~^[\w\x{0301}]+\s*[\w\x{0301}]+~u',$title, $m ) ? $m[0] : $title;
        $title = $title . ' ' . $item['type_of_sanctity_complete'];
        if ($strip_accent) {
            $title = preg_replace('/\x{0301}/u', '', $title);
        }
        return '%' . $title . '%';
    }

    // 326 тропарей
    $date = new DateTime('2019-01-01');
    $endDate = new DateTime('2020-01-01');
    $searchedSaints = [];
    $cntFound = 0;

    while ($date <= $endDate) {
        $formatDate = $date->format('Y-m-d');
        //print("\n\n$formatDate\n");

        $res = getSaints($date, DATA_TYPE_SAINTS);
        if (!$res->isSuccess()) {
            print("Не удалось получить праздники/святых/иконы за дату $formatDate");
            return;
        }

        $items = $res->getData();

        foreach ($items as $item) {
            $xmlId = getXmlId($item);

            if (!$item['taks'] || count($item['taks']) === 0)
                continue;

            if (in_array($xmlId, $searchedSaints))
                continue;

            $searchedSaints[] = $xmlId;

            $res = CIBlockElement::GetList(
                ['ID' => 'ASC'],
                [
                    'IBLOCK_ID' => BX_IBLOCK_WORSHIP,
                    'IBLOCK_SECTION_ID' => BX_SECTION_PRAYERS_TO_SAINTS,
                    'CODE' => false,
                    [
                        "LOGIC" => "OR",
                        ['NAME' => getSearchTitle($item)],
                        ['NAME' => getSearchTitle($item, true)],
                    ],
                ],
                false,
                false,
                ['ID', 'NAME']
            );

            // данный элемент у нас уже есть
            if ($bxEl = $res->Fetch()) {
                print_r([
                    'bx' => $bxEl,
                    'xmlId' => $xmlId,
                    'title' => getTitle($item),
                    'taks' => count($item['taks'])
                ]);


                $arFields =    [
                    "MODIFIED_BY"    => $bxEl['MODIFIED_BY'],
                    "TIMESTAMP_X"    => false,
                    "CODE" 			 => $xmlId,
                ];

                if(!$el->Update( $bxEl['ID'], $arFields)) {
                    print("Не удалось изменить элемент {$bxEl['ID']} для святого {$item['title']}: {$el->LAST_ERROR} ");
                    return;
                }
                $cntFound++;
            }
        }

        $date->add(new DateInterval("P1D"));
    }

    print sprintf("Обработано святых %s, найдено святых: %s\n", count($searchedSaints), $cntFound);
}

function updateWorshipIcons($sectionId = BX_SECTION_PRAYERS_TO_ICONS) {
    global $el;

    // 326 тропарей
    $date = new DateTime('2019-01-01');
    $endDate = new DateTime('2020-01-01');
    $searched = [];
    $cntFound = 0;

    while ($date <= $endDate) {
        $formatDate = $date->format('Y-m-d');
        //print("\n\n$formatDate\n");

        $res = getSaints($date, DATA_TYPE_ICONS);
        if (!$res->isSuccess()) {
            print("Не удалось получить праздники/святых/иконы за дату $formatDate");
            return;
        }

        $items = $res->getData();

        foreach ($items as $item) {
            $xmlId = getXmlId($item);

            if (in_array($xmlId, $searched))
                continue;

            $searched[] = $xmlId;

            $res = CIBlockElement::GetList(
                ['ID' => 'ASC'],
                [
                    'IBLOCK_ID' => BX_IBLOCK_WORSHIP,
                    'IBLOCK_SECTION_ID' => $sectionId,
                    'CODE' => false,
                    'NAME' => '%' . $item['clean_title'] . '%'
                ],
                false,
                false,
                ['ID', 'NAME']
            );

            // данный элемент у нас уже есть
            if ($bxEl = $res->Fetch()) {
                print_r([
                    'bx' => $bxEl,
                    'xmlId' => $xmlId,
                    'title' => getTitle($item),
                    'taks' => count($item['taks'])
                ]);

                $arFields =    [
                    "MODIFIED_BY"    => $bxEl['MODIFIED_BY'],
                    "TIMESTAMP_X"    => false,
                    "CODE" 			 => $xmlId,
                ];

                if(!$el->Update( $bxEl['ID'], $arFields)) {
                    print("Не удалось изменить элемент {$bxEl['ID']} для иконы {$item['title']}: {$el->LAST_ERROR} ");
                    return;
                }
                $cntFound++;
            }
        }

        $date->add(new DateInterval("P1D"));
    }

    print sprintf("Обработано икон %s, найдено икон: %s\n", count($searched), $cntFound);
}

/**
 * Обновляем символьный код у акафистов и канонов святым
 * @param int $sectionId
 * @throws Exception
 */
function updateWorshipSaints($sectionId = BX_SECTION_AKATHIST_TO_SAINTS, $type = 'Акафист') {
	global $el;

	$date = new DateTime('2019-01-01');
	$endDate = new DateTime('2020-01-01');
	$searchedSaints = [];
	$searchedCaa = [];
	$cntFound = 0;

	while ($date <= $endDate) {
		$formatDate = $date->format('Y-m-d');
		//print("\n\n$formatDate\n");

		$res = getSaints($date, DATA_TYPE_SAINTS);
		if (!$res->isSuccess()) {
			print("Не удалось получить праздники/святых/иконы за дату $formatDate");
			return;
		}

		$items = $res->getData();

		foreach ($items as $item) {
			$xmlId = getXmlId($item);

			if (in_array($xmlId, $searchedSaints))
				continue;

			if (!$item['caa'] || count($item['caa']) === 0)
				continue;

			$caa = array_filter($item['caa'],  function ($item) use ($type) {
				return $item['type'] === $type;
			});

			if( !count($caa) )
				continue;

			$searchedSaints[] = $xmlId;


			foreach ($caa as $c) {

//				if (in_array($c['id'], $searchedCaa))
//					continue;

//				$searchedCaa[] = $c['id'];

//				$title = preg_replace('/(святому|святой)/i', '', $c['title']);
//				$title = preg_split("/[\s,\(|\)]+/", $title);
//				$title = implode(' ', [$title[0], $title[2], $title[3], $title[1]]);

				preg_match_all('/(?<!^)[A-ZА-ЯЁ][a-zа-яё]*/u', $c['title'], $matches);
				$title = implode(' ', $matches[0]);

//				print($title . ' - ' . $c['title'] . "\n");

				$res = CIBlockElement::GetList(
					['ID' => 'ASC'],
					[
						'IBLOCK_ID' => BX_IBLOCK_WORSHIP,
						'IBLOCK_SECTION_ID' => $sectionId,
//						'CODE' => false,
						'NAME' => '%' . $title . '%'
					],
					false,
					false,
					['ID', 'NAME', 'CODE']
				);

				// данный элемент у нас уже есть
				if ($bxEl = $res->Fetch()) {
					print_r([
//						'bxId' => $bxEl['ID'],
						'xmlId' => $xmlId,
						'saintTitle' => getTitle($item),
						'worshipTitle' => $bxEl['NAME'],
						'caaTitle' => $c['title'],
						'caa' => count($caa)
					]);

					$arFields = [
						"MODIFIED_BY"    => $bxEl['MODIFIED_BY'],
						"TIMESTAMP_X"    => false,
						"CODE" 			 => ($bxEl['CODE']  ? $bxEl['CODE'] . ';' : '') . $xmlId,
					];

					if(!$el->Update( $bxEl['ID'], $arFields)) {
						print("Не удалось изменить элемент {$bxEl['ID']} для святого {$item['title']}: {$el->LAST_ERROR} ");
						return;
					}
					$cntFound++;
				}
			}
		}

		$date->add(new DateInterval("P1D"));
	}

	print sprintf("Обработано святых %s, найдено акафистов/канонов: %s\n", count($searchedSaints), $cntFound);
}

/**
 * @param string $startDate
 * @param string $endDate
 * @throws Exception
 */
function updateNotExistImg($startDate, $endDate) {
    $startDate = new DateTime($startDate);
    $endDate = new DateTime($endDate);

    global $el;
    $cnt = 0;
    $cntReq = 0;
    $cntFound = 0;
    $cntImg = 0;
    $cntUpdated = 0;

    $res = CIBlockElement::GetList(
        ['CODE' => 'ASC'],
        [
            'IBLOCK_ID' => BX_IBLOCK_SAINTS,
            'DETAIL_PICTURE' => false,
            '>=CODE' => $startDate->format('Ymd'),
            '<=CODE' => $endDate->format('Ymd')],
        false,
        false,
        ['ID', 'NAME', 'CODE']
    );

    $saints = [];
    $date = null;

    while($item = $res->Fetch()) {
        $cnt++;

        if (!$date || ($date->format('Ymd') != $item['CODE'])) {
            $date = new DateTime($item['CODE']);

            $cntReq++;
            $result = getSaints($date);

            if (!$result->isSuccess()) {
                print("Не удалось получить праздники/святых/иконы за дату {$date->format('Y-m-d')}");
                die();
            }
            $saints = $result->getData();
        }

        $found = array_filter($saints, function ($saint) use ($item) {
            return mb_stristr( $item['NAME'], $saint['title']);
        });

        $item['FOUND'] = count($found);

        if ($item['FOUND']) {
            $cntFound++;
            $found = array_shift ($found);
            $img = getImg($found);

            $item['FOUND'] = [
                'id' => $found['id'],
                'title' => $found['title'],
                'img' => $img
            ];

            if ($img) {
                $cntImg++;

                if($el->Update(
                        $item['ID'], [
                            "DETAIL_PICTURE" => makeImgArray($img)
                        ]))
                    $cntUpdated++;

            }
        }

        print_r($item);

        //CIBlockElement::SetPropertyValues($item['ID'], BX_IBLOCK_PUBLISHING, $videoRedirId, 'VIDEO');
    }

    print("База: кол-во святых без картинок $cnt\n");
    print("Азбука: найдено святых $cntFound, найдено картинок $cntImg, кол-во запросов $cntReq\n");
    print("База: добавлено картинок к святым $cntUpdated\n");
}


function mb_ucfirst($string) {
    $string = mb_strtoupper(mb_substr($string, 0, 1)) . mb_substr($string, 1);
    return $string;
}

/**
 * Получаем сортировку в зависимости от приоритета
 * @param int $priority
 * @param string $type
 * @return int
 */
function getSorting($priority, $type) {
    if ($type === DATA_TYPE_ICONS) return 50000;
    if ($type === DATA_TYPE_HOLIDAYS) return 5;

	switch ($priority) {
        case 0:
            return 5;
		case 1:
			return 50;
		case 2:
			return 500;
		case 3:
			return 5000;
		case 4:
			return 50000;

		default:
			return 500;
	}
}

/**
 * Получаем json-данные
 * @param $url
 * @return \Bitrix\Main\Result
 */
function getJson($url) {
    global $http;
    $result = new Result();

    if(false === $resp = $http->get($url)) {
        $result->addError(new Error("Ошибка загрузки c $url"));
        return $result;
	}

    if(!$json = json_decode($resp, true)) {
        $result->addError(new Error("Ошибка парсинга данных c $url. $resp"));
    }

    $result->setData($json);

    return $result;
}

/**
 * Получить данные по святым/иконам/праздникам с азбуки за данную дату
 * @param DateTime $date
 * @param string $type
 * @return \Bitrix\Main\Result
 */
function getSaints($date, $type = DATA_TYPE_ALL)
{
    if ($type === DATA_TYPE_ALL) {
        $data = [];

        foreach ([DATA_TYPE_HOLIDAYS, DATA_TYPE_SAINTS, DATA_TYPE_ICONS] as $t) {
            $res = getSaints($date, $t);
            if (!$res->isSuccess()) return $res;
            $data = array_merge($data, $res->getData());
        }

        $res = new Result();
        $res->setData($data);
        return $res;
    }

    $pageUrl = sprintf(AZBYKA_API_URL . "/$type/%s.json", $date->format('Y-m-d'));
    $res = getJson($pageUrl);

    if (!$res->isSuccess()) return $res;

    $json = $res->getData();
    // Если нет данных, азбука отдает {"item": ""}
    if (count($json) > 0 && !$json[0])
        $json = [];

    $extra = [
        'type' => $type,
		'date' => $date
    ];
    $json = array_map(function ($item) use ($extra) {
        $item['extra'] = $extra;
        return $item;
    }, $json);
    $res->setData($json);

    return $res;
}

/**
 * Находит в $item картинку и возвращает ее урл
 * @param array $item
 * @return string|null
 */
function getImg($item) {
    $type = $item['extra']['type'];
    $urlType = $type;

    if ($type == DATA_TYPE_ICONS) $urlType = 'icons';

    $file = null;

    if (count($item['imgs']) > 0) {
        $imgProp = ($type == DATA_TYPE_ICONS ? 'img' : 'image');
        $file = AZBYKA_IMG_URL . "/$urlType/{$item['id']}/{$item['imgs'][0][$imgProp]}";
	}

    // Если фотки нет, пытаемся найти ее в описании
    if (!$file) {
    	$file = preg_filter ('/^.*<img\b[^>]*\bsrc="([^"]*)".*$/', '$1', $item['description']);
	}

	return $file;
}

/**
 * Получаем название святого/иконы
 * @param array $item
 * @return string
 */
function getTitle($item) {
    $type = $item['extra']['type'];

    if ($type === DATA_TYPE_ICONS)
        return 'Икона Богородицы ' . $item['title'];

    if ($type === DATA_TYPE_HOLIDAYS)
        return $item['title'];

    $typeOfSanctity = $item['sex'] === 'Женщина' ?
                        $item['type_of_sanctity_complete_female'] ?: $item['type_of_sanctity_complete'] :
                        $item['type_of_sanctity_complete'];

    return mb_ucfirst($typeOfSanctity) . ' ' .
            $item['title'] .
            ($item['church_title'] ? ', ' . $item['church_title'] : '');
}

/**
 * Возвращает массив описывающий файл-картинку. При необходимости конвертирует в jpeg
 * @param string $filename
 * @return array|null
 */
function makeImgArray($filename) {
    $imgArr = null;
	if (!$filename) return $imgArr;

	$imgArr = CFile::MakeFileArray($filename);

	if ($imgArr['type'] == 'image/png') {
		$src = imagecreatefrompng($imgArr['tmp_name']);
		imagejpeg($src, $filename = preg_replace('/png$/','jpg', $imgArr['tmp_name']),85);
		$imgArr = CFile::MakeFileArray($filename);

	} else if ($imgArr['type'] != 'image/jpeg') {
		$imgArr = null;
	}

    return $imgArr;
}

/**
 * Получаем главную дату святого
 * @param $item
 * @return DateTime|mixed
 * @throws Exception
 */
function getMainDate($item) {
    $dates = $item['dates'];

    if (!is_array($dates) || !count($dates))
        return $item['extra']['date'];

    usort($dates, function($a, $b) {
        if ($a['id'] === $b['id']) return 0;
        return ($a['id'] < $b['id']) ? -1 : 1;
    });
    $date = array_shift($dates)['calc_date'];

    return new DateTime($date);
}

/** Получаем текстовое представление описания святого/иконы Богодицы/праздника
 * @param $item array
 * @return string
 */
function getDescription($item) {
    $prayers = '';
    if (count($item['taks']) > 0) {
        $reduce = function($carry, $item)
        {
            $carry = $carry . '<p>' .
                $item['title']  .
                ($item['voice'] ? '<br>' . $item['voice'] : '') .
                $item['text'] .
                '</p>';
            return $carry;
        };

        $prayers = "<br><br>МОЛИТВЫ";
        $prayers = $prayers . array_reduce($item['taks'], $reduce);
    }

    $text = html_entity_decode(HTMLToTxt(
        $item['description'] . $prayers,
        "",
        [
            '/href="[^"]*"/',
            '/src="[^"]*"/',
            "/<p>См. так&shy;же\:(.*?)<\/p>/",
            "/<p>Ис&shy;точ&shy;ник\:(.*?)<\/p>/",
            '/<h3[^>]*>\s*Житие.*?<\/h3>/'
        ],
        false
    ));

    $text = preg_replace('/Полное житие/m',
        "\n\nПолное житие",
        $text
    );

    $text = preg_replace_callback(
        '/(Краткое|\nПолное) житие(.*?)\n/',
        function ($matches) {
            return mb_strtoupper($matches[0]);
        },
        $text
    );

	return $text;
}

/**
 * Получаем внешний код для святого/праздника/иконы
 * @param $item
 * @return string
 */
function getXmlId($item) {
    switch($item['extra']['type']) {
        case DATA_TYPE_HOLIDAYS:
            $t = 'h';
            break;

        case DATA_TYPE_SAINTS:
            $t = 's';
            break;

        case DATA_TYPE_ICONS:
            $t = 'i';
            break;

        default:
            $t = '';

    }

    return $t . $item['id'];
}

function bxGetSaintByXmlId($code) {
    $res = CIBlockElement::GetList(
        ['ID' => 'ASC'],
        [
            'IBLOCK_ID' => BX_IBLOCK_SAINTS,
            'XML_ID' => $code
        ],
        false,
        false,
        ['ID', 'IBLOCK_ID', 'NAME', 'MODIFIED_BY', 'TIMESTAMP_X',
            'PROPERTY_PRAYERS', 'PROPERTY_AKATHIST', 'PROPERTY_CANON', 'PROPERTY_MINEA']
    );

    // данный элемент у нас уже есть
    return $res->Fetch();
}

/**
 * Ищем святого в битриксе, который соответствует святому с азбуки ($item)
 * @param array $item
 * @return mixed
 */
function bxGetSaint($item){
    return bxGetSaintByXmlId(getXmlId($item));
}
?>

  