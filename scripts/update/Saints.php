<?php
use \Bitrix\Main\Error;
use \Bitrix\Main\Result;
/**
 * Класс реализует обращение к апи Почты России для получения инфы о текущем
 * статусе посылки или наложенного платежа
 */
class Saints
{
	const AZBYKA_IMG_URL = 'https://azbyka.ru/days/assets/img';
	
	const BX_IBLOCK_SAINTS = 34;
	const BX_IBLOCK_WORSHIP = 28;

	const BX_SECTION_PRAYERS_TO_SAINTS = 864;
	const BX_SECTION_PRAYERS_TO_ICONS = 860;

	const BX_SECTION_CANON = 871;
	const BX_SECTION_CANON_TO_SAINTS = 886;
	const BX_SECTION_CANON_TO_ICONS = 2894;

	const BX_SECTION_AKATHIST = 901;
	const BX_SECTION_AKATHIST_TO_SAINTS = 902;
	const BX_SECTION_AKATHIST_TO_ICONS = 903;
	
	private $ibe;	
	private $az;

	/**
	 * @constructor
	 */
	public function __construct()
	{
		if(!\Bitrix\Main\Loader::includeModule("iblock"))
		{
			throw new Error("Невозможно подключить модуль iblock!");
			exit();
		}
				
		$this->ibe = new CIBlockElement();
		$this->az = new Azbyka();
	}
	
	public function __destruct()
	{ 
		$this->ibe = null;
		$this->az = null;
	}
	
	/** Получаем тропари, кондаки, молитвы святого/иконы Богодицы/праздника
	 * @param $item array
	 * @return string
	 */
	private function getTaks($item) {
		$res = '';
		
		if (count($item['taks']) == 0) return $res;
		
		$taks = $this->arrayUniqueById($item['taks']);
		
		$res = array_reduce($taks, function($carry, $item) {
			$carry = $carry . 
				'<p>**' .
					$item['title']  . 
					($item['voice'] ? ', ' . $item['voice'] : '') . 
				'**</p>' .
				str_replace(['Перевод:', '<em>', '</em>'], ['**Перевод:**', '_', '_'], $item['text']);
			return $carry;
		});

		$res = html_entity_decode(HTMLToTxt(
			$res, 
			"", 
			[
				'/href="[^"]*"/'
			],
			false
		));

		return $res;
	}

	/**
	 *  Форматируем каноны и акафисты
	 *  @param string $str
	 *  @return string
	 */
	private function formatCaa($str) {
		$str = str_replace(['</em><em>', '</strong><strong>'], '', $str);
		$str = preg_replace(
			[
				'/<h4[^>]*>/',
				'/<\/h4>/',
				'/<strong>/', 
				'/<\/strong>/', 
				'/<em>/', 
				'/<\/em>/'
			], 
			[
				'<p>**', 
				'**</p>', 
				'**', 
				'**', 
				'_', 
				'_'
			], 
			$str
		);
		$str = html_entity_decode(HTMLToTxt(
			$str, 
			"",
			[
				'/<a .*?<\/a>/',
				'/src="[^"]*"/'
			],
			false
		));
		
		return $str;
	}

