const { Subject, Disposable } = require('../src')
const { ValueTypeArray } = require('./valueType')

function safeString(key) {
  if (typeof key === 'number') {
    return key.toString()
  }
  return key
}

function getOuterKey(subscription, key) {
  if (subscription.type === ValueTypeArray) {
    return (
      subscription.subscriptionKeyInParentKey +
      '[' +
      key[0] +
      ']' +
      key.substr(1)
    )
  }
  if (!subscription.subscriptionKeyInParentKey) {
    return key
  }
  return subscription.subscriptionKeyInParentKey + '.' + key
}

function subscribe(parentSubscription, childSubcription, key) {
  disposeKey(parentSubscription, key)
  if (!childSubcription) {
    return
  }
  childSubcription.subscriptionKeyInParentKey = key
  let newDisposable = childSubcription.subject.subscribeNext(value => {
    sendNext(parentSubscription, value)
  })
  parentSubscription.disposableMap[key] = newDisposable
}

function disposeKey(subscription, key) {
  let disposable = subscription.disposableMap[key]
  if (disposable) {
    disposable.dispose()
    delete subscription.disposableMap[key]
  }
}

function sendNext(subscription, value) {
  let isArray = false
  if (Array.isArray(value)) {
    value.forEach(subvalue => {
      subvalue.key = getOuterKey(subscription, subvalue.key)
    })
    isArray = true
  } else {
    value.key = getOuterKey(subscription, value.key)
  }
  subscription.subject.sendNext(
    isArray && value.length === 1 ? value[0] : value
  )
}

function dispose(subcription) {
  Object.keys(subcription.disposableMap).forEach(key => {
    subcription.disposableMap[key].dispose()
  })
  subcription.disposableMap = {}
}

class Subscription {
  constructor(type) {
    this.type = type
    this.subject = new Subject()
    this.disposableMap = {}
    this.subscriptionKeyInParentKey = ''
  }
}

module.exports = {
  safeString,
  subscribe,
  disposeKey,
  sendNext,
  dispose,
  Subscription
}