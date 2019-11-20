<?php
use \Bitrix\Main\Error;
use \Bitrix\Main\Result;
/**
 * Класс обновляет данные дней календаря
 */
class Calendar
{
	const PLURAL_TYPE_NONE = 0;
	const PLURAL_TYPE_SINGLE = 1;
	const PLURAL_TYPE_PLURAL = 2;
	
	const BX_IBLOCK_CALENDAR_SAINTS = 34;
	const BX_IBLOCK_CALENDAR_DAY = 30;
	const BX_IBLOCK_CALENDAR_PRAYERS = 31;
	const BX_IBLOCK_LITURGICAL_INSTRUCTIONS = 33;
	const BX_IBLOCK_CALENDAR_EREADER = 29;
	
	private $ibe;
	private $az;
	private $md;
	private $pt;
	
	private $arSaintId;
	private $arPrayerSecId;
	private $arEReadersId;
	private $arTakId;

	/**
	 * @constructor
	 */
	public function __construct()
	{
		if(!\Bitrix\Main\Loader::includeModule("iblock"))
		{
			throw new Exception("Невозможно подключить модуль iblock!");
			exit();
		}
				
		$this->ibe = new CIBlockElement();
		$this->az = new Azbyka();
		$this->md = new RIG\Markdown();
		$this->pt = new Patriarhia();
		
		$this->fillSaintIds();
		$this->fillPrayerSecId();
		$this->fillEReadersId();
		$this->fillTakId();
	}
	
	public function __destruct()
	{ 
		$this->ibe = null;
		$this->az = null;
		$this->md = null;
		$this->pt = null;
		
		$this->arSaintId = null;
		$this->arPrayerSecId = null;
		$this->arEReadersId = null;
		$this->arTakId = null;
	}
	
	private function fillSaintIds()
	{
		$this->arSaintIds = [];
		$res = CIBlockElement::GetList(
			[],
			['IBLOCK_ID' => self::BX_IBLOCK_CALENDAR_SAINTS, 'ACTIVE' => 'Y'],
			false,
			false,
			['ID', 'XML_ID']);
		
		while($item = $res->Fetch())
			$this->arSaintIds[$item['XML_ID']] = $item['ID'];
	}
	
	private function fillPrayerSecId()
	{
		$this->arPrayerSecId = [];		
		$res = CIBlockSection::GetList(
			[],
			['IBLOCK_ID' => self::BX_IBLOCK_CALENDAR_PRAYERS, 'ACTIVE' =>'Y', 'SECTION_ID' => false],
			false,
			['ID', 'CODE']
		);
		
		while($item = $res->Fetch())
			$this->arPrayerSecId[$item['CODE']] = $item['ID'];
	}
	
	private function fillEReadersId()
	{
		$this->arEReadersId = [];		
		$res = CIBlockElement::GetList(
			['CODE' => 'ASC'],
			['IBLOCK_ID' => self::BX_IBLOCK_CALENDAR_EREADER, 'ACTIVE' => 'Y'],
			false,
			false,
			['ID', 'XML_ID']
		);
		while($item = $res->Fetch())
			$this->arEReadersId[$item['XML_ID']] = $item['ID'];
		
		//var_dump($this->arEReadersId);
	}
	
	private function fillTakId() {
		$this->arTakId = [];	
		$res = CIBlockElement::GetList(
			['CODE' => 'ASC'],
			['IBLOCK_ID' => self::BX_IBLOCK_CALENDAR_PRAYERS, 'ACTIVE' => 'Y'],
			false,
			false,
			['ID', 'XML_ID']
		);
		while($item = $res->Fetch())
			$this->arTakId[$item['XML_ID']] = $item['ID'];
		
		//var_dump($this->arTakId);
	}
	
	private function mb_ucfirst($string)
	{
		$string = mb_strtoupper(mb_substr($string, 0, 1)) . mb_substr($string, 1);

		return $string;
	}

