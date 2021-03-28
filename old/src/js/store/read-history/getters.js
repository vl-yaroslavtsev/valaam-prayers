import { prayersBookId, isPrayerInSection } from '../../data/utils.js';
import { sortBy } from 'lodash-es';

export default {
  listByParent: state => parentId => {
    return state.list.filter(({parent_id}) => parent_id === parentId);
  },

  listByBook: state => bookId => {
    return state.list.filter(({book_id}) => book_id === bookId);
  },

  /**
   * Последняя запись о чтении в разделе
   * @param  {mixed} state   Состояние
   * @param  {mixed} getters Геттеры
   * @return {[type]}         [description]
   */
  lastInSection: (state, getters, rootState) => sectionId => {
    if (state.lastInSection[sectionId]) {
      return state.lastInSection[sectionId];
    }

    if (!rootState.prayers.list.e) {
      return;
    }

    let readingDepth, lastReading;
    const bookId = prayersBookId({sectionId});
    if (!bookId) return;

    let readings = getters.listByBook(bookId);
    if (!readings.length) return;

    readings = sortBy(readings, ['date']);
    for (let i = readings.length - 1; i >= 0; i--) {
      if (readingDepth = isPrayerInSection(readings[i].id, [sectionId])) {
         lastReading = readings[i];
         break;
      }
    }
    if (!lastReading) {
       return;
    }
    lastReading = Object.assign({}, lastReading);

    let path = lastReading.path;
    path = path.slice(path.length - readingDepth + 1);
    path = path.concat(lastReading.name);

    lastReading.path = path.join(' • ');

    state.lastInSection[sectionId] = lastReading;
    return lastReading;
  },

  item: state => itemId => {
    return state.list.find(({id}) => itemId === id);
  }
};
