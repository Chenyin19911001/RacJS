const getHookValue = require('./hook')
const { Subject, Disposable, CompoundDisposable } = require('../src')
const prefix = 'racx_store_'
const nil = 'racx_nil'
const Watcher = require('./watcher')
const UUID_Prefix = 'racx_uuid_'
const { dispose } = require('./subscription')

class Store {
  constructor(config) {
    this.subject = new Subject()
    this.disposable = new CompoundDisposable()
    this.key = config.key ? config.key : 'store'
    this.initObservable(config.observable, this.key)
    this.watchers = {}
    this.initComputed(config.computed)
    this.startId = 0
  }

  uuid() {
    ++this.startId
    return UUID_Prefix + this.startId
  }

  initObservable(observable) {
    this.innerObservable = getHookValue(observable, this.key)
    Object.keys(observable).forEach(key => {
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get: function() {
          return this.innerObservable[key]
        },
        set: function(value) {
          this.innerObservable[key] = value
        }
      })
    })
    this.disposable.addDisposable(
      new Disposable(() => {
        dispose(this.innerObservable.__subscription)
      })
    )
    this.disposable.addDisposable(
      this.innerObservable.__subscription.subject._subscribeProxy(this.subject)
    )
  }

  initComputed(computed) {
    Object.keys(computed).forEach(key => {
      this[prefix + key] = nil
      let keyConfig = safeConfig(computed[key], this.key)
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get: function() {
          let value = this[prefix + key]
          if (value === nil) {
            this.watchers[key].execute()
          }
          return this[prefix + key]
        },
        set: function(value) {
          console.warn('you cannot set a computed value')
          this[prefix + key] = value
        }
      })
      this.watchers[key] = new Watcher(
        {
          sync: keyConfig.sync,
          cb: () => {
            this[prefix + key] = keyConfig.value.call(this)
            this.subject.sendNext({
              key: this.key + '.' + key,
              value: this[prefix + key]
            })
          }
        },
        this
      )
      if (!keyConfig.lazy) {
        this[prefix + key] = keyConfig.value.call(this)
      }
      this.disposable.addDisposable(
        this.innerObservable.__subscription.subject.subscribeNext(v => {
          if (containDep(v, keyConfig.dep)) {
            this[prefix + key] = nil
            this.watchers[key].active()
          }
        })
      )
    })
  }

  inject(config) {
    let id = this.uuid()
    let watchConfig = safeWatchConfig(config, this.key)
    this.watchers[id] = new Watcher({
      sync: watchConfig.sync,
      cb: () => {
        watchConfig.cb()
      }
    })
    let disposable = new CompoundDisposable()
    this.disposable.addDisposable(disposable)
    disposable.addDisposable(
      new Disposable(() => {
        delete this.watchers[id]
      })
    )
    disposable.addDisposable(
      this.innerObservable.__subscription.subject.subscribeNext(v => {
        if (containDep(v, watchConfig.dep)) {
          this.watchers[id].active()
        }
      })
    )
    return disposable
  }

  clear() {
    this.disposable.dispose()
  }
}

module.exports = Store

function containDep(value, keys) {
  if (keys === '*') {
    return true
  }
  if (Array.isArray(value)) {
    let ks = value.map(v => v.key)
    return keys.some(k => ks.some(kk => kk.startsWith(k)))
  } else {
    return keys.some(k => value.key.startsWith(k))
  }
}

function safeConfig(config, storeKey) {
  if (typeof config === 'function') {
    return {
      value: config,
      dep: '*',
      sync: false,
      lazy: false
    }
  }
  let dep = config.dep
  if (dep) {
    if (Array.isArray(dep)) {
      dep = dep.map(d => storeKey + '.' + d)
    } else {
      dep = [storeKey + '.' + dep]
    }
  }
  return {
    value: config.value,
    dep: dep || '*',
    sync: config.sync || false,
    lazy: config.lazy || false
  }
}

function safeWatchConfig(config, storeKey) {
  if (typeof config === 'function') {
    return {
      cb: config,
      dep: '*',
      sync: false
    }
  }
  let dep = config.dep
  if (dep) {
    if (Array.isArray(dep)) {
      dep = dep.map(d => storeKey + '.' + d)
    } else {
      dep = [storeKey + '.' + dep]
    }
  }
  return {
    cb: config.subscriber,
    dep: dep || '*',
    sync: config.sync || false
  }
}

//test
const config = {
  key: 'store',
  observable: {
    a: []
  },
  computed: {
    total: {
      dep: ['a'],
      value: function() {
        return this.a.length
      },
      sync: true,
      lazy: false
    }
  }
}

let store = new Store(config)
store.subject.subscribeNext(v => {
  console.log(v)
})

store.a.push(1)
store.a.push(3)
store.total = 3
