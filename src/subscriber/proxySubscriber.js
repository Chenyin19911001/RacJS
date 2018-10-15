class ProxySubscriber {
  constructor(subcriber, disposable) {
    this.subcriber = subcriber
    this.disposable = disposable
    this.subcriber.didSubscribeWithContextDisposable(disposable)
  }

  didSubscribeWithContextDisposable(disposable) {
    if (disposable == this.disposable || disposable.disposed) {
      return
    }
    return this.disposable.addDisposable(disposable)
  }

  sendNext(v) {
    if (this.disposable.disposed) {
      return
    }
    this.subcriber.sendNext(v)
  }

  sendComplete() {
    if (this.disposable.disposed) {
      return
    }
    this.subcriber.sendComplete()
  }

  sendError(err) {
    if (this.disposable.disposed) {
      return
    }
    this.subcriber.sendError(err)
  }
}

module.exports = ProxySubscriber
