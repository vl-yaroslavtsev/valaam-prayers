import EventsClass from 'framework7/utils/events-class';
/**
* Глобальное состояние приложения
* @see https://github.com/hankchizljaw/vanilla-js-state-management
* API cоответствует vuex
* @see https://vuex.vuejs.org/ru/api/#vuex-store
*/
class Store extends EventsClass {
  constructor({ name, parent, state, actions, mutations, getters, modules }) {
    super();

    this.name = name || 'root';
    this.parent = parent || this;

    this.namespace = this.generateNs(this.parent);
    this.state = state || {};
    this.injectState();

    this.actions = actions || {};
    this.mutations = mutations || {};

    this.getters = this.registerGetters(getters || {});
    this.modules = this.registerModules(modules || {});


  }

  generateNs(parent) {
    let namespace = this.name === 'root' ? '' : this.name + '/';
    while (parent.name !== 'root') {
      namespace = parent.name + '/' + namespace;
      parent = parent.parent;
    }

    this.rootState = parent.state;
    this.root = parent;

    return namespace;
  }

  registerGetters(getters) {
    let result = {};
    for (let [key, value] of Object.entries(getters)) {
      const getValue = () => {
        return value(this.state, this.getters, this.root.state, this.root.getters)
      };

      Object.defineProperty(result, key, {
        get: getValue
      });
      if (this.name !== 'root') {
        Object.defineProperty(this.root.getters, this.namespace + key, {
          get: getValue
        });
      }
    }

    return result;
  }

  /**
  * Регистрируем модули
  * @param  {Object} modules Описание модулей
  * @return {Object} зарегистированные модули
  */
  registerModules(modules) {
    let result = {};
    for (let name of Object.keys(modules)) {
      result[name] = new Store({
        name,
        parent: this,
        ...modules[name]
      });
    }
    return result;
  }

  /**
  * Состояние модуля переносим в глобальное состояние
  */
  injectState() {
    if (this.name === 'root') return;

    let namespaceKeys = this.namespace.split('/');
    namespaceKeys.pop();
    let state = this.root.state;
    for (let i = 0; i < namespaceKeys.length; i++) {
      let key = namespaceKeys[i];
      if (i === namespaceKeys.length - 1) {
        state[key] = this.state;
        break;
      } else if (!state[key]) {
        state[key] = {};
      }
      state = state[key];
    }
  }

  /**
  * A dispatcher for actions that looks in the actions
  * collection and runs the action if it can find it
  *
  * @param {string} actionKey
  * @param {mixed} payload
  * @returns {boolean}
  * @memberof Store
  */
  async dispatch(actionKey, payload) {
    // Run a quick check to see if the action actually exists
    // before we try to run it
    let { module, key } = this.getModuleByNs(actionKey);
    if (module) {
      return module.dispatch(key, payload);
    }

    if(typeof this.actions[actionKey] !== 'function') {
      console.error(`Action "${actionKey} doesn't exist.`);
      return false;
    }

    // Let anything that's watching the status know that we're dispatching an action
    this.status = 'action';

    // Publish the change event for the components that are listening
    this.emit('action', {type: this.namespace + actionKey, payload}, this.state);

    // Actually call the action and pass it the Store context and whatever payload was passed
    return this.actions[actionKey](
      {
        commit: this.commit.bind(this),
        dispatch: this.dispatch.bind(this),
        state: this.state,
        rootState: this.root.state,
        getters: this.getters,
        rootGetters: this.root.getters,
      },
      payload
    );
  }

  /**
  * Look for a mutation and modify the state object
  * if that mutation exists by calling it
  *
  * @param {string} mutationKey
  * @param {mixed} payload
  * @returns {boolean}
  * @memberof Store
  */
  commit(mutationKey, payload) {

    let { module, key } = this.getModuleByNs(mutationKey);
    if (module) {
      return module.commit(key, payload);
    }

    // Run a quick check to see if this mutation actually exists
    // before trying to run it
    if(typeof this.mutations[mutationKey] !== 'function') {
      console.log(`Mutation "${mutationKey}" doesn't exist`);
      return false;
    }

    // Let anything that's watching the status know that we're mutating state
    this.status = 'mutation';

    this.mutations[mutationKey](this.state, payload);

    // Trace out to the console. This will be grouped by the related action
    console.log(`commit: ${this.namespace}${mutationKey}`, payload);

    // Publish the change event for the components that are listening
    this.root.emit('mutation', {type: this.namespace + mutationKey, payload}, this.state);

    return true;
  }

