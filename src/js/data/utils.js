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

export {isPrayerInSection}
