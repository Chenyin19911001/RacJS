// let s = new Subject()
// setInterval(() => {
// 	s.sendNext(1)
// }, 1000)
//every
// Signal
//  //.fromArray([2, 3, 4])
//  .error('error')
//  .catchError(Signal.fromArray([5,6,7]))
//  .startWith(4)
//  .endWith(8)
//  // .every(v => v >= 2)
//  // .some(v => v)
//  // .concat(Signal.of(2).delay(1000))
//  // .concat(Signal.of(3).delay(1000))
//  // .concat(Signal.of(1).delay(1000))
//  .concat(Signal.interval(1000).take(4))
//  .repeat(3)
//  // .bufferTime(1000, 1)
//  // .debounce(s)
//  // .debounceTime(2000)
//  // .throttleTime(3000)
//  .subscribeNext(v => {
// 	console.log(v)
// })

let a = []
a.length = 2
let b = new Proxy(a, {
	get: function(obj, pro) {
		if (typeof pro === 'string') {
			console.log(pro)
		}
        return a[pro]
	},

	set: function(obj, pro, value) {
		a[pro] = value
	}
})
console.log(b)