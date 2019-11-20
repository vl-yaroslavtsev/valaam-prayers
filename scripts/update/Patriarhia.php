<?php
use \Bitrix\Main\Error;
use \Bitrix\Main\Result;
/**
 * Класс обновляет данные дней календаря
 */
class Patriarhia
{
	const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.1 Safari/603.1.30';
	const BU_URL = 'http://www.patriarchia.ru/bu/';
	
	private $http;
	private $cookies;
	private $referer;
	private $reqDate;

	/**
	 * @constructor
	 */
	public function __construct()
	{
		$this->reqDate = new DateTime();
		
		$http = new \Bitrix\Main\Web\HttpClient();
		$this->http = $http;
		$http->setHeader('User-Agent', self::USER_AGENT);
		
		if(false === ($html = $http->get($pageUrl = 'http://www.patriarchia.ru'))) {
			throw new Exception('Patriarhia(): Ошибка загрузки ' . $pageUrl);
		}
		$this->cookies = $http->getCookies()->toArray();
		$this->referer = $pageUrl;
	}
	
	public function __destruct()
	{ 
		$this->http = null;
		$this->cookies = null;
		$this->referer = null;
	}
	
	/**
	 *  Получаем богослужебные уаказания за данную дату
	 *  @param DateTime $date
	 *  @return Result
	 */
	public function getBu($date) 
	{
		$result = new Result();
		$pageUrl = self::BU_URL . $date->format('Y-m-d') . '/';
		
		$this->http->setHeader('Referer', $this->referer);
		$this->http->setCookies($this->cookies);
		
		if ($this->reqDate->diff(new DateTime())->s < 1) {
			sleep(rand(1, 2));
		}

		if(!$html = $this->http->get($pageUrl)) {
			return $result->addError(new Error("Patriarhia.getBu(): Ошибка загрузки $pageUrl"));
		}
		if(($status = $this->http->getStatus()) === 404) {
			return $result->setData(['notFound' => true]);
		}
		if(($status = $this->http->getStatus()) != 200) {
			return $result->addError(new Error("Patriarhia.getBu(): Ошибка загрузки: Статус $status. $pageUrl", $status));
		}

		$this->referer = $pageUrl;
		
		$html = str_replace("\r", '', $html);
		$html = str_replace("\n", ' ', $html);

		if(!preg_match('~<div class="main" id="main">\s+<div class="section">(.+?)</div>\s+</div>~i', $html, $match)) {
			return $result->addError(new Error("Patriarhia.getBu(): Не найден текст $pageUrl"));
		}
			

		$html = $match[1];

		if(!preg_match('~<h1>(.*?)</h1>~i', $html, $match)) {
			return $result->addError(new Error("Patriarhia.getBu(): Не найдено название $pageUrl"));
		}
		
		$name = trim(strip_tags($match[1]), ' .');

		if(preg_match('~<blockquote>(.*?)</blockquote>~i', $html, $match))
			$QUOTE = '> ' . preg_replace('~\s+~', ' ', trim(strip_tags($match[1])));
		else $QUOTE = '';

		$NOTE = '';
		/** @noinspection HtmlUnknownAnchorTarget */
		if($foundNotes = preg_match_all('~<p><a class="sdfootnotesym[a-z-]*" name="sdfootnote\d+sym" href="#sdfootnote\d+anc">(\d+)</a>(.*?)</p>~i', $html, $match, PREG_SET_ORDER))
		{
			foreach($match as $txt)
			{
				$NOTE .= "  \n^" . $txt[1] . ' ';
				$NOTE .= preg_replace('~\s+~', ' ', trim(strip_tags($txt[2])));

				$html = str_replace($txt[0], '', $html);
			}
		}


		$TEXT = '';
		if(preg_match_all('~<p>(.*?)</p>~i', $html, $match, PREG_SET_ORDER))
		{
			foreach($match as $txt)
			{
				/** @noinspection HtmlUnknownAnchorTarget */
				$txt = preg_replace('~<a class="sdfootnoteanc" name="sdfootnote\d+anc" href="#sdfootnote\d+sym">(\d+)</a>~i', '^$1', $txt[1]);
				$txt = preg_replace('~<b>(\s*)(.+?)(\s*)</b>~i', '$1**$2**$3', $txt);
				$txt = preg_replace('~<i>(\s*)(.+?)(\s*)</i>~i', '$1_$2_$3', $txt);

				$TEXT .= "\n\n" . preg_replace('~\s+~', ' ', trim(strip_tags($txt)));
			}

			if(strpos($TEXT, '^') !== false && !$foundNotes) {
				return $result->addError(new Error("Patriarhia.getBu(): Не найдено NOTE $pageUrl"));
			}
		}

		$DETAIL_TEXT = trim($QUOTE) . "\n\n" . trim($TEXT) . "\n\n" . trim($NOTE);
		
		$this->reqDate = new DateTime();
		return $result->setData(['name' => $name, 'text' => $DETAIL_TEXT]);
	}
}
?>