	/** Получаем каноны и акафисты святого/иконы Богодицы/праздника
	 * @param array $item 
	 * @return array
	 */
	private function getCaa($item) {
		$caa = $item['caa'];
		if (!count($caa)) return [];
		
		$caa = $this->arrayUniqueById($caa);
		array_walk($caa, function(&$c, $key, $item) {
			$title = $c['title'];
			if ($c['type'] === 'Акафист' && $item['extra']['type'] === Azbyka::DATA_TYPE_SAINTS) {
				$title = preg_replace('/(святому|святой)\s*/i', '', $c['title']);
				$title = preg_split("/[\s\(|\)]+/", $title);
				$sanctity = $title[1];
				array_splice($title, 1, 1);
				$title = implode(' ', array_merge($title, [$sanctity]));
			} 
			else if ($c['type'] === 'Акафист' && $item['extra']['type'] === Azbyka::DATA_TYPE_ICONS) {
				$title = str_replace("Пресвятой Богородице ", '', $title);
			}
			else if ($c['type'] === 'Канон' && $item['extra']['type'] === Azbyka::DATA_TYPE_SAINTS) {
				$title = preg_replace('/(Канон|святому|святой)\s*/i', '', $c['title']);
				$title = preg_split("/[\s\(|\)]+/", $title);
				$sanctity = $title[0];
				array_splice($title, 0, 1);
				$title = implode(' ', array_merge($title, [$sanctity]));
			}
			else if ($c['type'] === 'Канон' && $item['extra']['type'] === Azbyka::DATA_TYPE_ICONS) {
				$title = str_replace("Пресвятой Богородице ", '', $title);
			}
			
			$c['title'] = $title;
			$c['saint_type'] = $item['extra']['type'];
			$c['saint_xml_id'] = $this->getXmlId($item);
			$c['text'] = $this->formatCaa($c['text']);
		}, $item);

		return $caa;
	}

	/**
	 * Убираем в массиве дубликаты по id
	 * @param array $array Массив с элементами вида ['id' => 123, ...]
	 * @return array
	 */
	private function arrayUniqueById($array) {
		$ids = array_column($array, 'id');
		$ids = array_unique($ids);
		$array = array_filter($array, function ($value, $key) use ($ids) {
			return in_array($key, array_keys($ids));
		}, ARRAY_FILTER_USE_BOTH);

		return $array;
	}

	/**
	 * Добавляем всех святых/иконы/праздники с азбуки за указанный период.
	 * Если святой/икона/праздник у нас уже есть, обновляем святого.
	 * А также добавляем молитвы, каноны и акафисты связанные с данным святым/иконой/праздником.
	 * @param string $startDate
	 * @param string $endDate
	 * @param string $type Тип праздник/икона/святой. По умолчанию добавляем все.
	 * @return Result
	 */
	public function addForPeriod($startDate, $endDate, $type = Azbyka::DATA_TYPE_ALL){
		$result = new Result();
		$date = new DateTime($startDate);
		$endDate = new DateTime($endDate);
		$stat = [];

		while ($date <= $endDate) {
			$formatDate = $date->format('Y-m-d');

			$res = $this->az->getSaints($date, $type);
			if (!$res->isSuccess()) {
				return $result->addErrors($res->getErrors());
			}
			
			$stat['fetched'] = $stat['fetched'] + count($items = $res->getData());
			foreach ($items as $item) {
				if (($res = $this->bxAddSaint($item))->isSuccess()) {
					$data = $res->getData();
					
					foreach ($data as $key => $value) {
						$stat[$key] = $stat[$key] + $value;
					}
					
				} else {
					return $result->addErrors($res->getErrors());
				}			 
			}			
			$date->add(new DateInterval("P1D"));
		}
		
		$result->setData($stat);
		return $result;
	}

	private function mb_ucfirst($string) {
		$string = mb_strtoupper(mb_substr($string, 0, 1)) . mb_substr($string, 1);
		return $string;
	}

