/**
 * Framework7 Plugin PhoneGap 0.9.0
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

				if(app.data.debug)
				{
					app.phonegap.downloadData('calendars-2021D-1245.image', (count, total) => {
						console.log(count, total);
					})
						.then(() => {
							console.log('done');
						})
						.catch(() => {
							console.log('error');
						})
					;
				}
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

			// ...

			canApplePay() {
				return this.exec(arguments.callee.name, null, 'once', false);
			},

			canEvaluatePolicy() {
				return this.exec(arguments.callee.name, null, 'once', false);
			},

			evaluatePolicy(title) {
				return this.exec(arguments.callee.name, title, 'once', false);
			},

			// ...

			downloadData(filename, progress) {
				app.off('phonegap_DownloadProgress_' + filename)
				if(typeof progress === 'function')
					// noinspection JSValidateTypes
					app.on('phonegap_DownloadProgress_' + filename, progress)

				return this.exec(arguments.callee.name, filename, 'once', false, 'DownloadData_' + filename);
			},

			// ...

			notification: {
				add(schedule) {
					app.phonegap.exec('notificationAdd', schedule);
				},

				update(schedule) {
					schedule['id'] && app.phonegap.exec('notificationRemove', schedule['id']);
					app.phonegap.exec('notificationAdd', schedule);
				},

				remove(items) {
					if(typeof items === 'string' || typeof items === 'number')
						items = [items];

					app.phonegap.exec('notificationRemove', items);
				},

				clear() {
					app.phonegap.exec('notificationRemoveAll', null);
				},

				list() {
					return app.phonegap.exec('notificationList', null, 'once', []);
				},
			},

			// ...

			/** @var StatusBar */

			statusbar: {
				overlaysWebView(doOverlay) {
					window['StatusBar'] && StatusBar.overlaysWebView(doOverlay);
				},

				styleDefault() {
					window['StatusBar'] && StatusBar.styleDefault();
				},

				styleLightContent() {
					window['StatusBar'] && StatusBar.styleLightContent();
				},

				styleBlackTranslucent() {
					window['StatusBar'] && StatusBar.styleBlackTranslucent();
				},

				styleBlackOpaque() {
					window['StatusBar'] && StatusBar.styleBlackOpaque();
				},

				backgroundColorByName(colorname) {
					return window['StatusBar'] && StatusBar.backgroundColorByName(colorname);
				},

				backgroundColorByHexString(hexString) {
					window['StatusBar'] && StatusBar.backgroundColorByHexString(hexString);
				},

				hide() {
					if(app.device.android)
						app.$('html').removeClass('android-statusbar');
					else if(app.device.ios && parseInt(app.device.osVersion) === 10)
						app.$('html').removeClass('ios-statusbar');

					window['StatusBar'] && StatusBar.hide();
				},

				show() {
					window['StatusBar'] && StatusBar.hide();
					window['StatusBar'] && StatusBar.show();

					if(app.device.android) {
						window['StatusBar'] && StatusBar.overlaysWebView(true);
						window['StatusBar'] && StatusBar.styleLightContent();
						app.$('html').addClass('android-statusbar');
					} else if(app.device.ios && parseInt(app.device.osVersion) === 10)
						app.$('html').addClass('ios-statusbar');
				},

				visible() {
					return window['StatusBar'] && StatusBar.isVisible;
				}
			},

			// ...

			appDebug(params) {
				return this.exec(arguments.callee.name, params, 'once');
			},

			// ...

			exec(fn, params, event, def, eventname) {

				function android() {
					/** @var cordova */
					if(app.device.android)
						switch(fn) {
							case 'hideSplash':
								navigator['splashscreen'].hide();
								return true;

							case 'notificationAdd':
								if(params['trigger']['every'])
									params['trigger']['count'] = 0;
								cordova.plugins.notification.local['schedule'](params);
								return true;
							case 'notificationList':
								cordova.plugins.notification.local['getIds']((res) => {
									app.emit(`phonegap_${fn}`, res);
								});
								return true;
							case 'notificationRemove':
								cordova.plugins.notification.local['cancel'](params);
								return true;
							case 'notificationRemoveAll':
								cordova.plugins.notification.local['cancelAll']();
								return true;
						}
					return false;
				}

				function ios() {
					/** @var webkit */
					/** @var webkit.messageHandlers*/
					if(app.device.webview && webkit.messageHandlers[fn]) {
						webkit.messageHandlers[fn].postMessage(params);
						return true;
					}

					return false;
				}

				if(typeof event === 'string') {
					return new Promise((resolve, reject) => {

						app[event]('phonegap_' + (eventname || fn), (result, error) => {
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
