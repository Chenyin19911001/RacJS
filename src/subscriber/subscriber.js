const CompoundDisposable = require('../disposable/compoundDisposable')
const Disposable = require('../disposable/disposable')

class Subscriber {
    constructor(next, complete, error) {
        this.next = next
        this.complete = complete
        this.error = error
        this.disposable = new CompoundDisposable()
        this.disposable.addDisposable(new Disposable(() => {
            this.next = null
            this.complete = null
            this.error = null
        }))
    }

    sendNext(v) {
        this.next && this.next(v)
    }

    sendComplete() {
        let complete = this.complete
        this.disposable.dispose()
        complete && complete()
    }

    sendError(err) {
        let error = this.error
        this.disposable.dispose()
        error && error(err)
    }

    didSubscribeWithContextDisposable(disposable) {
        if (disposable.disposed) {
            return
        }
        this.disposable.addDisposable(disposable)
        disposable.addDisposable(new Disposable(() => {
            this.disposable.removeDisposable(disposable)
        }))
    }
}

module.exports = Subscriber