function updateLargeTitle(page) {
	let title = page.$el.find('.title-large-text');

	page.el.style.setProperty(
		'--f7-navbar-large-title-height',
		`${title.height() + 8}px`
	);
	let needHideOnScrollHandler = false,
			needCollapseOnScrollHandler = true,
			needTransparentOnScroll = true;
	app.navbar.initNavbarOnScroll(
		page.el,
		page.$el.find('.navbar')[0],
		needHideOnScrollHandler,
		needCollapseOnScrollHandler,
		needTransparentOnScroll
	);
}

export default {
	on: {
		pageInit(e, page) {
			page.$el.on('navbar-render', () => {
				updateLargeTitle(page);
			});
			setTimeout(() => {
				updateLargeTitle(page);
			}, 0);
		}
	}
}
