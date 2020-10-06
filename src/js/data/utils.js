import dataManager from './manager.js';

/**
 * Проверяем, принадлежит указанная молитва к разделу (одному или нескольким)
 * @param  {string} prayerId Id молитвы
 * @param  {Array.<string>} parents  Id разделов
 * @return {number} уровень вложенности. 0 - если молитвы нет в разделе
 */
function isPrayerInSection(prayerId, parents) {
	let prayers = dataManager.cache.prayers.e;
	if (!Array.isArray(parents))
		parents = [parents];

	let prayer = prayers.find(({id}) => id === prayerId);
	if (!prayer)
		return 0;

	return prayersParents(prayer.parent, parents, 1);
}

/**
 * Проверяем, принадлежит указанный раздел к разделу (одному или нескольким)
 * @param  {string} sectionId Id раздела
 * @param  {Array.<string>} parents  Id разделов
 * @param  {number} depth  уровень вложенности
 * @return {number} depth
 */
function prayersParents(sectionId, parents, depth) {
	if (parents.includes(sectionId)) {
		return depth;
	}

	let sections = dataManager.cache.prayers.s;
	let section = sections.find(({id}) => id === sectionId);

	if (!section) {
		return 0;
	}

	if (section.parent === "0") {
		return 0;
	}

	return prayersParents(section.parent, parents, ++depth);
}

/**
 * Если элемент или раздел находится в книге, возвращаем его ID, если нет  - false
 * @param  {string} prayerId Id элемента
 * @param  {string} sectionId Id раздела
 * @return {string || boolean}
 */
function prayersBookId({prayerId, sectionId}) {
	let currSectionId = sectionId;
	if (prayerId) {
		let prayers = dataManager.cache.prayers.e;
		let prayer = prayers.find(({id}) => id === prayerId);
		if (!prayer) {
			return false;
		}
		currSectionId = prayer.parent;
	}

	let sections = dataManager.cache.prayers.s;
	while (true) {
		let section = sections.find(({id}) => id === currSectionId);

		if (!section) {
			return false;
		}

		if (section.book_root) {
			return section.id;
		}

		if (section.parent === "0") {
			return false;
		}

		currSectionId = section.parent;
	}
}

/**
 * Возвращаем массив из пути до элемента от корня книги
 * @param  {string} prayerId Id разделов
 * @return {Array.<PrayerSection>}
 */
function prayersPath(prayerId) {
	let prayers = dataManager.cache.prayers.e;
	let sections = dataManager.cache.prayers.s;
	let prayer = prayers.find(({id}) => id === prayerId);
	let path = [];
	if (!prayer) {
		return path;
	}

	let sectionId = prayer.parent;
	while (true) {
		let section = sections.find(({id}) => id === sectionId);

		if (!section) {
			return path;
		}

		path.unshift(section.name);

		if (section.book_root || section.parent === "0") {
			return path;
		}

		sectionId = section.parent;
	}
}

export {isPrayerInSection, prayersBookId, prayersPath}
