/**
 * Framework7 Plugin PhoneGap 0.9.2
 * PhoneGap plugin extends Framework7 for ios native
 *
 * Copyright 2020 Ивайло Тилев
 */

// noinspection JSUnusedGlobalSymbols
const Framework7PhoneGap = {

	name: 'phonegap',

	params: {},

	create() {
		const app = this;

		// noinspection JSUnusedGlobalSymbols
		app.phonegap = {

			appInit() {
				this.exec(arguments.callee.name, null);
			},

			applicationContext(data) {
				this.exec(arguments.callee.name, data);
			},

			getUserSettings() {
				return this.exec(arguments.callee.name, null, 'once', {simulator: true});
			},

			hideSplash() {
				this.exec(arguments.callee.name, null);
			},

			networkIndicator(visible) {
				this.exec('networkActivityIndicatorVisible', visible);
			},

			playSound(code = 1104, alert = false) {
				this.exec(alert ? 'playAlertSound' : 'playSystemSound', code);
			},

			terminate() {
				this.exec(arguments.callee.name, null);
			},

			// ...

			canApplePay() {
				return this.exec(arguments.callee.name, null, 'once', false);
			},

			// ...

			// downloadData(filename, progress) {
			// 	app.off('phonegap_DownloadProgress_' + filename)
			// 	if(typeof progress === 'function')
			// 		// noinspection JSValidateTypes
			// 		app.on('phonegap_DownloadProgress_' + filename, progress)
			//
			// 	return this.exec(arguments.callee.name, filename, 'once', false, 'DownloadData_' + filename);
			// },

			// ...

			// notification: {
			// 	add(schedule) {
			// 		app.phonegap.exec('notificationAdd', schedule);
			// 	},
			//
			// 	update(schedule) {
			// 		schedule['id'] && app.phonegap.exec('notificationRemove', schedule['id']);
			// 		app.phonegap.exec('notificationAdd', schedule);
			// 	},
			//
			// 	remove(items) {
			// 		if(typeof items === 'string' || typeof items === 'number')
			// 			items = [items];
			//
			// 		app.phonegap.exec('notificationRemove', items);
			// 	},
			//
			// 	clear() {
			// 		app.phonegap.exec('notificationRemoveAll', null);
			// 	},
			//
			// 	list() {
			// 		return app.phonegap.exec('notificationList', null, 'once', []);
			// 	},
			// },

			// ...

			/** @var StatusBar */

			statusbar: {

				isVisible: true,

				overlaysWebView(doOverlay) {
					app.phonegap.exec('statusBarOverlaysWebView', doOverlay);
				},

				styleDefault() {
					app.phonegap.exec('statusBarStyleDefault', null);
				},

				styleLightContent() {
					app.phonegap.exec('statusBarStyleLightContent', null);
				},

				styleBlackTranslucent() {
					app.phonegap.exec('statusBarStyleBlackTranslucent', null);
				},

				styleBlackOpaque() {
					app.phonegap.exec('statusBarStyleBlackOpaque', null);
				},

				backgroundColorByHexString: function(hexString) {
					if(hexString === false)
						hexString = '00000000';

					if(hexString.charAt(0) === "#")
						hexString = hexString.substr(1);

					if(hexString.length === 3) {
						const split = hexString.split("");
						hexString = split[0] + split[0] + split[1] + split[1] + split[2] + split[2];
					}

					if(hexString.length === 4) {
						const split = hexString.split("");
						hexString = split[0] + split[0] + split[1] + split[1] + split[2] + split[2] + split[3] + split[3];
					}

					if(hexString.length === 6)
						hexString = "ff" + hexString;

					app.phonegap.exec('statusBarBackgroundColorByHexString', hexString);
				},

				hide() {
					if(app.device.android)
						app.$('html').removeClass('android-statusbar');

					if(app.device.ios && parseInt(app.device.osVersion) === 10)
						app.$('html').removeClass('ios-statusbar');

					app.phonegap.exec('statusBarHide', null);
					this.isVisible = false;
				},

				show() {
					if(app.device.android)
						app.$('html').addClass('android-statusbar');

					if(app.device.ios && parseInt(app.device.osVersion) === 10)
						app.$('html').addClass('ios-statusbar');

					app.phonegap.exec('statusBarShow', null);
					this.isVisible = true;
				},

				visible() {
					return this.isVisible;
				}
			},

			// ...

			appDebug(params) {
				return this.exec(arguments.callee.name, params, 'once');
			},

			// ...

			exec(fn, params, event, def, eventname) {

				function android() {
					if(app.device.android && window['AndroidJS']) {
						/** @namespace AndroidJS */
						AndroidJS.postMessage(JSON.stringify({name: fn, params: params}))

								return true;
						}
					return false;
				}

				function ios() {
					if(app.device.webview && webkit.messageHandlers[fn]) {
						/** @namespace webkit.messageHandlers */
						webkit.messageHandlers[fn].postMessage(params);
						return true;
					}

					return false;
				}

				if(typeof event === 'string') {
					return new Promise((resolve, reject) => {
						app[event](`phonegap_${fn}`, (result, error) => {
							result !== undefined ? resolve(result) : reject(error);
						});

						android() || ios() || resolve(def);
					});
				} else android() || ios();
			}
		}
	},

	on: {
		init() {
			// this.phonegap.rest = this.params.phonegap.rest;
		}
	}

};
