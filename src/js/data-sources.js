import {DataManager, DataSource, API_URL} from './data-manager.js';

DataManager.addSource(new DataSource({
	id: 'prayers',
	url: `${API_URL}prayers/?type=json`,
	storage: 'collections',
	key: 'prayers',
	handler: 'staleWhileRevalidate',
	autoLoad: true,
	memoryCache: true
}));

DataManager.addSource(new DataSource({
	id: 'calendar',
	url: `${API_URL}days/calendar/?type=json`,
	storage: 'collections',
	key: 'calendar',
	handler: 'staleWhileRevalidate',
	autoLoad: true,
	memoryCache: true
}));

DataManager.addSource(new DataSource({
	id: 'ritesConfig',
	url: `${API_URL}rites-config?type=json`,
	handler: 'networkOnly',
	memoryCache: true
}));

DataManager.addSource(new DataSource({
	id: 'valaamGid',
	url: `${API_URL}?referer1=valaam.tour&type=json`,
	handler: 'networkOnly',
	memoryCache: true
}));

DataManager.addSource(new DataSource({
	id: 'prayer',
	url: (id) => `${API_URL}prayers/${id}`,
	storage: 'prayers',
	key: (id) => id,
	handler: 'staleWhileRevalidate'
}));

DataManager.addSource(new DataSource({
	id: 'saint',
	url: (id) => `${API_URL}saints/${id}`,
	storage: 'saints',
	key: (id) => id,
	handler: 'staleWhileRevalidate'
}));

DataManager.addSource(new DataSource({
	id: 'day',
	url: (code) => `${API_URL}days/${code}`,
	storage: 'days',
	key: (code) => code,
	handler: 'staleWhileRevalidate',
	memoryCache: true
}));
