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
### 1）简单Signal创建操作
#### static of(value)
快速创建一个只有一个数据Value的signal
#### static empty()
快速创建一个空的signal
#### static error(err)
快速创建错误的signal
#### static never()
快速创建一个不会自己结束且空的signal
#### static fromArray(arr)
快速创建一个包含数组元素的signal
#### static fromRange(start, count, distance = 1)
快速创建一个signal,signal的数据依次从start开始，每次增加distance，叠加count次
#### static fromPromise(promise)
快速创建一个signal,promise then作为signal的数据+complete，catch作为signal的error
#### static interval(time, start = 0)
快速创建一个signal,从start开始，每time时间发送start+1
### 2）订阅流程附加操作
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
### 3）数据流的衔接
#### concat(otherSignal)
当前的signal在结束之后，紧接着订阅otherSignal
#### static concat(signals)
concat的类方法
#### starWith(value)
Signal.of(value)放在当前流的前面
#### endWith(value)
Signal.of(value)放在当前流的后面
#### then(otherSignal)
当前的signal在结束之后(忽略当前signal的next发送的值)，紧接着订阅otherSignal
#### takeUntil(otherSignal)
订阅当前Signal，直到otherSignal有值或者是complete消息过来
#### replaced(otherSignal)
订阅当前的signal，直到otherSignal有任意的数据(包括error/complete)过来，并且紧接着订阅otherSignal
#### replace(otherSignal)
订阅otherSignal，直到当前signal有任意的数据过来，并且紧接着订阅当前的signal
#### catchError(error => signal)
如果当前signal发生错误，就根据错误生成新的signal，并且紧接着订阅这signal
#### catchTo(otherSignal: Signal)
如果当前signal发生错误，并且紧接着订阅新的otherSignal
```
//依次打印-2，-1，-0，1，2，3，4；如果最后的4000ms变为比3000ms小的数值打印就会变成-2，-1，0，4
Signal.of(2)
   // .do((v) => console.log('do next + ' + v), () => console.log('do complete'))
   // .initially(() => console.log('before subscribe'))
   // .finally(() => console.log('after complete'))
   .startWith(1)
   .endWith(3)
   .delay(3000)
   .replace(Signal.fromArray([-2,-1,0]))
   .replaced(Signal.of(4).delay(4000))
   .subscribeNext(v => console.log('real v ' + v))
```
### 4）类数组操作
将数据流里面所有的数据想象成一个数组处理
#### map((v,index) => otherV)
将signal里面的数据都做了一个映射
#### mapTo(v)
将signal里面的数据都映射成一个值
#### filter((v,index) => boolean)
将signal中不符合条件的都过滤掉
#### ignoreValues()
过滤所有的值，只关心完成和错误
#### every((v,index) => boolean)
判断signal的所有数据是不是满足条件
#### some((v,index) => boolean)
判断signal有没有数据满足条件
#### find((v,index) => boolean)
找出signal中第一个满足条件的值
#### findIndex((v,index) => boolean)
找出signal中第一个满足条件的值的index
#### elementAt(index, defaultValue)
找出signal里面的第index的值，如果不存在就发送defaultValue
#### scan((sourceValue, nowValue, index) => desValue, seed, useFirst)
usefirst ? 使用signal的第一个值作为sourceValue ：使用seed作为sourceValue
signal每次发出的数据nowValue，都会经过第一个函数的处理变成新的数据发送出去，同时将最新的值作为下一次的sourceValue
#### reduce((sourceValue, nowValue, index) => desValue, seed, useFirst)
取scan中的最后一个值
#### isEmpty()
判断当前signal是不是没有数据
#### ifEmpty(defaultValue, throwError)
如果signal为空，是发送defaultValue，还是发送一个空的错误
#### take(count)
取前count的数据
#### takeLast(count)
取最后几个数据
#### takeWhile(v => boolean)
一直取到signal的数据中第一个不满足条件为止
#### fisrt()
取第一个
#### last()
取最后一个
#### skip(count)
从第count开始取
#### skipLast(count)
最后几个不取
#### skipWhile
从signal的数据中第一个满足条件开始取
#### count()
获取当前signal包含的数据总长度
### 5）其他工具类操作
#### bufferCount(count)
将源signal的数据每几个一组发送出去
#### distinct(v => key:String)
如果当前的值经过转换为key，发现key已经存在，该值就会被过滤掉
#### distinctUntilKeyChanged(v => key:String)
如果当前的值经过转换为key，和上一次值的key一样，该值就会被过滤掉
#### distinctUntilValueChanged()
如果当前的值和上一次一样，该值就会被过滤掉
#### materialize()
把signal的数据，完成，错误都包装成Notification对象发送出去
#### dematerialize()
   将包装成的Notification恢复成值，完成，错误发送出去
#### repeat(count)
   如果成功了，重复订阅当前的signal几次
#### retry(count)
   如果错误，重复订阅当前的signal几次
### 6）多流操作
#### merge(signals:Array<Signal>)
   将当前流和传入的流数组合并成一个新的流，所有流的数据都会被当成新流的数据。只有当所有流都完成了，新流才会完成；只要有一个流发生错误，心新流就会发生错误

#### static merge(signals:Array<Signal>)
   merge的类方法
   
#### zip(signals:Array<Signal>)
   将当前流和传入的流数组进行打包形成一个新的流，每当打包内的所有流都有了新的数据，新的流就会将这些流的数据打包成一个数组发送，如果有一个流发生（错误）了，那么新的流也就完成了。任意一个流既没有新的数据且完成了，新的流就会发送完成
   
#### static zip(signals:Array<Signal>)
   zip的类方法

#### switchToLastest()
   如果当前流发送的值都是signal类型，每发送新的值就会订阅该值，同时取消前一次的订阅
   
#### switchCase(signalMap,defaultSignal)
   根据当前的值从signalMap中找到对应的signal，并订阅，同时取消上一次的订阅
#### ifelse(trueSignal, falseSignal)
   根据当前的值是否，订阅对应的signal

# 未完，待补充。如果有问题，或者发现bug，请发邮件[472077629@qq.com]  
