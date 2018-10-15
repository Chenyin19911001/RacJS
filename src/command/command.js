const Signal = require('../signal')
const Connection = require('../connection')
const ReplaySubject = require('../subject/replaySubject')

class Command {
  //concurrentCount: { 0: 一次只能执行一个，执行期间不等待；1:串，可以等待 2：并，可以等待 }
  constructor(signalCreate, concurrentCount) {
    this.signalCreate = signalCreate
    this.concurrentCount = concurrentCount <= 0 ? 0 : concurrentCount
    this.executingSignals = []
    this.waitingSignals = []
  }

  execute(input) {
    if (this.concurrentCount === 0) {
      if (this.executingSignals.length > 0) {
        return Signal.error('this command cannot be executed')
      }
      let signal = this.signalCreate(input)
      let subject = new ReplaySubject()
      let connection = new Connection(signal, subject)
      this.executingSignals.push(signal)
      connection.subject.subscribe(
        null,
        () => {
          this.executingSignals = []
        },
        err => {
          this.executingSignals = []
        }
      )
      connection.connect()
      return connection.subject
    } else {
      let signal = this.signalCreate(input)
      let subject = new ReplaySubject()
      let connection = new Connection(signal, subject)
      if (this.executingSignals.length === this.concurrentCount) {
        this.waitingSignals.push(connection)
        return subject
      } else {
        this.executingSignals.push(signal)
        let completeOrError = () => {
          this.executingSignals = this.executingSignals.filter(
            s => s !== signal
          )
          if (this.waitingSignals.length > 0) {
            let waitingConnection = this.waitingSignals.shift()
            waitingConnection.connect()
          }
        }
        connection.subject.subscribe(
          null,
          () => {
            completeOrError()
          },
          err => {
            completeOrError()
          }
        )
        connection.connect()
        return connection.subject
      }
    }
  }
}

module.exports = Command
