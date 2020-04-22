;(function(window) {
	'use strict';

	if(window['StatusBar'])
		return;

	const namedColors = {
		"black": "#000",
		"darkGray": "#a9a9a9",
		"lightGray": "#d3d3d3",
		"white": "#fff",
		"gray": "#808080",
		"red": "#f00",
		"green": "#0f0",
		"blue": "#00f",
		"cyan": "#0ff",
		"yellow": "#FFFF00",
		"magenta": "#FF00FF",
		"orange": "#ffa500",
		"purple": "#800080",
		"brown": "#A52A2A"
	};

	const StatusBar = {

		isVisible: true,

		overlaysWebView: function(doOverlay) {
			/** @namespace webkit.messageHandlers.statusBarOverlaysWebView */
			webkit.messageHandlers.statusBarOverlaysWebView.postMessage(doOverlay);
		},

		styleDefault: function() {
			// dark text ( to be used on a light background )
			/** @namespace webkit.messageHandlers.statusBarStyleDefault */
			webkit.messageHandlers.statusBarStyleDefault.postMessage(null);
		},

		styleLightContent: function() {
			// light text ( to be used on a dark background )
			/** @namespace webkit.messageHandlers.statusBarStyleLightContent */
			webkit.messageHandlers.statusBarStyleLightContent.postMessage(null);
		},

		styleBlackTranslucent: function() {
			// #88000000 ? Apple says to use lightContent instead
			/** @namespace webkit.messageHandlers.statusBarStyleBlackTranslucent */
			webkit.messageHandlers.statusBarStyleBlackTranslucent.postMessage(null);
		},

		styleBlackOpaque: function() {
			// #FF000000 ? Apple says to use lightContent instead
			/** @namespace webkit.messageHandlers.statusBarStyleBlackOpaque */
			webkit.messageHandlers.statusBarStyleBlackOpaque.postMessage(null);
		},

		backgroundColorByName: function(colorname) {
			return StatusBar.backgroundColorByHexString(namedColors[colorname]);
		},

		backgroundColorByHexString: function(hexString) {
			if(hexString.charAt(0) === "#")
				hexString = hexString.substr(1);

			if(hexString.length === 3) {
				const split = hexString.split("");
				hexString = split[0] + split[0] + split[1] + split[1] + split[2] + split[2];
			}

			if(hexString.length === 6)
				hexString = "ff" + hexString;

			/** @namespace webkit.messageHandlers.statusBarBackgroundColorByHexString */
			webkit.messageHandlers.statusBarBackgroundColorByHexString.postMessage(hexString);
		},

		hide: function() {
			/** @namespace webkit.messageHandlers.statusBarHide */
			webkit.messageHandlers.statusBarHide.postMessage(null);
			StatusBar.isVisible = false;
		},

		show: function() {
			/** @namespace webkit.messageHandlers.statusBarShow */
			webkit.messageHandlers.statusBarShow.postMessage(null);
			StatusBar.isVisible = true;
		}

	};

	window.StatusBar = StatusBar;
	window.cordova = !!window['webkit'];

	window.addEventListener('load', function() {
		document.dispatchEvent(new Event('deviceready'));
	});

})(window);
