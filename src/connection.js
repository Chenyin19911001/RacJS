const Signal = require('./signal')
const CompoundDisposable = require('./disposable/compoundDisposable')
const Disposable = require('./disposable/disposable')

class Connection {
	constructor(signal, subject) {
		this.signal = signal
		this.subject = subject
		this.disposable = null
		this.connected = false
	}

	connect() {
		if (!this.connected) {
			this.disposable = this.signal._subscribeProxy(this.subject)
		}
		this.connected = true
		return this.disposable
	}

	autoConnect() {
		let count = 0
		return new Signal(s => {
			count++
			let d1 = this.subject._subscribeProxy(s)
			let d2 = this.connect()
			return new Disposable(() => {
				d1.dispose()
				count--
				if (count === 0) {
					d2.dispose()
				}
			})
		})
	}
}

module.exports = Connection