const getHookValue = require('./hook')
const { Subject, Disposable, CompoundDisposable } = require('../src')
const Watcher = require('./watcher')
const Computed = require('./computed')
const { dispose } = require('./subscription')
const Property_Prefix = 'racx_property_'

class Store {
  constructor(config) {
    this.racx_property_subject = new Subject()
    this.racx_property_disposable = new CompoundDisposable()
    this.racx_property_key = config.key ? config.key : 'store'
    this.racx_property_isCollectingDep = false
    this.racx_property_collectDeps = []
    this.initObservable(config.observable)
    this.racx_property_computed = {}
    this.initComputed(config.computed)
    this.racx_property_startId = 0
    this.racx_property_watchers = {}
  }

  uuid() {
    ++this.racx_property_startId
    return 'racx_uuid_' + this.racx_property_startId
  }

  initObservable(observable) {
    this.racx_property_innerObservable = getHookValue(observable, this.racx_property_key)
    Object.keys(observable).forEach(key => {
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get: function() {
          if (this.racx_property_isCollectingDep) {
            this.racx_property_collectDeps.push(this.racx_property_key + '.' + key)
          }
          return this.racx_property_innerObservable[key]
        },
        set: function(value) {
          this.racx_property_innerObservable[key] = value
        }
      })
    })
    this.racx_property_disposable.addDisposable(
      new Disposable(() => {
        dispose(this.racx_property_innerObservable.__subscription)
      })
    )
    this.racx_property_disposable.addDisposable(
      this.racx_property_innerObservable.__subscription.subject.subscribeNext(v => {
        let computedWatchers = []
        Object.keys(this.racx_property_computed).forEach(key => {
          let computed = this.racx_property_computed[key]
          if (containDep(v, computed.dep)) {
            computed.watched()
            computedWatchers.push({ key: this.racx_property_key + '.' + key })
          }
        })
        let nv = computedWatchers
        if (Array.isArray(v)) {
          nv = computedWatchers.concat(v)
        } else {
          nv.push(v)
        }
        this.racx_property_subject.sendNext(nv)
      })
    )
  }

  initComputed(computed) {
    Object.keys(computed).forEach(key => {
      this.racx_property_computed[key] = new Computed(computed[key], this)
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get: function() {
          if (this.racx_property_isCollectingDep) {
            this.racx_property_collectDeps.push(this.racx_property_key + '.' + key)
          }
          return this.racx_property_computed[key].computed()
        },
        set: function(value) {
          console.warn('you can not set a new value for a computed property')
          this.racx_property_computed[key].value = value
        }
      })
    })
  }

  inject(config, collectDep = false) {
    let id = this.uuid()
    this.racx_property_watchers[id] = new Watcher(config, this)
    let disposable = new CompoundDisposable()
    this.racx_property_disposable.addDisposable(disposable)
    disposable.addDisposable(
      new Disposable(() => {
        delete this.racx_property_watchers[id]
      })
    )
    if (collectDep) {
      this.racx_property_isCollectingDep = true
      this.racx_property_watchers[id].cb.call(this)
      this.racx_property_watchers[id].dep = this.racx_property_collectDeps
      this.racx_property_collectDeps = []
      this.racx_property_isCollectingDep = false
    }
    disposable.addDisposable(
      this.racx_property_subject.subscribeNext(v => {
        if (containDep(v, this.racx_property_watchers[id].dep)) {
          this.racx_property_watchers[id].active()
        }
      })
    )
    return disposable
  }

  autoRun(config) {
    return this.inject(config, true)
  }

  clear() {
    this.racx_property_disposable.dispose()
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

//test
// const config = {
//   key: 'store',
//   observable: {
//     a: [], //数组
//     b: 2,
//     c: {
//       aa: 1
//     }
//   },
//   computed: {
//     total: {
//       dep: 'a',
//       value: function() {
//         return this.a.length
//       }
//     },
//     total2: function() {
//       return this.a[1] + 2
//     },
//     total3: {
//       dep: ['a[0]', 'c.aa'],
//       value: function() {
//         return this.a[0] + this.c.aa
//       }
//     }
//   }
// }

// let proxyStore = new Store(config)
// proxyStore.autoRun(() => {
//   console.log(proxyStore.total3)
// })
// proxyStore.a.push(1)
// proxyStore.a.unshift(2)

