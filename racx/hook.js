const { Subject, Disposable } = require('../src')
const {
    getValueType,
    ValueTypeArray,
    ValueTypePlain,
    ValueTypeSimple,
    ValueTypeObservable
} = require('./valueType')

const {
    safeString,
    subscribe,
    disposeKey,
    dispose,
    sendNext,
    Subscription
} = require('./subscription')

function getHookValue(value, key) {
    let type = getValueType(value)
    let o = value
    switch (type) {
        case ValueTypePlain:
            o = hookPlainObject(value, key)
            break
        case ValueTypeObservable:
            o = hookObservable(value, key)
            break
        case ValueTypeArray:
            o = hookArray(value, key)
            break
        case ValueTypeSimple:
            break
    }
    return o
}

function hookPlainObject(object, key) {
    let __subscription = new Subscription(ValueTypePlain, key)
    let newObject = {}
    newObject.__subscription = __subscription
    newObject.__context = {}
    defineProperties(newObject, object)
    return newObject
}

function defineProperties(newObject, object) {
    let keys = Object.keys(object)
    if (keys.length > 0) {
        keys.forEach(key => {
            transformSubscriptionValue(newObject, key, object[key], true)
            Object.defineProperty(newObject, key, {
                enumerable: true,
                configurable: true,
                get: function() {
                    return newObject.__context[key]
                },
                set: function(value) {
                    transformSubscriptionValue(newObject, key, value, false)
                }
            })
        })
    }
}

function transformSubscriptionValue(newObject, key, value, initial = false) {
    let o = getHookValue(value)
    subscribe(newObject.__subscription, o.__subscription, key)
    newObject.__context[key] = o
    !initial && sendNext(newObject.__subscription, { key, value: o })
}

function hookArray(array, key) {
    let __subscription = new Subscription(ValueTypeArray, key)
    let newArray = []
    newArray.__subscription = __subscription
    if (array.length > 0) {
        array.forEach((item, index) => {
            let o = getHookValue(item)
            subscribe(__subscription, o.__subscription, safeString(index))
            newArray[index] = o
        })
    }
    _hookPush(newArray)
    _hookPop(newArray)
    _hookUnshift(newArray)
    _hookShift(newArray)
    _hookSplice(newArray)
    _hookSort(newArray)
    _hookReverse(newArray)
    _hookSetter(newArray)
    return newArray
}

function _hookPush(array) {
    let originalPush = array.push
    array.push = (...items) => {
        let index = array.length
        let os = []
        let nextValue = []
        items.forEach((item, i) => {
            let o = getHookValue(item)
            subscribe(
                array.__subscription,
                o.__subscription,
                safeString(index + i)
            )
            os[i] = o
            nextValue.push({ key: safeString(index + i), value: o })
        })
        let ret = originalPush.apply(array, os)
        sendNext(array.__subscription, nextValue)
        return ret
    }
}

function _hookPop(array) {
    let originalPop = array.pop
    array.pop = () => {
        let index = array.length - 1
        disposeKey(array.__subscription, safeString(index))
        let ret = originalPop.apply(array)
        sendNext(array.__subscription, { key: safeString(index) })
        return ret
    }
}

function _hookUnshift(array) {
    let unshift = array.unshift
    array.unshift = (...items) => {
        let index = items.length
        let os = []
        let nextValue = []
        items.forEach((item, i) => {
            let o = getHookValue(item)
            subscribe(array.__subscription, o.__subscription, safeString(i))
            os[i] = o
            nextValue.push({ key: safeString(i), value: o })
        })
        array.forEach((item, i) => {
            let key = safeString(index + i)
            if (item.__subscription) {
                item.__subscription.subscriptionKeyInParentKey = key
            }
            nextValue.push({ key, value: item })
        })
        let ret = unshift.apply(array, os)
        sendNext(array.__subscription, nextValue)
        return ret
    }
}

function _hookShift(array) {
    let shift = array.shift
    array.shift = () => {
        let nextValue = []
        if (array.length > 0) {
            disposeKey(array.__subscription, safeString(0))
            array.forEach((item, i) => {
                if (i > 0) {
                    let key = safeString(i - 1)
                    if (item.__subscription) {
                        item.__subscription.subscriptionKeyInParentKey = key
                    }
                    nextValue.push({ key, value: item })
                }
            })
            nextValue.push({ key: safeString(array.length - 1) })
        }
        let ret = shift.apply(array)
        if (nextValue.length > 0) {
            sendNext(array.__subscription, nextValue)
        }
        return ret
    }
}

function _hookSplice(array) {
    let splice = array.splice
    array.splice = (...items) => {
        let nextValue = []
        let originalLength = array.length
        let start = items[0]
        let deleteCount = items[1] || originalLength - start
        for (let i = start; i < array.length && i - start < deleteCount; i++) {
            let key = safeString(i)
            disposeKey(array.__subscription, key)
        }
        let pushArray = items.slice(2)
        let transformArray = []
        if (pushArray && pushArray.length > 0) {
            pushArray.forEach((item, i) => {
                let o = getHookValue(item)
                subscribe(array.__subscription, o.__subscription, 'dirty' + i)
                transformArray[i] = o
            })
        }
        let args = [start, deleteCount, ...transformArray]
        let ret = splice.apply(array, args)
        let newLength = array.length
        if (newLength === originalLength) {
            for (let i = 0; i < pushArray.length; i++) {
                let key = safeString(i + start)
                let item = array[i + start]
                if (item.__subscription) {
                    item.__subscription.subscriptionKeyInParentKey = key
                }
                nextValue.push({ key, value: item })
            }
        } else {
            for (let i = start; i < originalLength || i < newLength; i++) {
                let key = safeString(i)
                if (i < newLength) {
                    let item = array[i]
                    if (item.__subscription) {
                        item.__subscription.subscriptionKeyInParentKey = key
                    }
                    nextValue.push({ key, value: item })
                } else {
                    nextValue.push({ key: safeString(i) })
                }
            }
        }
        if (nextValue.length > 0) {
            sendNext(array.__subscription, nextValue)
        }
        return ret
    }
}

function _hookSort(array) {
    let sort = array.sort
    array.sort = (...args) => {
        let ret = sort.apply(array, args)
        _recoverArraySubscription(array)
        return ret
    }
}

function _hookReverse(array) {
    let reverse = array.reverse
    array.reverse = () => {
        let ret = reverse.apply(array)
        _recoverArraySubscription(array)
        return ret
    }
}

function _recoverArraySubscription(array) {
    let nextValue = []
    array.forEach((item, i) => {
        if (item.__subscription) {
            if (
                item.__subscription.subscriptionKeyInParentKey !== safeString(i)
            ) {
                item.__subscription.subscriptionKeyInParentKey = safeString(i)
                nextValue.push({ key: safeString(i), value: item })
            }
        }
    })
    if (nextValue.length > 0) {
        sendNext(array.__subscription, nextValue)
    }
}

function _hookSetter(array) {
    array.set = (index, item) => {
        array.splice(index, 1, item)
    }
}

function hookObservable(observable, key) {
    let __subscription = new Subscription(ValueTypeObservable, key)
    observable.__subscription = __subscription
    let _selfSignal = observable.getRacxSignal()
    _selfSignal.subscribe(
        v => {
            sendNext(__subscription, v)
        },
        () => {
            __subscription.subject.sendComplete()
        },
        error => {
            __subscription.subject.sendError(error)
        }
    )
    return observable
}

module.exports = getHookValue
