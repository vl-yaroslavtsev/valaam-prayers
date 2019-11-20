import {Template7} from 'framework7';
import moment from 'moment';


moment.locale('ru');

Template7.registerHelper('moment', function (date, options) {
  if (date.hash) {
		options = date;
		date = undefined;
	}

	let mt = moment(date, 'YYYYMMDD');

	Object
		.entries(options.hash)
		.forEach(([key, value]) => {
			mt = mt[key](value);
		});

  return mt;
});

export default ['moment'];
