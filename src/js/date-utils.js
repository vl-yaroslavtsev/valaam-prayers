import moment from 'moment';

let app;

function init(appInstance) {
	app = appInstance;
}

function getEaster(year) {
	let [date] = Object
		.entries(app.dataManager.cache.calendar)
		.find(([date, desc]) => date.startsWith(year) && desc === "e") || [];

	return moment(date, 'YYYYMMDD');
}

export {getEaster};
