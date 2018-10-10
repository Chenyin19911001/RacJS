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
        if (Array.isArray(dep)) {
          dep = dep.map(d => store.racx_property_key + '.' + d)
        } else {
          dep = [store.racx_property_key + '.' + dep]
        }
        this.dep = dep
        this.value = this.valueFunc.call(this.store)
      } else {
      	this.autoDep()
      }
    }
  }

  autoDep() {
  	this.store.racx_property_isCollectingDep = true
    this.value = this.valueFunc.call(this.store)
    this.dep = this.store.racx_property_collectDeps
    this.store.racx_property_collectDeps = []
    this.store.racx_property_isCollectingDep = false
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
