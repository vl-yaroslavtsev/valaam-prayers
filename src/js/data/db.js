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
	'state',
	'downloads',
	'read_history'
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

	idb = await openDB('phonegap', 4, {
		upgrade(db, oldVersion, newVersion, transaction) {
			switch(oldVersion) { // существующая (старая) версия базы данных
		    case 0:
				db.createObjectStore('collections');
				db.createObjectStore('days', {keyPath: 'code'});
				db.createObjectStore('prayers', {keyPath: 'id'});
				db.createObjectStore('saints', {keyPath: 'id'});
				db.createObjectStore('state', {keyPath: 'id'});
				db.createObjectStore('downloads', {keyPath: 'id'});
				db.createObjectStore('images', {keyPath: 'url'});

				transaction.objectStore('prayers').createIndex('by-root-id', 'root_id');
				transaction.objectStore('images').createIndex('by-source-id', 'source_id');

				case 1:
				db.createObjectStore('read_history', {keyPath: 'id'});
				transaction.objectStore('read_history').createIndex('by-date', 'date');

				case 2:
				transaction.objectStore('read_history').createIndex('by-book-id', 'book_id');

				case 3:
				transaction.objectStore('read_history').createIndex('by-parent-id', 'parent_id');

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
