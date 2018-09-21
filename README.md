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
   维护当前订阅者的接收操作，以及该订阅者订阅信号产生的Disposable（额外消耗）的对象（从设计的角度，Subscriber更像是一个定义一些操作的接口），一般不自己创建，对使用方透明。
```
//具体的订阅
let next = v => console.log(v)
let complete = () => console.log('completed')
let error = err => console.log('error')
let disposable = signal.subscribe(next, complete, error)
//如果想取消这次订阅可以调用 disposable.dispose

//订阅的方法有4个，subscribe是最全的
-subscribe(next, complete, error)
-subscribeNext(next)
-subscribeComplete(complete)
-subscribeError(error)
``` 
   
## Disposable
  这个是RAC里面的概念，RxJs没有，作用同于类似于RxJs的subscription对象的unsubscribe。Disposable是管理当前订阅操作以及Signal各种链式，组合过程中出现的side effects。
  Disposable中有Disposable和CompoundDisposable两种，采用的是组合嵌套的设计模式。每一个对应的disposable只负责当前订阅者。几乎对使用者透明
## Subject（RxJs里面的Subject）
  概括的描述：
  1）继承于Signal，同时又实现了Subscriber接口的对象
  2）OOP进入到FRP的桥梁
  3）特别灵活
```
let subject = new Subject()
subject.subscribe(next, complete, error)
subject.sendNext(2)
subject.sendComplete()
subject.sendError()
```
  Subject有Subject，CurrentSubject，ReplaySubject。其中Subject就是普通的；CurrentSubject在被订阅的时候如果当前有值了就会发送最新值；ReplaySubject在被订阅会完美的复现所有的值，包括complete和error信息
## Connection
   基于Signal和Subject的一种1对N的实现。之前说过Subject既是一个Signal，又是一个Subscriber。这样就让Subject订阅Signal对signal的值做透传，然后将subject暴露给使用方订阅。这么做的好处就是为了让signal创建时传入的block只执行一次，减少额外的side effects。
   
## Channel
   基于Subject和Subject实现N对N的实现。RxJs好像没有
## Command
借鉴RAC，RxJs好像没有。但是和RAC有区别
```
//第一个参数block，是根据输入生成一个signal
/*
 * 第二个参数，传入一个<=0的值，代表当前的Command不支持concurrent，也不支持等待，也就是说如果当前command在被执行，在执行完成前其他输入会被忽略
 * 如果 == 1，串型，支持等待。后续的输入会在前一个执行完成后执行
 * 如果 > 1, 并行，支持等待，当当前执行的signal大于该数量后，会进入缓冲区等待，每当有空闲就会从缓冲区取出进行执行
 */
let command = new Command(v => Signal.of(3).delay(1000), 0)
command.execute(2).subscribe(next, complete)
...
```
## 核心--Signal常用操作
有些很复杂的操作在这边不做解释，想了解的可以看代码，主要是为了其他方法的封装操作
### 简单Signal创建操作
#### static of(value)
快速创建一个只有一个数据Value的signal
#### static empty()
快速创建一个空的signal
#### static error(err)
快速创建错误的signal
#### static never()
快速创建一个不会自己结束且空的signal
### 订阅流程附加操作
#### initially(block)
在订阅开始前注入操作
#### do(next,complete,error)
在订阅过程中对数据注入操作
#### finally(block)
在订阅结束后注入操作
```
Signal.of(4)
   .do((v) => console.log('do next + ' + v), () => console.log('do complete'))
   .initially(() => console.log('before subscribe'))
   .finally(() => console.log('after complete'))
   .subscribeNext()
/**
 *before subscribe
 *do next + 4
 *do complete
 *after error or complete
 */
```
  
