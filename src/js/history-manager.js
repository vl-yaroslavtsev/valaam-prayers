/**
 * Обработка истории браузера
 */
import {Dom7 as $$} from 'framework7';

let app;

function init(appInstance) {
	app = appInstance;

	app.on('routeChanged', routeChangedHandler);
	app.on('viewShown', viewShownHandler);

	$$(window).on('popstate', popstateHandler);
}

function viewShownHandler(view) {
	let id  = '#' + view.el.id;

	view.history.forEach((url, index) => {
		let method = (index === 0) ? 'replaceState' : 'pushState';
		history[method]({
			view: id,
			url
		}, '');
	});
}

function routeChangedHandler(newRoute, previousRoute, router) {
	let viewId = '#' + router.el.id,
			length = router.history.length,
			prevUrl = router.history[length - 2],
			lastUrl = router.history[length - 1];
	// что-то не так
	if (lastUrl !== newRoute.url) {
		return;
	}
  // Переход вперед
	if (prevUrl === previousRoute.url) {
		if (router.popstateNavigate) {
			//console.log('routeChanged: router.popstateNavigate ',  router.popstateNavigate);
			delete router.popstateNavigate;
			return;
		}
		//console.log('routeChangedd: history.pushState',  newRoute.url, viewId);
		history.replaceState({
			view: viewId,
			url: previousRoute.url
		}, '');
		history.pushState({
			view: viewId,
			url: newRoute.url
		}, '');
	// Переход назад
	} else {
		if (router.popstateBack) {
			//console.log('routeChanged: router.popstateBack ',  router.popstateBack);
			delete router.popstateBack;
			return;
		}
		//console.log('routeChanged: history.back()');
		history.back();
	}
}

function popstateHandler(event) {
	let state = event.state;
	//console.log('onpopstate', state, event);
	if (!state || !state.view) {
		return;
	}

	let view = app.views.get(state.view),
			length = view.history.length,
			prevUrl = view.history[length - 2],
			lastUrl = view.history[length - 1];

	if (!length) {
		return;
	}

	if (prevUrl === state.url) {
		//console.log('view.router.back');
		view.router.popstateBack = true;
		view.router.back();
	} else if (lastUrl !== state.url) {
		view.router.popstateNavigate = true;
		view.router.navigate(state.url);
	}
}

export default {init};
