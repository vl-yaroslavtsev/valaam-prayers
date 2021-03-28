export default {
  async setVersion(store, payload) {
    return new Promise((resolve) => {
      setTimeout(() => {
        store.commit('setVersion', payload);
        resolve();
      }, 1000);
    });
  }
};
