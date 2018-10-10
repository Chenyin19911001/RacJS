const ValueTypeSimple = 1
const ValueTypeArray = 2
const ValueTypePlain = 3
const ValueTypeObservable = 4
const { Signal } = require('../src')

function getValueType(value) {
  if (value === null || typeof value !== 'object') {
    return ValueTypeSimple
  }
  if (isPlainObject(value)) {
    return ValueTypePlain
  }
  if (Array.isArray(value)) {
    return ValueTypeArray
  }
  if (isObservable(value)) {
    return ValueTypeObservable
  }
  return ValueTypeSimple
}

function isPlainObject(value) {
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function isObservable(value) {
  return (
    value.getRacxSignal &&
    typeof value.getRacxSignal === 'function' &&
    value.getRacxSignal() instanceof Signal
  )
}

module.exports = {
  getValueType,
  ValueTypeArray,
  ValueTypePlain,
  ValueTypeSimple,
  ValueTypeObservable
}