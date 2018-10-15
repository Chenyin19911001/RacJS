const Signal = require('../signal')
const CompoundDisposable = require('../disposable/compoundDisposable')
const ProxySubscriber = require('../subscriber/proxySubscriber')
const Disposable = require('../disposable/disposable')

class Subject extends Signal {
  constructor() {
    super()
    this.subscribers = []
    this.disposable = new CompoundDisposable()
  }

  static subject() {
    return new Subject()
  }

  _subscribeProxy(s) {
    let compoundDisposable = new CompoundDisposable()
    let ss = new ProxySubscriber(s, compoundDisposable)
    this.subscribers.push(ss)
    compoundDisposable.addDisposable(
      new Disposable(() => {
        this.subscribers = this.subscribers.filter(sub => sub !== ss)
      })
    )
    return compoundDisposable
  }

  sendNext(v) {
    if (this.disposable.disposed) {
      return
    }
    this.subscribers.forEach(s => {
      s.sendNext(v)
    })
  }

  sendComplete() {
    this.disposable.dispose()
    this.subscribers.forEach(s => {
      s.sendComplete()
    })
  }

  sendError(error) {
    this.disposable.dispose()
    this.subscribers.forEach(s => {
      s.sendError(error)
    })
  }

  didSubscribeWithContextDisposable(disposable) {
    if (disposable.disposed) {
      return
    }
    this.disposable.addDisposable(disposable)
    disposable.addDisposable(
      new Disposable(() => {
        this.disposable.removeDisposable(disposable)
      })
    )
  }
}

module.exports = Subject
