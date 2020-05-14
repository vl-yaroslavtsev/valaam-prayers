export default {
	methods: {
		toggleReadMode() {
			if (!this.readMode) return;
			this.readMode.toggle();
		}
	}
}
