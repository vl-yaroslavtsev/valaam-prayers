import DataSource from './source.js';

const API_URL = 'https://valaam.ru/phonegap/';

export default [
	new DataSource({
		id: 'prayers',
		url: `${API_URL}prayers/?type=json`,
		store: 'collections',
		key: 'prayers',
		handler: 'cacheThenRevalidate',
	//	autoLoad: true,
	}),
	new DataSource({
		id: 'calendar',
		url: `${API_URL}days/calendar/?type=json`,
		store: 'collections',
		key: 'calendar',
		handler: 'cacheThenRevalidate',
	//	autoLoad: true
	}),
	new DataSource({
		id: 'ritesConfig',
		url: `${API_URL}rites-config?type=json`,
		handler: 'cacheThenNetwork'
	}),
	new DataSource({
		id: 'valaamGid',
		url: `${API_URL}?referer1=valaam.prayers&type=json`,
		handler: 'cacheThenNetwork'
	}),
	new DataSource({
		id: 'prayer',
		url: (id) => `${API_URL}prayers/${id}`,
		store: 'prayers',
		key: (id) => id,
		handler: 'staleWhileRevalidate'
	}),
	new DataSource({
		id: 'saint',
		url: (id) => `${API_URL}saints/${id}`,
		store: 'saints',
		key: (id) => id,
		handler: 'staleWhileRevalidate'
	}),
	new DataSource({
		id: 'day',
		url: (code) => `${API_URL}days/${code}`,
		store: 'days',
		key: (code) => code,
		handler: 'staleWhileRevalidate'
	})
];
