# RacJS
implementation of RAC(OC) on JavaScript and replacement of RxJS
## Signal（类比RxJS的Observable）
   包含一定数量的可订阅数据（值，完成，错误）的信号对象，订阅者再接受到error或者complete之后就意味着订阅已经结束，即使信号还有没发送的值.
```
//创建一个signal，传入一个基于subscriber（订阅者对象）参数的block，block的返回值是一个Disposbale（FP编程的side effects）
let signal = new Signal(subscriber => {
   subscriber.sendNext(2)
   subscriber.sendNext(3)
   subscriber.sendComplete() //subscriber.sendError(new Error())
   subscriber.sendNext(4) // 4 不会被订阅者接收
   return null 
})
```
## Subcriber （类比RxJs的Subscriber）
   维护当前订阅者的接收操作，以及该订阅者订阅信号产生的Disposable（额外消耗）的对象，一般不自己创建，对使用方透明。
```
//具体的订阅
let next = v => console.log(v)
let complete = () => console.log('completed')
let error = err => console.log('error')
let disposable = signal.subscribe(next, complete, error)
//如果想取消这次订阅可以调用 disposable.dispose
```
   