	/**
	 * Вывод информации по святому (групповому или одиночному)
	 * @param array $item Данные с азбуки
	 * @param array $params Параметры вывода
	 * @return string
	 */
	private function printSaint($item, $params) {
		if (!$params) $params = [];
		if (!isset($params['type_of_sanctity'])) $params['type_of_sanctity'] = self::PLURAL_TYPE_SINGLE;
		if (!isset($params['church_title'])) $params['church_title'] = self::PLURAL_TYPE_SINGLE;

		$arSaintIds = &$this->arSaintIds;
		
		$res = $item['prefix'];

		if($item['enable_type_of_sanctity'])
		{
			if($params['type_of_sanctity'] === self::PLURAL_TYPE_SINGLE)
				$res .= ($item['type_of_sanctity'] ? $item['type_of_sanctity'] . ' ' : '');
			else if($params['type_of_sanctity'] === self::PLURAL_TYPE_PLURAL)
				$res .= ($item['type_of_sanctity_plural'] ? $item['type_of_sanctity_plural'] . ' ' : '');
		}

		$tmp = $item['title_genitive'] ?: $item['title'];
		$tmp = str_replace(['<em>', '</em>'], ['(', ')'], $tmp);
		$tmp = str_replace(['((', '))'], ['(', ')'], $tmp);
		$title = strip_tags($tmp);

		if($tmp = $arSaintIds['s' . $item['id']])
			$title = sprintf('[%s](/saints/%s)', $title, $tmp);

		$res .= $title;

		if($item['enable_church_title'])
		{
			if($params['church_title'] === self::PLURAL_TYPE_SINGLE)
				$res .= ($item['church_title_genitive'] ? ', ' . $item['church_title_genitive'] : '');
			else if($params['church_title'] === self::PLURAL_TYPE_PLURAL)
				$res .= ($item['church_title_plural'] ? ', ' . $item['church_title_plural'] : '');
		}

		if($params['first_letter_uppercase'])
			$res = $this->mb_ucfirst($res);

		$res .= $item['suffix'];
		$res = strip_tags($res);

		if($item['bold'])
			$res = "**$res**";

		if(($tmp = $item['ideograph']) && !$item['hide_ideograph'])
			$res = sprintf('![ideograph][IdeoGraph.%d]%s', $tmp, $res);

		return $res;
	}

	/**
	 * Вывод информации по всем святым
	 * @param array $saints Данные с азбуки
	 * @return string
	 */
	function printSaints($saints) {
		$res = '';

		/**
		 * Группа с общим типом святости внутри групповых святых
		 * @var string $groupTypeOfSanctity
		 */
		$groupTypeOfSanctity = '';
		/**
		 * Группа с общим церковной степенью внутри группы с общим типом святости
		 * @var string $groupChurchTitle
		 */
		$groupChurchTitle = '';

		foreach($saints as $idx => $item) {
			$printParams = [
				'type_of_sanctity' => self::PLURAL_TYPE_SINGLE,
				'church_title' => self::PLURAL_TYPE_SINGLE
			];

			$prevItem = $saints[$idx - 1];
			$nextItem = $saints[$idx + 1];

			// групповые святые
			$isGroup = $item['group'] > 0;
			// cвятой - первый в группе ?
			$isFirstInGroup = $isGroup && (!$prevItem || $prevItem['group'] != $item['group']);

			if ($idx === 0) {
				$printParams['first_letter_uppercase'] = true;
			}

			if ($prevItem)
			{
				// выводим разделительные запятые или точки
				if ($isGroup  && $prevItem['group'] == $item['group'])
				{
					$res = $res . ($prevItem['union'] ? rtrim($prevItem['union']) . " " : ", ");

				} else if ($prevItem['priority'] == $item['priority'])
				{
					$res = $res . "; ";
				}
				else
				{
					$res = $res . "\n";
					$printParams['first_letter_uppercase'] = true;
				}
			}


			// святой одиночный
			if (!$isGroup)
			{
				$groupTypeOfSanctity = '';
				$groupChurchTitle = '';
			}
			else // святой групповой
			{
				// окончание группы с общим типом святости (мчч. или сщмч. и т.д.)
				if ($prevItem['group'] != $item['group'] ||
					(
						$prevItem['group'] == $item['group'] &&
						$groupTypeOfSanctity &&
						false === strpos($item['type_of_sanctity'], $groupTypeOfSanctity)
					))
				{
					$groupTypeOfSanctity = '';
					$groupChurchTitle = '';
				}

				// продолжение группы с общим типом святости (мчч. или сщмч. и т.д.)
				if ($prevItem['group'] == $item['group'] &&
					$groupTypeOfSanctity &&
					false !== strpos($item['type_of_sanctity'], $groupTypeOfSanctity))
				{
					$printParams['type_of_sanctity'] = self::PLURAL_TYPE_NONE;
				}

				// начало группы с общим типом святости (мчч. или сщмч. и т.д.)
				if ((
						$isFirstInGroup ||
						(
							$prevItem['group'] == $item['group'] &&
							!$groupTypeOfSanctity
						)
					) &&
					$item['group'] == $nextItem['group'] &&
					false !== strpos($nextItem['type_of_sanctity'], $item['type_of_sanctity']))
				{
					$groupTypeOfSanctity = $item['type_of_sanctity'];
					$printParams['type_of_sanctity'] = self::PLURAL_TYPE_PLURAL;

					// начало группы с общей церковной степерью (пресвитеров и т.д.)
					if (!$groupChurchTitle &&
						$item['church_title_genitive'] == $nextItem['church_title_genitive'])
					{
						$groupChurchTitle = $item['church_title_genitive'];
					}
				}

				// обработка групп с общей церковной степенью
				if ($groupTypeOfSanctity)
				{
					// начало группы с общей церковной степерью (пресвитеров и т.д.)
					if (!$groupChurchTitle &&
						$item['church_title_genitive'] == $nextItem['church_title_genitive'])
					{
						$groupChurchTitle = $item['church_title_genitive'];
					}

					// продолжение группы с общей церковной степерью (пресвитеров и т.д.)
					if ($groupChurchTitle &&
						$groupChurchTitle == $item['church_title_genitive'])
					{
						$printParams['church_title'] = self::PLURAL_TYPE_NONE;
					}

					// окончание группы с общей церковной степерью (пресвитеров и т.д.)
					if ($groupChurchTitle &&
						(
							$item['group'] != $nextItem['group'] ||
							false === strpos($nextItem['type_of_sanctity'], $groupTypeOfSanctity) ||
							$groupChurchTitle != $nextItem['church_title_genitive']
						))
					{
						$groupChurchTitle = '';
						$printParams['church_title'] = self::PLURAL_TYPE_PLURAL;
					}
				}
			}

			$res = $res . $this->printSaint($item, $printParams);
		}
		
		return $res;
	}
	
