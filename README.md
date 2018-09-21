# RacJS
implementation of RAC(OC) on JavaScript and replacement of RxJS
## Signal（类比RxJS的Observable）
包含一定数量的可订阅数据（值，完成，错误）的信号对象，订阅者再接受到error或者complete之后就意味着订阅已经结束，即使信号还有没发送的值
```
let signal = new Signal(s => {
   s.sendNext(2)
   s.sendNext(3)
   s.sendComplete()
   //s.sendError(new Error())
})
```
