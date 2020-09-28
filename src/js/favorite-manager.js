/**
 * Управляет избранным
 */

import dataManager from './data/manager.js';

let app;

function init(appInstance) {
	app = appInstance;
}

function add(id, type) {
	if (has(id)) return;

	let favorites = app.methods.storageGet('favorites') || [];
	favorites.unshift({
		id,
		type
	});
	app.methods.storageSet('favorites', favorites);
}

function has(id) {
	let favorites = app.methods.storageGet('favorites') || [];
	return !!favorites.find((item) => item.id === id);
}

function remove(id) {
	let favorites = app.methods.storageGet('favorites') || [];
	favorites = favorites.filter((item) => item.id !== id);
	app.methods.storageSet('favorites', favorites);
}

function list() {
	let favorites = app.methods.storageGet('favorites') || [];

	return favorites.map(item => formatItem(item));
}

function reorder({from, to} = {}) {
	let favorites = app.methods.storageGet('favorites') || [];
	let [item] = favorites.splice(from, 1);
	favorites.splice(to, 0, item);
	app.methods.storageSet('favorites', favorites);
}

function formatItem(item) {
	if (item.type === 'prayer-e') {
		let prayers = dataManager.cache.prayers;
		let prayer = prayers.e.find(({id}) => id === item.id);
		let parentSection = prayers.s.find(({id}) => id === prayer.parent);
		let parentSection2 = prayers.s.find(({id, parent}) => {
			return id === parentSection.parent && parent !== '0';
		});

		return {
			id: item.id,
			name: prayer.name,
			url: `/prayers/text/${item.id}`,
			parents: (parentSection2 && (parentSection2.name + ' • ') || '') +
							 parentSection.name,
			type: item.type
		};
	} else {
		return {
			id: item.id,
			name: item.id,
			type: item.type
		};
	}
}

export default {init, add, has, remove, list, reorder};
