export default {
  setList(state, payload) {
    state.list = payload;
  },
  setItem(state, payload) {
    state.item[payload.id] = payload;
  }
};
