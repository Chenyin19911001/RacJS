const Subscriber = require('./subscriber/subscriber')
const CompoundDisposable = require('./disposable/compoundDisposable')
const Disposable = require('./disposable/disposable')
const ProxySubscriber = require('./subscriber/proxySubscriber')
const Notification = require('./notification')

const defaultValue = '$@%%^&%#&*6'

class Signal {
    constructor(didSubscribe) {
        this.didSubscribe = didSubscribe
    }

    static of(value) {
        return new Signal(s => {
            s.sendNext(value)
            s.sendComplete()
            return null
        })
    }

    static error(error) {
        return new Signal(s => {
            s.sendError(error)
            return null
        })
    }

    static empty() {
        return new Signal(s => {
            s.sendComplete()
            return null
        })
    }

    subscribe(next, complete, error) {
        let s = new Subscriber(next, complete, error)
        return this._subscribeProxy(s)
    }

    do(next, complete, error) {
        return new Signal(s => {
            let d = this.subscribe(v => {
                next && next(v)
                s.sendNext(v)
            }, () => {
                complete && complete()
                s.sendComplete()
            }, err => {
                error && error(err)
                s.sendError(err)
            })
            return d
        })
    }

    subscribeNext(next) {
        return this.subscribe(next, null, null)
    }

    subscribeError(error, isProxy = true) {
        return this.subscribe(null, null, error)
    }

    subscribeComplete(complete, isProxy = true) {
        return this.subscribe(null, complete, null)
    }

    _subscribeProxy(s) {
        let compoundDisposable = new CompoundDisposable()
        let ss = new ProxySubscriber(s, compoundDisposable)
        let d = this.didSubscribe(ss)
        compoundDisposable.addDisposable(d)
        return compoundDisposable
    }

    finally(callBack) {
        return this.do(null, () => {
            callBack && callBack()
        }, err => {
            callBack && callBack()
        })
    }

    map(mapf) {
        if (mapf == null) {
            return this
        }
        let signal = new Signal(s => {
            let index = 0
            let d = this.subscribe(value => {
                try {
                    let newValue = mapf(value, index)
                    index++
                    s.sendNext(newValue)
                } catch (error) {
                    s.sendError(error)
                }
            }, () => {
                s.sendComplete()
            }, error => {
                s.sendError(error)
            })
            return d
        })
        return signal
    }

    mapTo(value) {
        return this.map(v => value)
    }

