const Subject = require('./subject')
const Notification = require('../notification')

class ReplaySubject extends Subject {
	constructor() {
        super()
        this.values = []
	}

	_subscribeProxy(s) {
		let d = super._subscribeProxy(s)
		if (this.values.length > 0) {
			this.values.forEach(notification => {
				notification.subscribe(s)
			})
		}
		return d
	}

	static currentSubject(initialValue, ignoreInitial = false) {
		return new CurrentSubject(initialValue, ignoreInitial)
	}

	sendNext(v) {
		this.values.push(Notification.createNext(v))
		super.sendNext(v)
	}
    
    sendComplete() {
	    this.values.push(Notification.createComplete())
	    super.sendComplete()
	}

	sendError(error) {
		this.values.push(Notification.createError(error))
	    super.sendError(error)
	}
}

module.exports = ReplaySubject