	/**
	 * Получаем сортировку в зависимости от приоритета
	 * @param int $priority
	 * @param string $type
	 * @return int
	 */
	private function getSorting($priority, $type) {
		if ($type === Azbyka::DATA_TYPE_ICONS) return 50000;
		if ($type === Azbyka::DATA_TYPE_HOLIDAYS) return 5;

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
	 * Находит в $item картинку и возвращает ее урл
	 * @param array $item
	 * @return string|null
	 */
	private function getImg($item) {
		$type = $item['extra']['type'];
		$urlType = $type;

		if ($type == Azbyka::DATA_TYPE_ICONS) $urlType = 'icons';

		$file = null;

		if (count($item['imgs']) > 0) {
			$imgProp = ($type == Azbyka::DATA_TYPE_ICONS ? 'img' : 'image');
			$file = self::AZBYKA_IMG_URL . "/$urlType/{$item['id']}/{$item['imgs'][0][$imgProp]}";
		}

		// Если фотки нет, пытаемся найти ее в описании
		if (!$file) {
			$file = preg_filter ('/^.*<img\b[^>]*\bsrc="([^"]*)".*$/', '$1', $item['description']);
		}

		return $file;
	}

	/**
	 * Получаем ID разела святого по дате
	 * @param string|DateTime $date in format YYYY-MM-DD
	 * @return int section Id
	 */
	private function bxGetSIdByDate($date) {
		$sectionId = 0;

		if(!($date instanceof DateTime)) {
			try {
				$date = new DateTime($date);
			} catch (Exception $e) {
				return $sectionId;
			}
		}

		$res = CIBlockSection::GetList(
			['ID' => 'DESC'],
			[
				'IBLOCK_ID' => self::BX_IBLOCK_SAINTS,
				'CODE' => $date->format('md')
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
	 * Получаем молитвы святого/иконы/праздника
	 * @param array $item
	 * @return string
	 */
	private function getTaksTitle($item) {
		$type = $item['extra']['type'];

		$date = $this->getMainDate($item);
		$oldDate = $this->getMainDate($item)->sub(new DateInterval("P13D"));

		$dates = FormatDate('d F', $oldDate->getTimestamp()) . '/' . FormatDate('d F', $date->getTimestamp());	
		$dates = mb_strtolower($dates);
		
		if ($type === Azbyka::DATA_TYPE_ICONS)
			$res = $item['title'] . ' ' . $dates;
		
		else if ($type === Azbyka::DATA_TYPE_HOLIDAYS)
			$res = $item['title'] . ' ' . $dates;
		
		else if ($type === Azbyka::DATA_TYPE_SAINTS) {
			$typeOfSanctity = $item['sex'] === 'Женщина' ?
						$item['type_of_sanctity_complete_female'] ?: $item['type_of_sanctity_complete'] :
						$item['type_of_sanctity_complete'];
		
			$res = $this->mb_ucfirst($item['title']) . ' ' .
					$typeOfSanctity .
					($item['church_title'] ? ' ' . $item['church_title'] : '') .
					' ' . $dates;
		}
			
		return preg_replace('/\x{0301}/u', '', $res);
	}

	/**
	 * Получаем название святого/иконы
	 * @param array $item
	 * @return string
	 */
	private function getTitle($item, $for = 'saint') {
		$type = $item['extra']['type'];

		if ($type === Azbyka::DATA_TYPE_ICONS)
			return 'Икона Богородицы ' . $item['title'];

		if ($type === Azbyka::DATA_TYPE_HOLIDAYS)
			return $item['title'];
		
		$typeOfSanctity = $item['sex'] === 'Женщина' ?
							$item['type_of_sanctity_complete_female'] ?: $item['type_of_sanctity_complete'] :
							$item['type_of_sanctity_complete'];
		
		return $this->mb_ucfirst($typeOfSanctity) . ' ' .
				$item['title'] .
				($item['church_title'] ? ', ' . $item['church_title'] : '');
	}

	/**
	 * Возвращает массив описывающий файл-картинку. При необходимости конвертирует в jpeg
	 * @param string $filename
	 * @return array|null
	 */
	private function makeImgArray($filename) {
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
	private function getMainDate($item) {
		$dates = &$item['dates'];

		if (!is_array($dates) || !count($dates))
			return $item['extra']['date'];

		usort($dates, function($a, $b) {
			if (!$a['explanation'] && $b['explanation']) return -1;
			if ($a['explanation'] && !$b['explanation']) return 1;
			
			if (strpos ( $a['explanation'], 'мощей') !== false) return -1;
			if (strpos ( $b['explanation'], 'мощей') !== false) return 1;
			
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
	private function getDescription($item) {

		$text = html_entity_decode(HTMLToTxt(
			$item['description'], //. $prayers,
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
	private function getXmlId($item) {
		switch($item['extra']['type']) {
			case Azbyka::DATA_TYPE_HOLIDAYS:
				$t = 'h';
				break;

			case Azbyka::DATA_TYPE_SAINTS:
				$t = 's';
				break;

			case Azbyka::DATA_TYPE_ICONS:
				$t = 'i';
				break;

			default:
				$t = '';

		}

		return $t . $item['id'];
	}

	private function bxGetSaintByXmlId($code) {
		$res = CIBlockElement::GetList(
			['ID' => 'ASC'],
			[
				'IBLOCK_ID' => self::BX_IBLOCK_SAINTS,
				'XML_ID' => $code
			],
			false,
			false,
			[	
				'ID', 
				'IBLOCK_ID', 
				'NAME', 
				'MODIFIED_BY', 
				'TIMESTAMP_X',
				'PROPERTY_PRAYERS', 
				'PROPERTY_AKATHIST', 
				'PROPERTY_CANON', 
				'PROPERTY_MINEA'
			]
		);

		return $res->Fetch();
	}

	private function bxGetCaa($c) {
		$res = CIBlockElement::GetList(
			['ID' => 'ASC'],
			[
				'IBLOCK_ID' => self::BX_IBLOCK_WORSHIP,
				'SECTION_ID' => ($c['type'] === 'Акафист' ? self::BX_SECTION_AKATHIST : self::BX_SECTION_CANON), 
				'XML_ID' => ($c['type'] === 'Акафист' ? 'a' : 'c') . $c['id']
			],
			false,
			false,
			[	
				'ID', 
				'IBLOCK_ID', 
				'NAME', 
				'MODIFIED_BY', 
				'TIMESTAMP_X'
			]
		);

		return $res->Fetch();
	}

	/**
	 * Ищем святого в битриксе, который соответствует святому с азбуки ($item)
	 * @param array $item
	 * @return mixed
	 */
	private function bxGetSaint($item){
		return $this->bxGetSaintByXmlId($this->getXmlId($item));
	}

	private function bxGetTaksById($id) {
		if (!$id) return null;
		
		$res = CIBlockElement::GetList(
			['ID' => 'ASC'],
			[
				'IBLOCK_ID' => self::BX_IBLOCK_WORSHIP,
				'ID' => $id
			],
			false,
			false,
			['ID', 'IBLOCK_ID', 'NAME', 'MODIFIED_BY', 'TIMESTAMP_X', 'PROPERTY_SLAVONIC_TEXT']
		);

		// данный элемент у нас уже есть
		return $res->Fetch();
	}

	/**
	 * Добавление канона/акафиста для святого/иконы/праздника
	 * @param {Array} $c
	 * @return {Result}
	 */
	private function bxAddCaa($c) {
		$res = new Result();	
		$sectionId = self::BX_SECTION_CANON_TO_SAINTS;
		
		if ($c['type'] === 'Канон' && $c['saint_type'] === Azbyka::DATA_TYPE_SAINTS) {
			$sectionId = self::BX_SECTION_CANON_TO_SAINTS;
		}
		else if ($c['type'] === 'Акафист' && $c['saint_type'] === Azbyka::DATA_TYPE_SAINTS) {
			$sectionId = self::BX_SECTION_AKATHIST_TO_SAINTS;
		}
		else if ($c['type'] === 'Канон' && ($c['saint_type'] === Azbyka::DATA_TYPE_ICONS || $c['saint_type'] === Azbyka::DATA_TYPE_HOLIDAYS)) {
			$sectionId = self::BX_SECTION_CANON_TO_ICONS;
		}
		else if ($c['type'] === 'Акафист' && ($c['saint_type'] === Azbyka::DATA_TYPE_ICONS || $c['saint_type'] === Azbyka::DATA_TYPE_HOLIDAYS)) {
			$sectionId = self::BX_SECTION_AKATHIST_TO_ICONS;
		}
		
		$xmlId = ($c['type'] === 'Канон' ? 'c' : ($c['type'] === 'Акафист' ? 'a' : '')) . $c['id'];

		$arFields = [
			"IBLOCK_SECTION_ID" => $sectionId,
			"XML_ID"         => $xmlId,
			"IBLOCK_ID"      => self::BX_IBLOCK_WORSHIP,
			"NAME"           => $c['title'],
			"ACTIVE"         => "Y"            // активен
		];

		if(!($id = $this->ibe->Add($arFields))) {
			return $res->addError(new Error("Не удалось добавить канон/акафист {$c['title']}: {$this->ibe->LAST_ERROR} "));
		}
		CIBlockElement::SetPropertyValues($id, self::BX_IBLOCK_WORSHIP, $c['text'], 'SLAVONIC_TEXT');
		
		$res->setData(['count' => 1, 'id' => $id]);
		return $res;
	}

	/**
	 * Добавление тропаря, кондака, молитвы для святого/иконы/праздника
	 * @param {Array} $item
	 * @return {Result}
	 */
	private function bxAddTaks($item) {
		$res = new Result();
		$taks = $this->getTaks($item);
			
		if (!$taks) return $res;
		
		$type = $item['extra']['type'];
		$sectionId = self::BX_SECTION_PRAYERS_TO_SAINTS;
		
		if ($type === Azbyka::DATA_TYPE_ICONS || $type === Azbyka::DATA_TYPE_HOLIDAYS) {
			$sectionId = self::BX_SECTION_PRAYERS_TO_ICONS;
		}
		
		$arFields = [
			"IBLOCK_SECTION_ID" => $sectionId,
			"XML_ID"         => $this->getXmlId($item),
			"IBLOCK_ID"      => self::BX_IBLOCK_WORSHIP,
			"NAME"           => $this->getTaksTitle($item),
			"ACTIVE"         => "Y"            // активен
		];

		if(!($id = $this->ibe->Add($arFields))) {
			return $res->addError(new Error("Не удалось добавить молитвы для святого {$item['title']}: {$this->ibe->LAST_ERROR} "));
		}
		
		CIBlockElement::SetPropertyValues($id , self::BX_IBLOCK_WORSHIP, $taks, 'SLAVONIC_TEXT');
		
		$res->setData(['count' => 1, 'id' => $id]);
		
		return $res;
	}

	/**
	 * Добавляем в битрикс святого или икону
	 * @param $item
	 * @return Result
	 * @throws Exception
	 */
	private function bxAddSaint($item) {
		$res = new Result();
		$stat = [];
	
		// print_r($item);
		// return $res;
		if ( !$item['url'] && !$item['description']) return $res;

		$type = $item['extra']['type'];
		$date = $this->getMainDate($item);
		
		// Обновляем святого
		if($bxSaint = $this->bxGetSaint($item)) {
			$arFields =    [
				"MODIFIED_BY"       => $bxSaint['MODIFIED_BY'],
				"TIMESTAMP_X"       => false,
				"IBLOCK_SECTION_ID" => $this->bxGetSIdByDate($date),
				"CODE" 			    => $date->format('Ymd')
			];


			if(!$this->ibe->Update($bxSaint['ID'], $arFields)) {
				return $res->addError(new Error("Не удалось изменить элемент {$bxSaint['ID']} для святого {$item['title']}: {$this->ibe->LAST_ERROR} "));
			}
			
			$stat['updated'] = 1;
			$stat['id'] = $bxSaint['ID'];
		
		// Создаем святого
		} else {
			$arFields = [
				"IBLOCK_SECTION_ID" => $this->bxGetSIdByDate($date),
				"CODE" 			 => $date->format('Ymd'),
				"XML_ID"         => $this->getXmlId($item),
				"IBLOCK_ID"      => self::BX_IBLOCK_SAINTS,
				"NAME"           => $this->getTitle($item),
				"ACTIVE"         => "Y",            // активен
				"SORT"			 => $this->getSorting($item['priority'], $type),
				"DETAIL_TEXT"    => $this->getDescription($item)
			];

			if ($img = $this->getImg($item)) {
				$arFields["DETAIL_PICTURE"] = $this->makeImgArray($img);
			}

			if(!($id = $this->ibe->Add($arFields))) {
				$res->addError(new Error("Не удалось добавить элемент для святого {$item['title']}: {$this->ibe->LAST_ERROR} "));
				return $res;
			}

			$stat['added'] = 1;
			$stat['id'] = $id;
		}
			   
		if(!$bxSaint) 
			$bxSaint = $this->bxGetSaint($item);
		
		$taks = $this->getTaks($item);	
		//Связываем святого и молитву
		if ($taks) {
			$stat['prayer_fetched'] = 1;
		}
		
		if ($taks && !$bxSaint['PROPERTY_PRAYERS_VALUE']) {
			if(($resTaks = $this->bxAddTaks($item))->isSuccess()) {
				$bxTaksId = $resTaks->getData()['id'];
				CIBlockElement::SetPropertyValues($bxSaint['ID'] , $bxSaint['IBLOCK_ID'], $bxTaksId, 'PRAYERS');
				$stat['prayer_added'] = 1;
			} else {
				$res->addErrors($resTaks->getErrors());
			}
		} else if ($bxSaint['PROPERTY_PRAYERS_VALUE']) {
			$stat['prayer_exist'] = 1;
		}	
		
		$caa = $this->getCaa($item);
		$canons = [];
		$akathists = [];
		// связываем каноны/акафисты со святым
		foreach ($caa as $c) {
			if ($c['type'] === 'Канон') {
				$stat['canon_fetched'] = $stat['canon_fetched'] + 1;
			} else if ($c['type'] === 'Акафист') {
				$stat['akathist_fetched'] = $stat['akathist_fetched'] + 1;
			}
			
			if ($c['type'] === 'Канон' && !count($bxSaint['PROPERTY_CANON_VALUE'])) {
				if ($bxCaa = $this->bxGetCaa($c)) {
					$canons[] = $bxCaa['ID'];
				} 
				else if(($resCaa = $this->bxAddCaa($c))->isSuccess()) {
					$canons[] = $resCaa->getData()['id'];
					$stat['canon_added'] = $stat['canon_added'] + 1;
				} else {
					$res->addErrors($resCaa->getErrors());
				}
			}
			else if ($c['type'] === 'Акафист' && !count($bxSaint['PROPERTY_AKATHIST_VALUE'])) {
				if ($bxCaa = $this->bxGetCaa($c)) {
					$akathists[] = $bxCaa['ID'];
				} 
				else if(($resCaa = $this->bxAddCaa($c))->isSuccess()) {
					$akathists[] = $resCaa->getData()['id'];
					$stat['akathist_added'] = $stat['akathist_added'] + 1;
				} 
				else {
					$res->addErrors($resCaa->getErrors());
				}
			}
			else if (count($bxSaint['PROPERTY_CANON_VALUE'])) {
				$stat['canon_exist'] = $stat['canon_exist'] + 1;
			} 
			else if (count($bxSaint['PROPERTY_AKATHIST_VALUE'])) {
				$stat['akathist_exist'] = $stat['akathist_exist'] + 1;
			}
		}
		
		if (count($canons)) {
			CIBlockElement::SetPropertyValues($bxSaint['ID'], $bxSaint['IBLOCK_ID'], $canons, 'CANON');
		}
		
		if (count($akathists)) {
			CIBlockElement::SetPropertyValues($bxSaint['ID'], $bxSaint['IBLOCK_ID'], $akathists, 'AKATHIST');
		}
		
		// добавляем дни памяти
		$days = [];
		$daysText = '';
		foreach($item['dates'] as $dt) {
			$date = new DateTime($dt['calc_date']);
			$days[] = $date->format('Ymd');
			$daysText = $daysText . "\n- [" . ToLower(FormatDate('j F', $date->getTimestamp())) . "](/days/" . $date->format('Ymd') . "/)";
			$daysText = $daysText . ($dt['type'] === 1 ? ' _(переходящая)_' : '') . ($dt['explanation'] ? ' – ' . $dt['explanation'] : '');
		}
		if (count($days)) {
			CIBlockElement::SetPropertyValues($bxSaint['ID'], $bxSaint['IBLOCK_ID'], $days, 'DAYS');
			CIBlockElement::SetPropertyValues($bxSaint['ID'], $bxSaint['IBLOCK_ID'], $daysText, 'DAYS_TEXT');
		}
		
		$res->setData($stat);
		return $res;
	}
}
?>