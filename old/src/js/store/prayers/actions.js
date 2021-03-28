import dataManager from '../../data/manager.js';
import { prayersBookId, isPrayerInSection } from '../../data/utils.js';

export default {
  async getList({ state, commit }) {
    if (state.list.e) {
      return state.list;
    }
    
    try {
      let data = await dataManager.get('prayers');
      commit('setList', data);
    } catch(err) {
      app.methods.showLoadError();
      commit('setList', {
        error: err
      });
      throw err;
    }
  },
  async getItem({ state, commit }, id) {
    if (state.item[id]) {
      return state.item[id];
    }

    try {
      let data = await dataManager.get('prayer', id);
      commit('setItem', data);

    } catch (err) {
      commit('setItem', {
        error: err
      });
      throw err;
    }
  }
};
