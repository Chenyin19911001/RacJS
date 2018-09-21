const Disposable = require('./disposable')

class CompoundDisposable extends Disposable {
	constructor(disposables) {
		super()
        this.disposables = disposables || []
        //为了处理JS单线程dispose中,对this.disposables数组的修改
        this.pendingActions = []
	}

	addDisposable(disposable) {
		if (disposable == null || disposable.disposed) {
			return
		}
		if (this.disposed) {
			disposable && disposable.dispose()
		} else {
			if (this._isDisposing) {
				this.pendingActions.push(() => {
					disposable.dispose()
				})
			} else {
				this.disposables.push(disposable)
			}
		}
	}

	removeDisposable(disposable) {
		if (disposable == null  || this.disposed || this._isDisposing) {
			return
		}
		this.disposables = this.disposables.filter(d => d != disposable)
	}

	dispose() {
        if (this.disposed || this._isDisposing) {
			return
		}
		this._isDisposing = true
		this.disposables.forEach(d => { 
			d.dispose() 
		})
		this.disposed = true
		this._isDisposing = false
		this.pendingActions.forEach(d => {
			d()
		})
		this.pendingActions = []
		this.disposables = []
	}
}
module.exports = CompoundDisposable