/**
 * Framework7 Plugin PhoneGap 0.9.7
 * PhoneGap plugin extends Framework7 for ios & android native
 *
 * Copyright 2020 Ивайло Тилев
 */

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

			downloadRequest(url) {
				return this.exec(arguments.callee.name, url, 'once', -1);
			},

			downloadStatus() {
				return this.exec(arguments.callee.name, null, 'once', {});
			},

			downloadRemove(id) {
				this.exec(arguments.callee.name, id);
			},

			getSettings() {
				return this.exec(arguments.callee.name, null, 'once', {});
			},

			hideSplash() {
				this.exec(arguments.callee.name, null);
			},

			internalBrowser(url) {
				if(!this.exec(arguments.callee.name, url))
					document.location = url;
			},

			keepScreenOn(state) {
				this.exec(arguments.callee.name, state);
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

				hide(setInsets = true) {
					const insets = app.data['settings'] && app.data['settings']['windowInsets'];

					if(app.device.android && setInsets && insets)
						app.$(':root')[0].style.setProperty('--f7-safe-area-top', '0px');

					if(app.device.ios && parseInt(app.device.osVersion) === 10)
						app.$('html').removeClass('ios-statusbar');

					app.phonegap.exec('statusBarHide', null);
					this.isVisible = false;
				},

				show(setInsets = true) {
					const insets = app.data['settings'] && app.data['settings']['windowInsets'];

					if(app.device.android && setInsets && insets)
						app.$(':root')[0].style.setProperty('--f7-safe-area-top', insets.top + 'px');

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

			debug(params) {
				return this.exec(arguments.callee.name, params, 'once');
			},

			// ...

			exec(fn, params, event, def) {

				function call() {
					if(app.device.android) {
						/** @namespace AndroidJS */
						if(window['AndroidJS'] && typeof AndroidJS[fn] === 'function') {
							if(params === null)
								AndroidJS[fn]()
							else if(typeof params === 'object')
								AndroidJS[fn](JSON.stringify(params))
							else AndroidJS[fn](params)

							return true;
						}
					} else if(app.device.ios) {
						/** @namespace webkit.messageHandlers */
						if(window['webkit'] && typeof webkit.messageHandlers[fn] === 'object') {
							webkit.messageHandlers[fn].postMessage(params);
							return true;
						}
					}

					return false;
				}

				if(typeof event === 'string') {
					return new Promise((resolve, reject) => {
						app[event](`phonegap_${fn}`, (result, error) => {
							result !== undefined ? resolve(result) : reject(error);
						});

						call() || resolve(def);
					});
				} else return call();
			}
		}
	},

	on: {
		init() {
			// this.phonegap.rest = this.params.phonegap.rest;
		},

		onWindowInsets(insets) {
			try {
				const root = this.$(':root')[0];
				root.style.setProperty('--f7-safe-area-top', insets.top + 'px');
				root.style.setProperty('--f7-safe-area-inset-top', insets.top + 'px');
				root.style.setProperty('--f7-safe-area-bottom', insets.bottom + 'px');
				root.style.setProperty('--f7-safe-area-inset-bottom', insets.bottom + 'px');
				root.style.setProperty('--f7-safe-area-left', insets.left + 'px');
				root.style.setProperty('--f7-safe-area-inset-left', insets.left + 'px');
				root.style.setProperty('--f7-safe-area-outer-left', insets.left + 'px');
				root.style.setProperty('--f7-safe-area-right', insets.right + 'px');
				root.style.setProperty('--f7-safe-area-inset-right', insets.right + 'px');
				root.style.setProperty('--f7-safe-area-outer-right', insets.right + 'px');

				this.$('.safe-areas').forEach((e) => {
					e.style.setProperty('--f7-safe-area-left', insets.left + 'px');
					e.style.setProperty('--f7-safe-area-outer-left', insets.left + 'px');
					e.style.setProperty('--f7-safe-area-right', insets.right + 'px');
					e.style.setProperty('--f7-safe-area-outer-right', insets.right + 'px');
				});
			} catch (e) {
			}
		}
	}

};
