/**
 * Framework7 Plugin PhoneGap 0.9.0
 * PhoneGap plugin extends Framework7 for ios native
 *
 * Copyright 2020 Ивайло Тилев
 */

/** @namespace webkit.messageHandlers.appInit */
/** @namespace webkit.messageHandlers.hideSplash */
/** @namespace webkit.messageHandlers.networkActivityIndicatorVisible */
/** @namespace webkit.messageHandlers.playSystemSound */
/** @namespace webkit.messageHandlers.playAlertSound */

/** ... */

// noinspection JSUnusedGlobalSymbols
const Framework7Phonegap = {

	name: 'phonegap',

	params: {},

	create() {
		const app = this;

		// noinspection JSUnusedGlobalSymbols
		app.phonegap = {

			appInit() {
				if(app.device['webview'])
					webkit.messageHandlers.appInit.postMessage(null);
			},

			hideSplash() {
				if(app.device['android'])
					navigator['splashscreen'].hide();
				else if(app.device['webview'])
					webkit.messageHandlers.hideSplash.postMessage(null);
			},

			networkIndicator(visible) {
				if(app.device['webview'])
					webkit.messageHandlers.networkActivityIndicatorVisible.postMessage(visible);
			},

			playSound(code = 1104, alert = false) {
				if(app.device['webview'])
					if(alert)
						webkit.messageHandlers.playAlertSound.postMessage(code);
					else webkit.messageHandlers.playSystemSound.postMessage(code);
			},

			// ...

			statusbar: {
				overlaysWebView(doOverlay) {
					StatusBar.overlaysWebView(doOverlay);
				},

				styleDefault() {
					StatusBar.styleDefault();
				},

				styleLightContent() {
					StatusBar.styleLightContent();
				},

				styleBlackTranslucent() {
					StatusBar.styleBlackTranslucent();
				},

				styleBlackOpaque() {
					StatusBar.styleBlackOpaque();
				},

				backgroundColorByName(colorname) {
					return StatusBar.backgroundColorByName(colorname);
				},

				backgroundColorByHexString(hexString) {
					StatusBar.backgroundColorByHexString(hexString);
				},

				hide() {
					StatusBar.hide();
					app.$('html').removeClass('ios-10');
				},

				show() {
					app.$('html').addClass('ios-10');
					StatusBar.show();
				}
			},
		}
	},
};

export default Framework7Phonegap;
