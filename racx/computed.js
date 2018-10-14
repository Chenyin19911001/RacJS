const nil = 'racx_store_nil'
class Computed {
  constructor(config, store) {
    this.store = store
    if (typeof config === 'function') {
      this.valueFunc = config
      this.autoDep()
    } else {
      this.valueFunc = config.value
      let dep = config.dep
      if (dep) {
        if (!Array.isArray(dep)) {
          dep = [dep]
        }
        this.dep = dep
        this.value = this.valueFunc.call(this.store)
      } else {
      	this.autoDep()
      }
    }
  }

  autoDep() {
  	this.store.racxAutoRun = true
    this.store.racxTempDeps = []
    this.value = this.valueFunc.call(this.store)
    this.dep = this.store.racxTempDeps
    this.store.racxTempDeps = []
    this.store.racxAutoRun = false
  }

  computed() {
    if (this.value === nil) {
      this.value = this.valueFunc.call(this.store)
    }
    return this.value
  }

  watched() {
    this.value = nil
  }
}

module.exports = Computed