  getModuleByNs(namespace) {
    namespace = namespace.split('/');
    if (namespace.length > 1) {
      let module = this;
      for (let i = 0; i < namespace.length - 1; i++) {
        let ns = namespace[i];
        module = module.modules[ns];
      }
      return {
        module,
        key: namespace.pop()
      };
    }

    return {
      module: null
    };
  }
}

function mapState(context, params) {
  for (let [key, value] of Object.entries(params)) {
    Object.defineProperty(context, key, {
      get: () => value(context.$app.store.state)
    });
  }
}

function mapActions(params) {
  let res = {};
  for (let [key, value] of Object.entries(params)) {
    res[key] = function(...args) {
      console.log('mapActions', key, value, this);
      return this.$app.store.dispatch(value, ...args);
    };
  }
  return res;
}

function mapGetters(context, params) {
  for (let [key, value] of Object.entries(params)) {
    Object.defineProperty(context, key, {
      get: () => {
        return (typeof value === 'function') ?
          value(context.$app.store.getters) :
          context.$app.store.getters[value]
      }
    });
  }
}

function subscribe(
  context,
  mutations,
  handler = function() { this.$update() }
) {
  let store = context.$app.store;
  let observer = ({type, payload}, state) => {
    if (mutations.includes(type)) {
      console.log('observe', {type, payload});
      handler.call(context, {type, payload});
    }
  }
  store.on('mutation', observer);

  context.$mutationObserver = observer;
}

function unsubscribe(
  context
) {
  let store = context.$app.store;
  if (context.$mutationObserver) {
    store.off('mutation', context.$mutationObserver);
  }
}




export default Store;
export { mapState, mapGetters, mapActions, subscribe, unsubscribe };

// export default class Store extends EventsClass {
//   constructor({ state, actions, mutations, modules }) {
//     super();
//
//     // Add some default objects to hold our actions, mutations and state
//     this.actions = actions || {};
//     this.mutations = mutations || {};
//     this.state = state || {};
//     this.modules = this.registerModules(modules || {});
//
//     // A status enum to set during actions and mutations
//     this.status = 'resting';
//   }
//
//   setObj(state = {}) {
//     for (let key of Object.keys(state)) {
//       let value = state[key];
//       if (typeof value === 'object' && value !== null) {
//         state[key] = this.setObj(value);
//       }
//     }
//
//     return new Proxy(state, {
//       set: (state, key, value) => {
//
//         // Set the value as we would normally
//         state[key] = value;
//
//         // Give the user a little telling off if they set a value directly
//         if(self.status !== 'mutation') {
//           console.error(`You should use a mutation to set ${key}`);
//         }
//
//         // Reset the status ready for the next operation
//         self.status = 'resting';
//
//         return true;
//       }
//     });
//   }
//
//   registerModules(modules) {
//     for (let name of Object.keys(modules)) {
//       this.modules[name] = new Module({
//         name,
//         parent: this,
//         ...modules[name]
//       });
//       this.state[name] = this.modules[name].state;
//     }
//   }
//
//   /**
//   * A dispatcher for actions that looks in the actions
//   * collection and runs the action if it can find it
//   *
//   * @param {string} actionKey
//   * @param {mixed} payload
//   * @returns {boolean}
//   * @memberof Store
//   */
//   async dispatch(actionKey, payload) {
//     // Run a quick check to see if the action actually exists
//     // before we try to run it
//     if(typeof this.actions[actionKey] !== 'function') {
//       console.error(`Action "${actionKey} doesn't exist.`);
//       return false;
//     }
//
//     // Let anything that's watching the status know that we're dispatching an action
//     this.status = 'action';
//
//     // Publish the change event for the components that are listening
//     this.emit('action', {type: actionKey, payload}, this.state);
//
//     // Actually call the action and pass it the Store context and whatever payload was passed
//     return this.actions[actionKey](this, payload);
//   }
//
//   /**
//   * Look for a mutation and modify the state object
//   * if that mutation exists by calling it
//   *
//   * @param {string} mutationKey
//   * @param {mixed} payload
//   * @returns {boolean}
//   * @memberof Store
//   */
//   commit(mutationKey, payload) {
//
//     // Run a quick check to see if this mutation actually exists
//     // before trying to run it
//     if(typeof this.mutations[mutationKey] !== 'function') {
//       console.log(`Mutation "${mutationKey}" doesn't exist`);
//       return false;
//     }
//
//     // Let anything that's watching the status know that we're mutating state
//     this.status = 'mutation';
//
//     this.mutations[mutationKey](this.state, payload);
//
//     // Trace out to the console. This will be grouped by the related action
//     console.log(`commit: ${mutationKey}`, payload);
//
//     // Publish the change event for the components that are listening
//     this.emit('mutation', {type: mutationKey, payload}, this.state);
//
//     return true;
//   }
// }
