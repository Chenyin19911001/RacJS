class Watcher {
	constructor(config, store) {
		this.sync = config.sync
        this.cb = config.cb
        this._active = false
        this.store = store
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