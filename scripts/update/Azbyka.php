<?php
use \Bitrix\Main\Error;
use \Bitrix\Main\Result;
/**
 * Класс реализует обращение к апи azbyka.ru для получения календарных данных
 */
class Azbyka
{
	const AZBYKA_API_URL = "https://azbyka.ru/days/api";
	const AZBYKA_BIBLIA_URL = "https://azbyka.ru/biblia";
	
	const DATA_TYPE_SAINTS = 'saints';
	const DATA_TYPE_ICONS = 'ikons';
	const DATA_TYPE_HOLIDAYS = 'holidays';
	const DATA_TYPE_ALL = 'all';

	private $http = null;
	private static $cache = [];
	private $reqDate;


	/**
	 * @constructor
	 */
	public function __construct()
	{
		$this->http = new \Bitrix\Main\Web\HttpClient();
		$this->http->setHeader('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.1 Safari/603.1.30');
		
		$this->reqDate = new DateTime();
	}
	
	public function __destruct()
	{ 
		$this->http = null;
	}
	
	/**
	 * Получаем json-данные
	 * @param $url
	 * @return \Bitrix\Main\Result
	 */
	private function getJson($url) {
		$result = new Result();

		if ($json = self::$cache[$url]) {
			return $result->setData($json);
		}
		
		if(false === $resp = $this->http->get($url)) {
			return $result->addError(new Error("Azbyka.getJson(): Ошибка загрузки c $url"));
		}

		if(!$json = json_decode($resp, true)) {
			return $result->addError(new Error("Azbyka.getJson(): Ошибка парсинга данных c $url. $resp"));
		}

		$result->setData($json);
		
		self::$cache[$url] = $json;
		
		return $result;
	}
	