    filter(filterf) {
        if (filterf == null) {
            return this
        }
        let signal = new Signal(s => {
            let index = 0
            let d = this.subscribe(value => {
                try {
                    let ret = filterf(value, index)
                    index++
                    if (ret) {
                        s.sendNext(value)
                    }
                } catch (error) {
                    s.sendError(error)
                }
            }, () => {
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    every(everyf) {
        let signal = new Signal(s => {
            let index = 0
            let d = this.subscribe(v => {
                try {
                    let ret = everyf(v, index)
                    index++
                    if (!ret) {
                        s.sendNext(false)
                        s.sendComplete()
                    }
                } catch (e) {
                    s.sendError(e)
                }
            }, () => {
                s.sendNext(true)
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    some(somef) {
        let signal = new Signal(s => {
            let index = 0
            let d = this.subscribe(v => {
                try {
                    let ret = somef(v, index)
                    index++
                    if (ret) {
                        s.sendNext(true)
                        s.sendComplete()
                    }
                } catch (e) {
                    s.sendError(e)
                }
            }, () => {
                s.sendNext(false)
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    take(count) {
        let signal = new Signal(s => {
            let n = 0
            let d = this.subscribe(v => {
                if (n < count) {
                    s.sendNext(v)
                    n++
                } else {
                    s.sendComplete()
                }
            }, () => {
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    takeLast(count) {
        let signal = new Signal(s => {
            let vs = []
            let d = this.subscribe(v => {
                vs.push(v)
            }, () => {
                if (vs.length > 0) {
                    vs.filter((vv, i) => {
                        return i >= vs.length - count
                    }).forEach(vv => {
                        s.sendNext(vv)
                    })
                }
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    takeWhile(whilef) {
        let signal = new Signal(s => {
            let index = 0
            let d = this.subscribe(v => {
                try {
                    if (whilef(v, index)) {
                        s.sendNext(v)
                    } else {
                        s.sendComplete()
                    }
                    index++
                } catch(e) {
                    s.sendError(e)
                }
            }, () => {
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    skip(count) {
        let signal = new Signal(s => {
            let n = 0
            let d = this.subscribe(v => {
                if (n >= count) {
                    s.sendNext(v)
                }
                n++
            }, () => {
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    skipLast(count) {
        let signal = new Signal(s => {
            let vs = []
            let d = this.subscribe(v => {
                vs.push(v)
            }, () => {
                if (vs.length > 0) {
                    vs.filter((vv, i) => {
                        return i < vs.length - count
                    }).forEach(vv => {
                        s.sendNext(vv)
                    })
                }
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    skipWhile(whilef) {
        let signal = new Signal(s => {
            let index = 0
            let skipped = true
            let d = this.subscribe(v => {
                try {
                    if (skipped) {
                        if (!whilef(v, index)) {
                            skipped = false
                        }
                    }
                    if (!skipped) {
                        s.sendNext(v)
                    }
                    index++
                } catch(e) {
                    s.sendError(e)
                }
            }, () => {
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    count(ignoreError = false) {
        let signal = new Signal(s => {
            let n = 0
            let d = this.subscribe(v => {
                n++
            }, () => {
                s.sendNext(n)
                s.sendComplete()
            }, err => {
                if (ignoreError) {
                    s.sendNext(n)
                    s.sendComplete()
                } else {
                    s.sendError(err)
                }
            })
            return d
        })
        return signal
    }

    find(findf, isIndex = false) {
        let signal = new Signal(s => {
            let index = 0
            let d = this.subscribe(v => {
                try {
                    let ret = findf(v, index)
                    index++
                    if (ret) {
                        s.sendNext(isIndex ? index : v)
                        s.sendComplete()
                    }
                } catch(e) {
                    s.sendError(e)
                }
            }, () => {
                s.sendNext(isIndex ? -1 : null)
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    findIndex(findf) {
        return this.find(findf, true)
    }

    isEmpty() {
        let signal = new Signal(s => {
            let d = this.subscribe(v => {
                s.sendNext(false)
                s.sendComplete()
            }, () => {
                s.sendNext(true)
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    ifEmpty(dValue, throwError = false) {
        let signal = new Signal(s => {
            let _isEmpty = true
            let d = this.subscribe(v => {
                _isEmpty = false
                s.sendNext(v)
            }, () => {
                if (_isEmpty) {
                    if (throwError) {
                        s.sendError(new Error('empty signal'))
                    } else {
                        dValue && s.sendNext(dValue)
                        s.sendComplete()
                    }
                } else {
                    s.sendComplete()
                }
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    first() {
        return this.take(1)
    }

    last() {
        return this.takeLast(1)
    }

    buffer(otherSignal) {
        let signal = new Signal(s => {
            let buffers = []
            let bufferComplete = false
            let sendBuffers = (forceComplete) => {
                if (buffers.length > 0) {
                    s.sendNext(buffers)
                    buffers = []
                }
                if (bufferComplete || forceComplete) {
                    s.sendComplete()
                }
            }
            let d = this.subscribe(v => {
                buffers.push(v)
            }, () => {
                bufferComplete = true
            }, err => {
                s.sendError(err)
            })
            let d2 = otherSignal.subscribe(v => {
                sendBuffers(false)
            }, () => {
                sendBuffers(true)
            }, err => {
                s.sendError(err)
            })
            return new Disposable(() => {
                d.dispose()
                d2.dispose()
            })
        })
        return signal
    }

    bufferCount(count) {
        let signal = new Signal(s => {
            let buffers = []
            let d = this.subscribe(v => {
                buffers.push(v)
                if (buffers.length === count) {
                    s.sendNext(buffers)
                    buffers = []
                }
            }, () => {
                if (buffers.length > 0) {
                    s.sendNext(buffers)
                }
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    bufferTime(time, count = 0) {
        let signal = new Signal(s => {
            let buffers = []
            let sendNext = (isComplete) => {
                if (buffers.length === 0) {
                    return
                }
                if (count <= 0) {
                    s.sendNext(buffers)
                    buffers = []
                } else {
                    while (buffers.length >= count) {
                        let temp = buffers.filter((vv, i) => i < count)
                        s.sendNext(temp)
                        buffers = buffers.filter((vv, i) => i >= count)
                    }
                    if (isComplete && buffers.length > 0) {
                        s.sendNext(buffers)
                        buffers = []
                    }
                }
            }
            let timeoutId
            let d = this.subscribe(v => {
                buffers.push(v)
                timeoutId = setTimeout(() => {
                    sendNext(false)
                }, time)
            }, () => {
                sendNext(true)
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return new Disposable(() => {
                d.dispose()
                timeoutId && clearTimeout(timeoutId)
            })
            return d
        })
        return signal
    }

    elementAt(index, defaultValue) {
        let signal = new Signal(s => {
            let nindex = 0
            let d = this.subscribe(v => {
                if (nindex === index) {
                    s.sendNext(v)
                    s.sendComplete()
                } else {
                    nindex++
                }
            }, () => {
                defaultValue && s.sendNext(defaultValue)
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    scan(scanf, seed, useFirst) {
        let signal = new Signal(s => {
            let index = 0
            let initial = seed
            let d = this.subscribe(v => {
                if (useFirst && index == 0) {
                    s.sendNext(v)
                    initial = v
                } else {
                    try {
                        let ret = scanf(initial, v, index)
                        s.sendNext(ret)
                        initial = ret
                    } catch(e) {
                        s.sendError(e)
                    }
                }
                index++
            }, () => {
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    reduce(reducef, initial, useFirst) {
        return this.scan(reducef, initial, useFirst).takeLast(1)
    }

    delay(time) {
        let signal = new Signal(s => {
            let idss = []
            let d = this.subscribe(v => {
                idss.push(setTimeout(() => {
                    s.sendNext(v)
                }, time))
            }, () => {
                idss.push(setTimeout(() => {
                    s.sendComplete()
                }, time))
            }, err => {
                s.sendError(err)
            })
            return new Disposable(() => {
                d.dispose()
                idss.forEach(id => {
                    clearTimeout(id)
                })
                idss = null
            })
            return d
        })
        return signal
    }

    ignoreValues() {
        return this.filter(v => false)
    }

    then(signal) {
        return this.ignoreValues().concat(signal)
    }

    distinct(keySelector) {
        if (!keySelector) {
            return this
        }
        let signal = new Signal(s => {
            let keys = new Set()
            let d = this.subscribe(v => {
                try {
                    let key = keySelector(v)
                    if (!keys.has(key)) {
                        keys.add(key)
                        s.sendNext(v)
                    }
                } catch(e) {
                    s.sendError(e)
                }
            }, () => {
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    distinctUntilKeyChanged(keySelector) {
        if (!keySelector) {
            return this
        }
        let signal = new Signal(s => {
            let key = defaultValue
            let d = this.subscribe(v => {
                try {
                    let nkey = keySelector(v)
                    if (key !== nkey) {
                        key = nkey
                        s.sendNext(v)
                    }
                } catch(e) {
                    s.sendError(e)
                }
            }, () => {
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    distinctUntilValueChanged() {
        let signal = new Signal(s => {
            let value = defaultValue
            let d = this.subscribe(v => {
                if (v !== value) {
                    value = v
                    s.sendNext(v)
                }
            }, () => {
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    materialize() {
        let signal = new Signal(s => {
            let d = this.subscribe(v => {
                s.sendNext(Notification.createNext(v))
            }, () => {
                s.sendNext(Notification.createComplete())
                s.sendComplete()
            }, err => {
                s.sendNext(Notification.createError(err))
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    dematerialize() {
        let signal = new Signal(s => {
            let d = this.subscribe(v => {
                if (v instanceof Notification) {
                    v.subscribe(s)
                } else {
                    s.sendNext(v)
                }
            }, () => {
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return d
        })
        return signal
    }

    debounce(otherSignal) {
        let signal = new Signal(s => {
            let latestValue = defaultValue
            let sendLatestValue = () => {
                if (latestValue !== defaultValue) {
                    s.sendNext(latestValue)
                    latestValue = defaultValue
                }
            }
            let d = this.subscribe(v => {
                latestValue = v
            }, () => {
                sendLatestValue()
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            let d2 = otherSignal.subscribe(v => {
                sendLatestValue()
            }, () => {  
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            return new Disposable(() => {
                d.dispose()
                d2.dispose()
            })
        })
        return signal
    }

    debounceTime(time) {
        let hasValue = false
        let timeoutId = null
        let signal = new Signal(s => {
            let d = this.subscribe(v => {
                if (!hasValue) {
                    s.sendNext(v)
                    hasValue = true
                    timeoutId = setTimeout(() => {
                        hasValue = false
                        timeoutId = null
                    }, time)
                }
            }, () => {
                s.sendComplete()
            }, err => {
                s.sendError(err)
            })
            d.addDisposable(new Disposable(() => {
                timeoutId && clearTimeout(timeoutId)
            }))
            return d
        })
        return signal
    }

    throttleTime(time) {
        let timeoutId = null
        let blockValue = defaultValue
        let signal = new Signal(s => {
            let d = this.subscribe(v => {
                blockValue = v
                timeoutId && clearTimeout(timeoutId)
                timeoutId = setTimeout(() => {
                    s.sendNext(blockValue)
                    blockValue = defaultValue
                }, time)
            }, () => {
                if (blockValue !== defaultValue) {
                    s.sendNext(blockValue)
                }
                s.sendComplete()
            }, err => {
                if (blockValue !== defaultValue) {
                    s.sendNext(blockValue)
                }
                s.sendError(err)
            })
            return new Disposable(() => {
                d.dispose()
                timeoutId && clearTimeout(timeoutId)
            })
            return d
        })
        return signal
    }

    catchError(otherSignal) {
        let signal = new Signal(s => {
            let d = new CompoundDisposable()
            d.addDisposable(this.subscribe(v => {
                s.sendNext(v)
            }, () => {
                s.sendComplete()
            }, err => {
                d.addDisposable(otherSignal._subscribeProxy(s))
            }))
            return d
        })
        return signal
    }

    subscribeOn(type) {
        if (type == 'sync') {
            return this
        }
        if (type == 'async') {
            return new Signal(s => {
                let d = new CompoundDisposable()
                setTimeout(() => {
                    d.addDisposable(this._subscribeProxy(s))
                }, 0)
                return d
            })
        }
        if (type == 'micro' || type == 'asap') {
            return new Signal(s => {
                let d = new CompoundDisposable()
                Promise.resolve().then(() => {
                    d.addDisposable(this._subscribeProxy(s))
                })
                return d
            })
        }
        return this
    }

    observeOn(type) {
        if (type == 'sync') {
            return this
        }
        if (type == 'async') {
            let signal = new Signal(s => {
                let idss = []
                let d = this.subscribe(v => {
                    idss.push(setTimeout(() => {
                        s.sendNext(v)
                    }, 0))
                }, () => {
                    idss.push(setTimeout(() => {
                        s.sendComplete()
                    }, 0))
                }, err => {
                    idss.push(setTimeout(() => {
                        s.sendError(err)
                    }, 0))
                })
                d.addDisposable(new Disposable(() => {
                    idss.forEach(id => {
                        clearTimeout(id)
                    })
                    idss = null
                }))
                return d
            })
            return signal
        }
        if (type == 'asap' || type == 'micro') {
            let signal = new Signal(s => {
                let dispose = false
                let d = this.subscribe(v => {
                    Promise.resolve().then(() => {
                        if (dispose) {
                            return
                        }
                        s.sendNext(v)
                    })
                }, () => {
                    Promise.resolve().then(() => {
                        if (dispose) {
                            return
                        }
                        s.sendComplete()
                    })
                }, err => {
                    Promise.resolve().then(() => {
                        if (dispose) {
                            return
                        }
                        s.sendError(err)
                    }) 
                })   
                d.addDisposable(new Disposable(() => {
                    dispose = true
                }))
                return d
            })
            return signal
        }
        return this
    }

    combine(signals) {
        let allSignals = [this].concat(signals)
        let cSignal = new Signal(s => {
            let rets = allSignals.map(i => defaultValue)
            let allCompleted = allSignals.map(i => false)
            let d = new CompoundDisposable()
            allSignals.forEach((signal, index) => {
                d.addDisposable(signal.subscribe(v => {
                    rets[index] = v
                    if (rets.every(vv => vv != defaultValue)) {
                        let retsCopy = rets.concat()
                        s.sendNext(retsCopy)
                    }
                }, () => {
                    allCompleted[index] = true
                    if (allCompleted.every(cp => cp)) {
                        s.sendComplete()
                    }
                }, err => {
                    s.sendError(err)
                }))
            })
            return d
        })
        return cSignal
    }

    static combine(signals) {
        if (signals.length === 1) {
            return signals[0]
        } else {
            return signals[0].combine(signals.filter((s, i) => i > 0))
        }
    }

    zip(signals) {
        let allSignals = [this].concat(signals)
        let cSignal = new Signal(s => {
            let vArrays = allSignals.map(signal => {
                return { values: [], completed: false }
            })
            let sendComplete = () => {
                let hasCompleted = vArrays.some(v => {
                    return v.values.length === 0 && v.completed
                })
                if (hasCompleted) {
                    s.sendComplete()
                }
            }
            let sendNext = () => {
                let canSendNext = vArrays.every(v => {
                    return v.values.length > 0
                })
                if (canSendNext) {
                    let rets = vArrays.map(v => v.values[0])
                    vArrays.forEach(v => {
                        v.values.splice(0, 1)
                    })
                    s.sendNext(rets)
                    sendComplete()
                }
            }
            let d = new CompoundDisposable()
            allSignals.forEach((signal, index) => {
                d.addDisposable(signal.subscribe(v => {
                    vArrays[index].values.push(v)
                    sendNext()
                }, () => {
                    vArrays[index].completed = true
                    sendComplete()
                }, err => {
                    s.sendError(err)
                }))
            })
            return d
        })
        return cSignal
    }

    static zip(signals) {
        if (signals.length === 1) {
            return signals[0]
        } else {
            return signals[0].zip(signals.filter((s, i) => i > 0))
        }
    }

    merge(signals) {
        let allSignals = [this].concat(signals)
        let mSignal = new Signal(s => {
            let allCompleted = allSignals.map(i => false)
            let d = new CompoundDisposable()
            allSignals.forEach((signal, index) => {
                d.addDisposable(signal.subscribe(v => {
                    s.sendNext(v)
                }, () => {
                    allCompleted[index] = true
                    if (allCompleted.every(cp => cp)) {
                        s.sendComplete()
                    }
                }, err => {
                    s.sendError(err)
                }))
            })
            return d
        })
        return mSignal
    }

    static merge(signals) {
        if (signals.length === 1) {
            return signals[0]
        } else {
            return signals[0].merge(signals.filter((s, i) => i > 0))
        }
    }

    concat(signal) {
        let nsignal = new Signal(s => {
            let d = new CompoundDisposable()
            d.addDisposable(this.subscribe(v => {
                s.sendNext(v)
            }, () => {
                d.addDisposable(signal._subscribeProxy(s))
            }, err => {
                s.sendError(err)
            }))
            return d
        })
        return nsignal
    }

    static concat(signals) {
        if (signals.length == 1) {
            return signals[0]
        } else {
            let s = signals[0]
            signals.filter((ss, i) => i > 0).forEach(ss => {
                s = s.concat(ss)
            })
            return s
        }
    }

    startWith(value) {
        return Signal.of(value).concat(this)
    }

    endWith(value) {
        return this.concat(Signal.of(value))
    }

    repeat(count) {
        if (count <= 0) {
            return this
        }
        return new Signal(ss => {
            let d = new CompoundDisposable()
            let n = count
            let sendNext = v => ss.sendNext(v)
            let sendError = error => ss.sendError(error)
            let sendComplete = () => {
                n--
                if (n > 0) {
                    d.addDisposable(this._subscribeProxy(new Subscriber(sendNext, sendComplete, sendError)))
                } else {
                    ss.sendComplete()
                }
            }
            d.addDisposable(this._subscribeProxy(new Subscriber(sendNext,sendComplete, sendError)))
            return d
        })
    }

    retry(count) {
        if (count <= 0) {
            return this
        }
        return new Signal(ss => {
            let d = new CompoundDisposable()
            let n = count
            let sendNext = v => ss.sendNext(v)
            let sendComplete = () => {}
            let sendError = err => {
                if (n > 0) {
                    n--
                    d.addDisposable(this._subscribeProxy(new Subscriber(sendNext, sendComplete, sendError)))
                } else {
                    ss.sendError(err)
                }
            }
            d.addDisposable(this._subscribeProxy(new Subscriber(sendNext,sendComplete, sendError)))
            return d
        })
    }

    static fromArray(array) {
        return new Signal(s => {
            array.forEach(v => {
                s.sendNext(v)
            })
            s.sendComplete()
            return null
        })
    }

    static fromRange(start, count, distance = 1) {
        return new Signal(s => {
            for(let i = 0; i < count; i++) {
                let v = start + i * distance
                s.sendNext(v)
            }
            s.sendComplete()
            return null
        })
    }

    static fromPromise(promise) {
        return new Signal(s => {
            promise.then(d => {
                s.sendNext(d)
                s.sendComplete()
            }).catch(e => {
                s.sendError(e)
            })
        })
    }

    static interval(time, start = 0) {
        return new Signal(s => {
            let v = start
            let intervalId = setInterval(() => {
                s.sendNext(v)
                v++
            }, time)
            return new Disposable(() => {
                clearInterval(intervalId)
            })
        })
    }
}

module.exports = Signal



