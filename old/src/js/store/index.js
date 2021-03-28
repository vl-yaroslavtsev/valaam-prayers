import actions from './actions';
import mutations from './mutations';
import state from './state';
import Store from './store';
import PrayersModule from './prayers/index';
import ReadHistoryModule from './read-history/index';

export default new Store({
  actions,
  mutations,
  state,
  modules: {
    prayers: PrayersModule,
    readHistory: ReadHistoryModule
  }
});
