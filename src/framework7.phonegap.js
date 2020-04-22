/**
 * Framework7 Plugin PhoneGap 0.9.0
 * PhoneGap plugin extends Framework7 for ios native
 *
 * Copyright 2020 Ивайло Тилев
 */

/** @namespace webkit.messageHandlers.appInit */
/** @namespace webkit.messageHandlers.callbackDebug */
/** @namespace webkit.messageHandlers.hideSplash */
/** @namespace webkit.messageHandlers.networkActivityIndicatorVisible */
/** @namespace webkit.messageHandlers.notificationAdd */
/** @namespace webkit.messageHandlers.notificationRemove */
/** @namespace webkit.messageHandlers.notificationRemoveAll */
/** @namespace webkit.messageHandlers.notificationList */
/** @namespace webkit.messageHandlers.playSystemSound */
/** @namespace webkit.messageHandlers.playAlertSound */

/** ... */

// noinspection JSUnusedGlobalSymbols
const Framework7PhoneGap = {

	name: 'phonegap',

	params: {},

	create() {
		const app = this;

		// noinspection JSUnusedGlobalSymbols
		app.phonegap = {

			appInit() {
				if(app.device['android']) {
				} else if(app.device['webview']) {
					webkit.messageHandlers.appInit.postMessage(null);
				}
			},

			canApplePay() {
				if(app.device['webview'])
					return new Promise((resolve) => {

						app.once('phonegap_canApplePay', ((res) => {
							resolve(res);
						}));

						webkit.messageHandlers.canApplePay.postMessage(null);
					});
				else return new Promise(() => false);
			},

			canEvaluatePolicy() {
				if(app.device['webview'])
					return new Promise((resolve) => {

						app.once('phonegap_canEvaluatePolicy', ((res) => {
							resolve(res);
						}));

						webkit.messageHandlers.canEvaluatePolicy.postMessage(null);
					});
				else return new Promise(() => false);
			},

			hideSplash() {
				if(app.device['android'])
					navigator['splashscreen'] && navigator['splashscreen'].hide();
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

			notification: {
				add(schedule) {
					if(app.device['webview'])
						webkit.messageHandlers.notificationAdd.postMessage(schedule);
				},

				remove(items) {
					if(typeof items === 'string')
						items = [items];

					if(app.device['webview'])
						webkit.messageHandlers.notificationRemove.postMessage(items);
				},

				removeAll() {
					if(app.device['webview'])
						webkit.messageHandlers.notificationRemoveAll.postMessage(null);
				},

				list() {
					if(app.device['webview'])
						return new Promise((resolve) => {

							app.once('phonegap_notificationList', ((res) => {
								resolve(res);
							}));

							webkit.messageHandlers.notificationList.postMessage(null);
						});
				},
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
					if(app.device.android)
						app.$('html').removeClass('android-statusbar');
					else if(app.device.ios && parseInt(app.device.osVersion) === 10)
						app.$('html').removeClass('ios-statusbar');

					StatusBar.hide();
				},

				show() {
					StatusBar.hide();
					StatusBar.show();

					if(app.device.android) {
						StatusBar.overlaysWebView(true);
						StatusBar.styleLightContent();
						app.$('html').addClass('android-statusbar');
					} else if(app.device.ios && parseInt(app.device.osVersion) === 10)
						app.$('html').addClass('ios-statusbar');
				},

				visible() {
					return StatusBar.isVisible;
				}
			},

			// ...

			appDebug(params) {
				return new Promise((resolve, reject) => {

					app.once('phonegap_callbackDebug', ((res) => {
						if(res && res.match(/done/i))
							resolve('done');
						else reject('error');
					}));

					if(app.device['webview'])
						webkit.messageHandlers.callbackDebug.postMessage(params);
				})
			}
		}
	}

};
