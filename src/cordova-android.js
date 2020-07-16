;(function(window) {
	'use strict';

	window.cordova = !!window['AndroidJS'];

	window.addEventListener('load', function() {
		document.dispatchEvent(new Event('deviceready'));
	});

})(window);
