const Subject = require('./subject')

class CurrentSubject extends Subject {
	constructor(initialValue, ignoreInitial = false) {
        super()
        this.hasValue = !ignoreInitial
        this.value = initialValue
	}

	_subscribeProxy(s) {
		let d = super._subscribeProxy(s)
		this.hasValue && s.sendNext(this.value)
		return d
	}

	static currentSubject(initialValue, ignoreInitial = false) {
		return new CurrentSubject(initialValue, ignoreInitial)
	}

	sendNext(v) {
		this.value = v
		this.hasValue = true
		super.sendNext(v)
	}
}

module.exports = CurrentSubject