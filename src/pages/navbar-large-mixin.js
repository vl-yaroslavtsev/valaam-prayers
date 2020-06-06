export default {
	on: {
		pageInit(e, page) {
			let title = page.$el.find('.title-large-text');
			setTimeout(() => {
				page.el.style.setProperty(
					'--f7-navbar-large-title-height',
					`${title.height() + 8}px`
				);
			}, 0);
		}
	}
}
