/*
Заглушка для нативного апи для работы в вебе
*/

let StatusBar = {
	hide(){},
	show(){},
	overlaysWebView(){},
	styleDefault(){},
	styleLightContent(){},
	styleBlackTranslucent(){},
	styleBlackOpaque(){},
	backgroundColorByName(){},
	backgroundColorByHexString(){}
};

window['StatusBar'] = StatusBar;
