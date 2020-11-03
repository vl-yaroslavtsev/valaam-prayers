import db from '../../data/db.js';

const READ_HISTORY_MAX_SIZE = 1000;

export default {

  async getList({ state, commit }) {
    if (state.list.length > 0) {
      return;
    }
    let list = await db.read_history.getAll();
    commit('setList', list);
  },

  async setItem({ state, commit }, record) {
    await db.read_history.put(record);
    commit('setItem', record);
  },

  async limit({ state, commit }) {
    let count = await db.read_history.count();
    if (count <= READ_HISTORY_MAX_SIZE) {
      return;
    }
    let keys = await db.read_history.getAllKeysFromIndex('by-date');
    let keysToDelete = keys.slice(0, count - READ_HISTORY_MAX_SIZE);

    await Promise.all(
      keysToDelete.map((key) => db.read_history.delete(key))
    );
  }
};
