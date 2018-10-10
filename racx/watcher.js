class Watcher {
  constructor(config, store) {
    this.store = store
    if (typeof config === 'function') {
      this.cb = config
      this.dep = '*'
      this.sync = false
    } else {
      this.cb = config.subscriber
      this.sync = config.sync || false
      let dep = config.dep
      if (dep) {
        if (Array.isArray(dep)) {
          dep = dep.map(d => this.store.racx_property_key + '.' + d)
        } else {
          dep = [this.store.racx_property_key + '.' + dep]
        }
      }
      this.dep = dep || '*'
    }
    this._active = false
  }

  active() {
    if (this.sync) {
      this.cb.call(this.store)
    } else {
      if (this._active) {
        return
      }
      this._active = true
      this.timeoutId = setTimeout(() => {
        this.execute()
      }, 0)
    }
  }

  execute() {
    if (this._active) {
      this.cb.call(this.store)
      this.clear()
    }
  }

  clear() {
    this._active = false
    this.timeoutId && clearTimeout(this.timeoutId)
    this.timeoutId = null
  }
}
module.exports = Watcher