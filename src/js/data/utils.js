import dataManager from './manager.js';

/**
 * Проверяем, принадлежит указанная молитва к разделу (одному или нескольким)
 * @param  {string} prayerId Id разделов
 * @param  {Array.<string>} parents  Id разделов
 * @return {boolean}
 */
function isPrayerInSection(prayerId, parents) {
	let prayers = dataManager.cache.prayers.e;
	if (!Array.isArray(parents))
		parents = [parents];

	let prayer = prayers.find(({id}) => id === prayerId);
	if (!prayer)
		return false;

	return prayersParents(prayer.parent, parents);
}

function prayersParents(sectionId, parents) {
	if (parents.includes(sectionId)) {
		return true;
	}

	let sections = dataManager.cache.prayers.s;
	let section = sections.find(({id}) => id === sectionId);

	if (!section) {
		return false;
	}

	if (section.parent === "0") {
		return false;
	}

	if (parents.includes(section.parent)) {
		return true;
	}

	return prayersParents(section.parent, parents);
}

/**
 * Если элемент находится в книге, возвращаем ее ID, если нет  - false
 * @param  {string} prayerId Id разделов
 * @return {string || boolean}
 */
function prayersBookId(prayerId) {
	let prayers = dataManager.cache.prayers.e;
	let sections = dataManager.cache.prayers.s;
	let prayer = prayers.find(({id}) => id === prayerId);
	if (!prayer) {
		return false;
	}

	let sectionId = prayer.parent;
	while (true) {
		let section = sections.find(({id}) => id === sectionId);

		if (!section) {
			return false;
		}

		if (section.book_root) {
			return section.id;
		}

		if (section.parent === "0") {
			return false;
		}

		sectionId = section.parent;
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