	/**
	 *  Форматируем данные по святым за текущий день  
	 *  @param Array $json Данные по дню с азбуки
	 *  @return string
	 */
	public function getDaySaints($json) {
		$arSaintIds = &$this->arSaintIds;
		
		$fasting = &$json['fasting'];

		$fweeks = strip_tags($fasting['weeks']);
		$priority = array_filter($json['holidays'], function ($a) {
			return $a['priority'] == 2;
		});
		$priority = array_shift($priority);
		$priority_title = $priority['title'];

		if($fweeks && $priority_title)
		{
			$fweeks_cmp = preg_replace('~[^а-яёa-z0-9]~' . BX_UTF_PCRE_MODIFIER, '', ToLower(strip_tags($fasting['round_week']) . $fweeks));
			$ptitle_cmp = preg_replace('~[^а-яёa-z0-9]~' . BX_UTF_PCRE_MODIFIER, '', ToLower($priority_title));
			if(false !== strpos($fweeks_cmp, $ptitle_cmp))
			{
				$priority_title = false;
				if($tmp = $arSaintIds['h' .$priority['id']])
					$fweeks = sprintf(' [%s](/saints/%s)', $fweeks, $tmp);
			}
		}
		//pdump($priority, $fasting, $priority_title);
		//vdump($fweeks_cmp, $ptitle_cmp);

		$saints = $this->printSaints($json['saints']);
		$saints = explode("\n", $saints);
		$saints = array_map(function ($a) {
			return $a . '.';
		}, array_filter($saints));
		array_unshift($saints, false);

		$text = '##';
		if($tmp = strip_tags($fasting['round_week']))
			$text .= ' ' . $tmp . $fasting['separator'];
		if($tmp = $fweeks)
			$text .= ' ' . $tmp . '.';
		if($priority_title && ($tmp = $arSaintIds['h' .$priority['id']]))
			$text .= sprintf(' [%s](/saints/%s).', $priority_title, $tmp);
		if($tmp = $fasting['voice'])
			$text .= ' Глас ' . $tmp . '.';
		$text .= "\n";

		switch($fasting['type'])
		{
			case 0:
				$text .= 'Поста нет.';
				break;
			case 1:
				if($tmp = $fasting['fasting'])
					$text .= $tmp . '.';
				else $text .= 'Постный день.';
				break;
			case 2:
				$text .= 'Исключается мясная пища.';
				break;
		}

		if($tmp = $fasting['description'])
			$text .= ' ' . $tmp;

		for($idx = 0; $idx < 4; $idx++)
		{
			$data = [];
			$text .= "\n\n";

			if($array = array_filter($json['holidays'], function ($a) use ($idx) {
				return $a['priority'] == $idx && $idx != 2;
			}))
			{
				foreach($array as $item)
				{
					$tmp = $item['full_title'];
					$title = strip_tags($tmp);

					if(preg_match('~color:red~', $tmp))
						$title = "_{$title}_";
					if($item['marked'] || preg_match('~font:bold~', $tmp) || preg_match('~<b>~', $tmp))
						$title = "**$title**";
					if(preg_match('~text-transform:uppercase~', $tmp))
						$title = ToUpper($title);
					if($tmp = $arSaintIds['h' . $item['id']])
						$title = sprintf('[%s](/saints/%s)', $title, $tmp);
					if($tmp = $item['ideograph'])
						$title = sprintf('![ideograph][IdeoGraph.%d]%s', $tmp, $title);

					$data[] = strip_tags($title);
				}

				if($tmp = implode(';', $data))
					$text .= $tmp . '. ';
			}

			if($tmp = $saints[$idx])
				$text .= $tmp;
		}

		$data = [];
		$text .= "\n\n";

		if($array = $json['ikons'])
		{
			foreach($array as $item)
			{
				$tmp = $item['title'];
				$title = strip_tags($tmp);

				if($tmp = $arSaintIds['i' . $item['id']])
					$title = sprintf('[%s](/saints/%s)', $title, $tmp);
				if($tmp = $item['date'])
					$title = sprintf('%s (%s)', $title, $tmp);
				if($item['bold'])
					$title = "**$title**";
				if($tmp = $item['ideograph'])
					$title = sprintf('![ideograph][IdeoGraph.%d]%s', $tmp, $title);

				$data[] = $title;
			}

			if($tmp = implode('; ', $data))
				$text .= sprintf('Икон%s Божией Матери: %s.', count($array) == 1 ? 'а' : '', $tmp);
		}

		$text .= "\n\n"
			. "[IdeoGraph.1]: /local/templates/valaam/images/ideograph-1.png" . "\n"
			. "[IdeoGraph.2]: /local/templates/valaam/images/ideograph-2.png" . "\n"
			. "[IdeoGraph.3]: /local/templates/valaam/images/ideograph-3.png" . "\n"
			. "[IdeoGraph.4]: /local/templates/valaam/images/ideograph-4.png" . "\n"
			. "[IdeoGraph.5]: /local/templates/valaam/images/ideograph-5.png" . "\n";
		
		return $this->md->parse($text);
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
	 *  Получаем дату, для которой есть эталонный день календаря.
	 *  @param DateTime $date 
	 *  @return string Дата в формате YYYYMMDD
	 */
	private function getCalendarDate($date) {
		$filterDate = clone $date;
		$year = $filterDate->format('Y');
		
		if ($filterDate->format('L')) {
			if ($filterDate >= new DateTime($year . '-02-29') &&
				$filterDate <= new DateTime($year . '-03-12')) {
				$filterDate->add(new DateInterval("P1D"));
			}
		}
		return (($filterDate <= new DateTime($year . '-01-13')) ? '2019' : '2018') . $filterDate->format('md');
	}		
	
	/** 
	 * Получаем тропари, кондаки для текущего дня
	 * @param $saints array Святые текущего дня
	 * @return Array
	 */
	private function getTaks($saints) {
		$res = [];
		
		foreach($saints as $saint) {
			$taks = &$saint['taks'];
			foreach($taks as $tak) {
				if ($tak['type'] === 'Тропарь' || $tak['type'] === 'Кондак') {
					$res[] = $tak;
				}		
			}
		}
		
		return $this->arrayUniqueById($res);
	}
	
	/**
	 * Добавление тропаря, кондака в базу
	 * @param Array $tak данные с азубки
	 * @param DateTime $date текущая дата
	 * @return Result
	 */
	private function bxAddTak($tak, $date) {
		$result = new Result();	
		$stat = [];
		$xmlId = ($tak['type'] === 'Тропарь' ? 't' : ($tak['type'] === 'Кондак' ? 'k' : '')) . $tak['id'];

		$text = ($tak['voice'] ? '#' . $tak['voice'] : '') . 
				str_replace(['Перевод:', '<em>', '</em>'], ['**Перевод:**', '_', '_'], $tak['text']);
			
		$text = html_entity_decode(HTMLToTxt(
			$text, 
			"", 
			[
				'/href="[^"]*"/'
			],
			false
		));

		$arFields = [
			"IBLOCK_SECTION_ID" => $this->arPrayerSecId['M' . $date->format('m')],
			"XML_ID"         => $xmlId,
			"CODE"			 => $date->format('Ymd'),
			"IBLOCK_ID"      => self::BX_IBLOCK_CALENDAR_PRAYERS,
			"NAME"           => $tak['title'],
			"PREVIEW_TEXT"   => $text,
			"ACTIVE"         => "Y"
		];

		if ($takId = $this->arTakId[$xmlId]) {
			if(!$this->ibe->Update($takId, $arFields)) {
				return $result->addError(new Error("Ошибка обновления тропаря/кондака {$tak['title']}[{$takId}]:  {$this->ibe->LAST_ERROR}"));
			}
			$stat['updated'] = 1;
		
		} else {
			if(!($takId = $this->ibe->Add($arFields))) {
				return $result->addError(new Error("Не удалось добавить тропарь/кондак {$tak['title']}: {$this->ibe->LAST_ERROR}"));
			}
			$this->arTakId[$xmlId] = $takId;
			$stat['added'] = 1;
		}		
		$stat['id'] = $takId;
		
		$result->setData($stat);
		return $result;
	}
	
	/**
	 * Поиск богослужебного указания в базе
	 * @param DateTime $date текущая дата
	 * @return Array|false 
	 */
	private function bxGetBu($date) {
		$res = CIBlockElement::GetList(
			['ID' => 'ASC'],
			[
				'IBLOCK_ID' => self::BX_IBLOCK_LITURGICAL_INSTRUCTIONS,
				'CODE' => $date->format('Ymd')
			],
			false,
			false,
			[	
				'ID', 
				'NAME', 
				'IBLOCK_ID', 
				'CODE',
				'DETAIL_TEXT'
			]
		);

		return $res->Fetch();
	}
	
	/**
	 * Добавление / обновление богослужебного указания в базе
	 * @param Array $bu данные с азубки
	 * @param DateTime $date текущая дата
	 * @return Result
	 */
	private function bxAddBu($bu, $date) {
		$result = new Result();
		$stat = [];
		$arFields = [
			'NAME' => $bu['name'],
			'IBLOCK_ID' => self::BX_IBLOCK_LITURGICAL_INSTRUCTIONS,
			'CODE' => $date->format('Ymd'),
			'DETAIL_TEXT_TYPE' => 'text',
			'DETAIL_TEXT' => trim($bu['text'])
		];
					
		if($bxBu = $this->bxGetBu($date)) {
			if(!$this->ibe->Update($bxBu['ID'], $arFields)) {
				return $result->addError(new Error("Ошибка обновления элемента {$arFields['CODE']}[{$bxBu['ID']}]:  {$this->ibe->LAST_ERROR}"));
			}
			$stat['updated'] = 1;
		
		} else {
			if(!($bxBu['ID'] = $this->ibe->Add($arFields))) {
				return $result->addError(new Error("Ошибка добавления элемента {$arFields['CODE']}: {$this->ibe->LAST_ERROR}"));
			}
			$stat['added'] = 1;
		}
		$stat['id'] = $bxBu['ID'];
		
		$result->setData($stat);
		return $result;
	}
	
	/**
	 * Добавление / обновление Евангельского чтения  в базe
	 * @param Array $er данные с азубки
	 * @return Result
	 */
	private function bxAddEReaders($er) {
		$result = new Result();
		$stat = [];		
		
		$arFields = [
			'NAME' => $er['name'],
			'PREVIEW_TEXT' => $er['text'],
			'IBLOCK_ID' => self::BX_IBLOCK_CALENDAR_EREADER,
			'XML_ID' => $er['ref']
		];
		//var_dump($arFields);
		
		if($erId = $this->arEReadersId[$er['ref']])
		{
			if(!$this->ibe->Update($erId, $arFields)) {
				return $result->addError(new Error("Ошибка обновления элемента $erId:" . strip_tags($this->ibe->LAST_ERROR)));
			}
			$stat['updated'] = 1;
		}
		else
		{
			if(!$erId = $this->ibe->Add($arFields)) {
				return $result->addError(new Error("Ошибка добавления элемента " . strip_tags($this->ibe->LAST_ERROR)));
			}
			$this->arEReadersId[$er['ref']] = $erId;
			$stat['added'] = 1;
		}
		$stat['id'] = $erId;
		
		$result->setData($stat);
		return $result;
	}			
	
	/**
	 *  Добавляем или обновляем указанный день календаря  
	 *  @param Array $json Описание дня с азбуки
	 *  @param Date $date Дата за которую добавляем
	 *  @return Result
	 */
	public function bxAddDay($json, $date) {
		$result = new Result();
		$stat = [];
		
		$arDay = CIBlockElement::GetList(
			[],
			['IBLOCK_ID' => self::BX_IBLOCK_CALENDAR_DAY, 'CODE' => $date->format('Ymd')],
			false,
			false,
			['ID', 'IBLOCK_ID', 'NAME', 'CODE', 'PREVIEW_PICTURE', 'PREVIEW_TEXT', 'PROPERTY_TAKS']
		)->Fetch();
		
		// Обновляем святых дня
		if ($arDay) {
			$arDay['PREVIEW_TEXT'] = $this->getDaySaints($json);
		
			//print_r($arDay);
			if(! $this->ibe->Update($arDay['ID'], ['PREVIEW_TEXT' => $arDay['PREVIEW_TEXT']])) {
				return $result->addError(new Error("Не удалось изменить день {$arDay['code']} [ {$arDay['ID']} ]: {$this->ibe->LAST_ERROR} "));
			}
			$stat['updated'] = 1;
		// Добавляем день
		} else {
			$arDay = CIBlockElement::GetList(
				[],
				['IBLOCK_ID' => self::BX_IBLOCK_CALENDAR_DAY, 'CODE' => $this->getCalendarDate($date)],
				false,
				false,
				['NAME', 'CODE', 'IBLOCK_ID', 'PREVIEW_PICTURE', 'DETAIL_PICTURE', 'PREVIEW_TEXT', 'DETAIL_TEXT']
			)->Fetch();
			
			if (!$arDay) {
				return $result->addError(new Error("Не удалось найти день {$arDay['code']} : {$this->ibe->LAST_ERROR} "));
			}
			
			$arDay['CODE'] = $date->format('Ymd');
			$oldDate = (clone $date)->sub(new DateInterval("P13D"));
			$arDay['NAME'] = mb_strtolower(
								FormatDate('j F', $oldDate->getTimestamp()) . 
								' / ' . 
								FormatDate('j F', $date->getTimestamp())
							 ) . 
							 '. ' . 
							 FormatDate('l', $date->getTimestamp());
			$arDay['PREVIEW_PICTURE'] = CFile::MakeFileArray($arDay['PREVIEW_PICTURE']);
			$arDay['DETAIL_PICTURE'] = CFile::MakeFileArray($arDay['DETAIL_PICTURE']);
			
			//print_r($arDay);
			if(!($arDay['ID'] = $this->ibe->Add($arDay))) {
				return $result->addError(new Error("Не удалось добавить день {$arDay['code']} : {$this->ibe->LAST_ERROR} "));
			}
			$stat['added'] = 1;
		}
		
		// Добавляем/обновляем тропари, кондаки дня
		if(!($res = $this->az->getSaints($date))->isSuccess()) {
			return $result->addErrors($res->getErrors());
		}
		$saints = $res->getData();
		
		$taks = $this->getTaks($saints);
		$takIds = [];
		foreach($taks as $tak) {
			if(!($res = $this->bxAddTak($tak, $date))->isSuccess()) {
				return $result->addErrors($res->getErrors());
			}
			$tmp = $res->getData();
			$stat['taks_added'] = $stat['taks_added'] + $tmp['added'];
			$stat['taks_updated'] = $stat['taks_updated'] + $tmp['updated'];
			$takIds[] = $tmp['id'];
		}
		$this->ibe->SetPropertyValues($arDay['ID'], $arDay['IBLOCK_ID'], $takIds, 'TAKS');		
		
		// Добавляем богослужебные указания
		if(!($res = $this->pt->getBu($date))->isSuccess()) {
			return $result->addErrors($res->getErrors());
		}
		$bu = $res->getData();
		
		if ($bu['notFound'] ) {
			$stat['bu_not_found'] = $stat['bu_not_found'] + 1;
		
		} else {
			if(!($res = $this->bxAddBu($bu, $date))->isSuccess()) {
				return $result->addErrors($res->getErrors());
			}
			$tmp = $res->getData();
			$stat['bu_added'] = $stat['bu_added'] + $tmp['added'];
			$stat['bu_updated'] = $stat['bu_updated'] + $tmp['updated'];
		}
		
		// Добавляем Евангельские чтения
		$arEReadersIDs = [];
		$arEReadersPrepared = [];
		$texts = array_shift(array_filter($json['texts'], function($item) {
			return $item['type'] === 1;
		}));
		
		foreach((array)$texts['refs'] as $idx => $ref)
		{
			if(in_array($ref, ['Jn.66']))
				continue;
			
			if($tmp = $arEReadersPrepared[$ref])
			{
				$arEReadersIDs[] = $tmp;
				continue;
			}
			
			if(!($res = $this->az->getEReaders($ref))->isSuccess()) {
				return $result->addErrors($res->getErrors());
			}
			$er = $res->getData();
			
			if(!($res = $this->bxAddEReaders($er))->isSuccess()) {
				return $result->addErrors($res->getErrors());
			}
			$tmp = $res->getData();
			$stat['er_added'] = $stat['er_added'] + $tmp['added'];
			$stat['er_updated'] = $stat['er_updated'] + $tmp['updated'];
							
			$arEReadersPrepared[$ref] = $tmp['id'];
			$arEReadersIDs[] = $tmp['id'];
			//break;
		}
		$this->ibe->SetPropertyValues($arDay['ID'], self::BX_IBLOCK_CALENDAR_DAY, $arEReadersIDs, 'EREADERS');

		$readers = str_replace($texts['refs'], $arEReadersIDs, $texts['text']);
		$readers = str_replace(['<strong>', '</strong>'], ['**', '**'], $readers);
		$readers = preg_replace(['~&sup(\d+)(;?)~', '~<sup>(.+?)</sup>~'], ['^$1', '^$1'], $readers);
		$re = '~<a [^>]*?href="[^"]*?/biblia/\?(.+?)"[^>]*?>(.+?)</a>~' . BX_UTF_PCRE_MODIFIER;
		$readers = preg_replace($re, "[$2](/days/{$date->format('Ymd')}/readers/$1)", $readers);
		$readers = HTMLToTxt(
			$readers, 
			"", 
			['/href="[^"]*"/'],
			false
		);
		$readers = preg_replace('~(\S)\s?\R~' . BX_UTF_PCRE_MODIFIER, "$1  \n", $readers); // чтобы при переносе строк вставлялись <br/> у markdown (он вставляет <br> если есть 2 пробела и перенос строки )
		$this->ibe->SetPropertyValues($arDay['ID'], self::BX_IBLOCK_CALENDAR_DAY, $readers, 'EREADERS_TEXT');
		
		$result->setData($stat);
		
		return $result;
	}
	
	/**
	 * Добавляем дни календаря за указанный период.
	 * Если день у нас уже есть, обновляем святых.
	 * @param string $startDate
	 * @param string $endDate
	 * @return Result
	 */
	public function addForPeriod($startDate, $endDate){
		$result = new Result();
		$date = new DateTime($startDate);
		$endDate = new DateTime($endDate);
		$stat = [];

		while ($date <= $endDate) {
			$res = $this->az->getDay($date);
			if (!$res->isSuccess()) {
				return $result->addErrors($res->getErrors());
			}
			$json = $res->getData();
			
			$stat['fetched'] = $stat['fetched'] + 1;
			if (($res = $this->bxAddDay($json, $date))->isSuccess()) {
				$data = $res->getData();
				
				foreach ($data as $key => $value) {
					$stat[$key] = $stat[$key] + $value;
				}
			} else {
				$result->addError(new Error("Ошибка при обработке дня: {$date->format('Y-m-d')} "));
				return $result->addErrors($res->getErrors());
			}
			$date->add(new DateInterval("P1D"));
		}
		
		$result->setData($stat);
		return $result;
	}
}
?>