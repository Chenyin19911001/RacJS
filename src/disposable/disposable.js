class Disposable {
	constructor(disposeCb) {
		this.disposeCb = disposeCb
		this.disposed = false
	}

	dispose() {
		if (this.disposed) {
			return
		}
		this.disposeCb && this.disposeCb()
		this.disposed = true
	}
}

module.exports = Disposable