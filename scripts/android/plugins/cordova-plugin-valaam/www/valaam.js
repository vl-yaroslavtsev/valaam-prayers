cordova.define("cordova-plugin-valaam.Valaam", function(require, exports, module) {
const exec = require('cordova/exec');

const Valaam = {
	echo: (message) => {
		return new Promise((resolve, reject) => {
			exec(resolve, reject, "Valaam", "Echo", [message]);
		})
	}
};

module.exports = Valaam;

});
