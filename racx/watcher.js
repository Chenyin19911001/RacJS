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
        if (!Array.isArray(dep)) {
          dep = [dep]
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
      Promise.resolve().then(() => {
        this.execute()
      })
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
  }
}
module.exports = Watcher