	/**
	 * Получаем евангельские чтения
	 * @param string $ref Идентификатор Евангельского чтения (1Jn.1:21)
	 * @return \Bitrix\Main\Result
	 */
	public function getEReaders($ref) {
		$result = new Result();

		// Исправляем ошибки
		$ref = str_replace(
			[
				'1100or.10:12-22', 
				'50k.10:19-21',
				'50k.17:3-10',
				'2100or.5:15-21'
			], 
			[
				'1Cor.10:12-22', 
				'Lk.10:19-21',
				'Lk.17:3-10',
				'2Cor.5:15-21'
			], 
			$ref);

		$url = self::AZBYKA_BIBLIA_URL . "/?{$ref}&utfcs";

		if ($html = self::$cache[$url]) {
			$result->setData($html);
			return $result;
		}
		
		if ($this->reqDate->diff(new DateTime())->s < 1) {
			// print("getEReaders($ref) Спим...\n");
			sleep(rand(1, 2));
		}

		if(false === $html = $this->http->get($url)) {
			return $result->addError(new Error("Azbyka.getEReaders(): Ошибка загрузки c $url"));
		}

		if(!$sPos = strpos($html, '<div id="content"')) {
			return $result->addError(new Error("Azbyka.getEReaders(): {$ref} Не найдено начало $pagePath"));
		}
		if(!$ePos = strpos($html, '<div id="share-popup"')) {
			return $result->addError(new Error("Azbyka.getEReaders(): {$ref} Не найден конец $pagePath"));
		}
		if(!preg_match('~<title>(.*)</title>~', $html, $match)) {
			return $result->addError(new Error("Azbyka.getEReaders(): {$ref} Не найден заголовок $pagePath"));
		}
		$NAME = trim($match[1]);

		$html = substr($html, $sPos, $ePos - $sPos);
		if(!preg_match('~<table.*</table>~s', $html, $match)) {
			return $result->addError(new Error("Azbyka.getEReaders(): {$ref} Не найдена таблица $pagePath"));
		}
		$html = $match[0];
		$html = str_replace('&nbsp;', '', $html);
		$html = str_replace('||', '', $html);


		if(!preg_match('~<ul id="list-numbers".*?</ul>~s', $html, $match)) {
			return $result->addError(new Error("Azbyka.getEReaders(): {$ref} Не найдены индексы $pagePath"));
		}
		$uln = $match[0];

		if(!preg_match_all('~<li id="line-\d+" class="number visible-1">.*?<span class="verse-fullnumber">(.*?)</span>~s', $uln, $match)) {
			return $result->addError(new Error("Azbyka.getEReaders(): {$ref} Не найдены индексы list-numbers $pagePath"));
		}
			
		$uln = array_map('strip_tags', $match[1]);
		$uln = array_map('trim', $uln);


		if(!preg_match('~<ul id="list-verses-utfcs".*?</ul>~s', $html, $match)) {
			return $result->addError(new Error("Azbyka.getEReaders(): {$ref} Не найден текст list-verses-c $pagePath"));
		}
		$ulc = $match[0];

		$ulc = preg_replace('~\[<span class="zachala">(.*?)\.?</span>\]\s*~s', '[$1] ', $ulc);

		if(!preg_match_all('~<li class="verse visible-1 line-\d+"><div class="verse-inner">(.*?)</div></li>~s', $ulc, $match)) {
			return $result->addError(new Error("{$ref} Не найдены тексты list-verses-r $pagePath"));
		}
		$ulc = array_map('strip_tags', $match[1]);
		$ulc = array_map(function ($a) {
			return preg_replace('~\s+~', ' ', $a);
		}, $ulc);
		$ulc = array_map('trim', $ulc);

		if(!preg_match('~<ul id="list-verses-r".*?</ul>~s', $html, $match)) {
			return $result->addError(new Error("Azbyka.getEReaders(): {$ref} Не найден текст list-verses-r $pagePath"));
		}
		$ulr = $match[0];

		$ulr = preg_replace('~\[<span class="zachala">(.*?)\.?</span>\]\s*~s', '[$1] ', $ulr);
		$ulr = preg_replace('~<span class=cyn>(.*?)</span>~s', '_$1_', $ulr);

		if(!preg_match_all('~<li class="verse visible-1 line-\d+"><div class="verse-inner">(.*?)</div></li>~s', $ulr, $match)) {
			return $result->addError(new Error("Azbyka.getEReaders(): {$ref} Не найдены тексты list-verses-r $pagePath"));
		}
		$ulr = array_map('strip_tags', $match[1]);
		$ulr = array_map(function ($a) {
			return preg_replace('~\s+~', ' ', $a);
		}, $ulr);
		$ulr = array_map('trim', $ulr);

		$data = [];
		foreach($uln as $tmp => $value)
			$data[] = sprintf('#r#%s %s', $value, $ulr[$tmp]);
		$data[] = '';
		foreach($uln as $tmp => $value)
			$data[] = sprintf('#c#%s %s', $value, $ulc[$tmp]);

		// ударение ́  &#769;
		//			$data = str_replace('́', '', $data);

		$data = trim(implode("\n", $data));

		$arFields = [
			'NAME' => $NAME,
			'PREVIEW_TEXT' => $data,
			'IBLOCK_ID' => BX_IBLOCK_CALENDAR_EREADER,
			'XML_ID' => $ref
		];
		//pdump($arFields);
		$tmp = ['name' => $NAME, 'text' => $data, 'ref' => $ref];
		$result->setData($tmp);
		
		self::$cache[$url] = $tmp;
		$this->reqDate = new DateTime();
		
		return $result;
	}
	
	/**
	 * Получить данные по святым/иконам/праздникам с азбуки за данную дату
	 * @param DateTime $date
	 * @param string $type
	 * @return \Bitrix\Main\Result
	 */
	public function getSaints($date, $type = self::DATA_TYPE_ALL)
	{
		if ($type === self::DATA_TYPE_ALL) {
			$data = [];

			foreach ([self::DATA_TYPE_HOLIDAYS, self::DATA_TYPE_SAINTS, self::DATA_TYPE_ICONS] as $t) {
				$res = $this->getSaints($date, $t);
				if (!$res->isSuccess()) return $res;
				$data = array_merge($data, $res->getData());
			}

			$res = new Result();
			$res->setData($data);
			return $res;
		}

		$url = sprintf(self::AZBYKA_API_URL . "/$type/%s.json", $date->format('Y-m-d'));
		$res = $this->getJson($url);

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
	 * Получить данные по дню с азбуки за данную дату
	 * @param DateTime $date
	 * @return \Bitrix\Main\Result
	 */
	public function getDay($date)
	{
		$url = sprintf(self::AZBYKA_API_URL . "/day/%s.json", $date->format('Y-m-d'));
		$res = $this->getJson($url);

		if (!$res->isSuccess()) return $res;

		$json = $res->getData();
		$json['date'] = $date;
		
		$res->setData($json);
		return $res;
	}
}
?>