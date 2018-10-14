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

function getHookValue(value) {
  if (value.$racxSubscription) {
    return value
  }
  let type = getValueType(value)
  let o = value
  switch (type) {
    case ValueTypePlain:
      o = hookPlainObject(value)
      break
    case ValueTypeObservable:
      o = hookObservable(value)
      break
    case ValueTypeArray:
      o = hookArray(value)
      break
    case ValueTypeSimple:
      break
  }
  return o
}

function extendsObservableProperty(object, key, ovalue) {
  if (object.$context.hasOwnProperty(key)) {
    transformSubscriptionValue(object, key, ovalue, false)
    return
  }
  transformSubscriptionValue(object, key, ovalue, false)
  Object.defineProperty(object, key, {
    enumerable: true,
    configurable: true,
    get: function() {
      return object.$context[key]
    },
    set: function(value) {
      transformSubscriptionValue(object, key, value, false)
    }
  })
}

function hookPlainObject(object) {
  let subscription = new Subscription(ValueTypePlain)
  let proxyObject = {}
  proxyObject.$racxSubscription = subscription
  proxyObject.$context = {}
  defineProperties(proxyObject, object)
  return proxyObject
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
          return newObject.$context[key]
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
  subscribe(newObject.$racxSubscription, o.$racxSubscription, key)
  newObject.$context[key] = o
  !initial && sendNext(newObject.$racxSubscription, { key, value: o })
}

function hookArray(array) {
  let subscription = new Subscription(ValueTypeArray)
  let newArray = []
  newArray.$racxSubscription = subscription
  if (array.length > 0) {
    array.forEach((item, index) => {
      let o = getHookValue(item)
      subscribe(subscription, o.$racxSubscription, safeString(index))
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
      subscribe(array.$racxSubscription, o.$racxSubscription, safeString(index + i))
      os[i] = o
      nextValue.push({ key: safeString(index + i), value: o })
    })
    let ret = originalPush.apply(array, os)
    sendNext(array.$racxSubscription, nextValue)
    return ret
  }
}

function _hookPop(array) {
  let originalPop = array.pop
  array.pop = () => {
    let index = array.length - 1
    disposeKey(array.$racxSubscription, safeString(index))
    let ret = originalPop.apply(array)
    sendNext(array.$racxSubscription, { key: safeString(index) })
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
      subscribe(array.$racxSubscription, o.$racxSubscription, safeString(i))
      os[i] = o
      nextValue.push({ key: safeString(i), value: o })
    })
    array.forEach((item, i) => {
      let key = safeString(index + i)
      if (item.$racxSubscription) {
        item.$racxSubscription.subscriptionKeyInParentKey = key
      }
      nextValue.push({ key, value: item })
    })
    let ret = unshift.apply(array, os)
    sendNext(array.$racxSubscription, nextValue)
    return ret
  }
}

function _hookShift(array) {
  let shift = array.shift
  array.shift = () => {
    let nextValue = []
    if (array.length > 0) {
      disposeKey(array.$racxSubscription, safeString(0))
      array.forEach((item, i) => {
        if (i > 0) {
          let key = safeString(i - 1)
          if (item.$racxSubscription) {
            item.$racxSubscription.subscriptionKeyInParentKey = key
          }
          nextValue.push({ key, value: item })
        }
      })
      nextValue.push({ key: safeString(array.length - 1) })
    }
    let ret = shift.apply(array)
    if (nextValue.length > 0) {
      sendNext(array.$racxSubscription, nextValue)
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
      disposeKey(array.$racxSubscription, key)
    }
    let pushArray = items.slice(2)
    let transformArray = []
    if (pushArray && pushArray.length > 0) {
      pushArray.forEach((item, i) => {
        let o = getHookValue(item)
        subscribe(array.$racxSubscription, o.$racxSubscription, 'dirty' + i)
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
        if (item.$racxSubscription) {
          item.$racxSubscription.subscriptionKeyInParentKey = key
        }
        nextValue.push({ key, value: item })
      }
    } else {
      for (let i = start; i < originalLength || i < newLength; i++) {
        let key = safeString(i)
        if (i < newLength) {
          let item = array[i]
          if (item.$racxSubscription) {
            item.$racxSubscription.subscriptionKeyInParentKey = key
          }
          nextValue.push({ key, value: item })
        } else {
          nextValue.push({ key: safeString(i) })
        }
      }
    }
    if (nextValue.length > 0) {
      sendNext(array.$racxSubscription, nextValue)
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
    if (item.$racxSubscription) {
      if (item.$racxSubscription.subscriptionKeyInParentKey !== safeString(i)) {
        item.$racxSubscription.subscriptionKeyInParentKey = safeString(i)
        nextValue.push({ key: safeString(i), value: item })
      }
    }
  })
  if (nextValue.length > 0) {
    sendNext(array.$racxSubscription, nextValue)
  }
}

function _hookSetter(array) {
  array.set = (index, item) => {
    array.splice(index, 1, item)
  }
}

function hookObservable(observable) {
  let subscription = new Subscription(ValueTypeObservable)
  observable.$racxSubscription = subscription
  let _selfSignal = observable.getRacxSignal()
  _selfSignal.subscribe(
    v => {
      sendNext(subscription, v)
    },
    () => {
      subscription.subject.sendComplete()
    },
    error => {
      subscription.subject.sendError(error)
    }
  )
  return observable
}

module.exports = { getHookValue, extendsObservableProperty } 