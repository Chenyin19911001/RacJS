const ChannelTerminal = require('./channelTerminal')
const Subject = require('../subject/subject')
const ReplaySubject = require('../subject/replaySubject')
const CurrentSubject = require('../subject/currentSubject')

class Channel {
  constructor(type = 'relay') {
    if (type == 'relay') {
      this.oneTerminalSubject = new ReplaySubject()
      this.otherTerminalSubject = new ReplaySubject()
    }
    if ((type = 'common')) {
      this.oneTerminalSubject = new Subject()
      this.otherTerminalSubject = new Subject()
    }
    if ((type = 'current')) {
      this.oneTerminalSubject = new CurrentSubject()
      this.otherTerminalSubject = new CurrentSubject()
    }
    this.oneTerminalSubject
      .filter(v => false)
      ._subscribeProxy(this.otherTerminalSubject)
    this.otherTerminalSubject
      .filter(v => false)
      ._subscribeProxy(this.oneTerminalSubject)
    this.oneChannel = new ChannelTerminal(
      this.oneTerminalSubject,
      this.otherTerminalSubject
    )
    this.otherChannel = new ChannelTerminal(
      this.otherTerminalSubject,
      this.oneTerminalSubject
    )
  }
}

module.exports = Channel
