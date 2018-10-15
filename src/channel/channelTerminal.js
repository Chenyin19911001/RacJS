const Signal = require('../signal')

class ChannelTerminal extends Signal {
  constructor(sourceSubject, destinationSubject) {
    super()
    this.sourceSubject = sourceSubject
    this.destinationSubject = destinationSubject
  }

  _subscribeProxy(s) {
    return this.sourceSubject._subscribeProxy(s)
  }

  sendNext(v) {
    this.destinationSubject.sendNext(v)
  }

  sendComplete() {
    this.destinationSubject.sendComplete()
  }

  sendError(err) {
    this.destinationSubject.sendError(err)
  }

  didSubscribeWithContextDisposable(disposable) {
    this.destinationSubject.didSubscribeWithContextDisposable(disposable)
  }
}

module.exports = ChannelTerminal
