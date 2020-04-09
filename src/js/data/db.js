/**
 * @module data/db
 */
import { openDB, deleteDB, wrap, unwrap } from 'idb';
import Store from './store.js';

/** @type IDBDatabase */
let idb;

let db = {};

const stores = [
	'collections',
	'days',
	'images',
	'prayers',
	'saints',
	'state'
];

/**
 * Регистируем хранилища
 * @param  {IDBDatabase} idb
 */
function registerStores(idb) {
	stores.forEach(name => {
		db[name] = new Store(name, idb);
	});
}

/**
 * Открываем БД
 * @return {Promise} Промис отдает IDBDatabase
 */
db.open = async function() {
	if (idb) return idb;

	idb = await openDB('phonegap', 1, {
		upgrade(db, oldVersion, newVersion, transaction) {
			switch(oldVersion) { // существующая (старая) версия базы данных
		    case 0:
				db.createObjectStore('collections');
				db.createObjectStore('days', {keyPath: 'code'});
				db.createObjectStore('prayers', {keyPath: 'id'});
				db.createObjectStore('saints', {keyPath: 'id'});
				db.createObjectStore('state');

				const imagesStore = db.createObjectStore('images', {keyPath: 'url'});
				imagesStore.createIndex('by-type', 'type');
		    case 1:

			}
		},
		blocked() {
		},
		blocking() {  // versionchange event
			if (!document.hasFocus()) {
				// Reloading will close the database, and also reload with the new JavaScript
				// and database definitions.
				location.reload();
			} else {
				// If the document has focus, it can be too disruptive to reload the page.
				// Maybe ask the user to do it manually:
				throw new Error("База данных устарела. Пожалуйста, обновите страницу");
			}
		},
		terminated () {
		}
	});

	registerStores(idb);
	return idb;
}

export default db;
