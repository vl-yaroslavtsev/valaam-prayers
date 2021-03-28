export default {
  setList(state, list) {
    state.list.splice(0, 0, ...list);
  },

  setItem(state, record) {
    let index = state.list.findIndex(({id}) => id === record.id);

    for (let key of Object.keys(state.lastInSection)) {
      delete state.lastInSection[key];
    }

    if (index == - 1) {
      return state.list.push(record);
    }

    state.list.splice(index, 1, record);
  }
};
