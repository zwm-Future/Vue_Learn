

```ad-note
除了在声明时Vue自动帮我们做数据监听，Vue 也暴露了相关API，让我们有能力去知道数据的变化，做出相应的操作

```


# vm.$watch


## 用法

vm.$watch( expOrFn, callback, [options] )

**参数**：

-       `{string | Function} expOrFn`
    -   `{Function | Object} callback`
    -   `{Object} [options]`
        -   `{boolean} deep`
        -   `{boolean} immediate`

-   **返回值**：`{Function} unwatch`

```ad-summary
title: Usage
观察 Vue 实例上的一个表达式或者一个函数计算结果的变化。回调函数得到的参数为新值和旧值。表达式只接受简单的键路径。对于更复杂的表达式，用一个函数取代

```


```ad-example
title:表达式
```js

const unwatch = vm.$watch('a.b.c',function(oldVal,newVal) {

	//do something

})

```


```ad-example
title:函数
```js

const watch = vm.$watch(function(){

	return this.a + this.b;

},function(oldVal,newVal) {

	//do something

})

```

上面分别是对属性或者用函数返回一个每次得出一个不同的结果时 进行监听，一但对应的数据变化，就会相应的触发callback 回调。而且watch 返回一个 取消观察函数，用于取消 之前对 数据的 watch，调用完取消观察函数后，当数据变化时，callback 回调函数将不会执行。

```ad-tip
title:Options
**deep: 为了发现对象内部值的变化，该选项为true时，如果对象内部的值发生变化，此时callback就会执行，也就是说 启用该选项时，能监听对象包含对象内部的值变化.**
————————————————————————————————————————
**immediate：在选项参数中指定 true 时  将立即以表达式的当前值触发回调**

```


## 内部实现


```ad-tip
在实现$watch前，让我们回顾一下之前 的 变化监测相关 类👇

```

![image](https://github.com/zwm-Future/Vue_Learn/assets/82597033/888efe58-88bc-43cf-b605-8f17e8aec83f)



从 数据侦测 到 收集依赖、再到 通知依赖，主要有 三个类，
Obverser 负责 创建维护 数据的监听   
Dep类负责 每个监听数据的依赖的维护
Watch类则是 维护相关回调



而 $watch 就可以 通过 Watch 去  实现  👇


```js
const $watch = function(expOrFn,cb,options) {
    const vm = this;
    options = options || {};
    const watcher = new Watch(vm,expOrFn,cb);
    if(options.immediate) {
        cb.call(vm,watcher.value);
    }
    return function unwatchFn() {
        watcher.teardown();
    }
}
```


上面 通过 实例化 Watch后就被某个响应式的Dep收集了，就具备了当响应式数据变化时触发指定回调的能力，

当调用unwatchFn 时，我们需要去 移除 订阅的依赖列表，通过watch.teardown方法去实现👇

```ad-info
title: 依赖
VUe 本身可以通过 Watch 为 视图 和 数据 架起桥梁，可以通过Watch 为 视图的更新注册相应的依赖，
我们在使用 $watch 方法时也相当于是注册依赖，cb回调是依赖，当指定的数据发生变更时，通知依赖，cb回调也就执行了。

```


为了注销依赖，watch 实例 需要知道自己被哪些 Dep收集了 ，改动 Watch类👇

```js
class Watch {
    constructor(vm, expOrFn, cb) {
        this.vm = vm;
        this.deps = [];
        this.depIds = new Set();
        if (typeof expOrFn === 'function') {
            this.getter = expOrFn;
        } else {
            this.getter = parsePath(expOrFn);
        }
	    //...
    }
    //...
    addDep(id) {
        const id = dep.id;
        if(!this.depIds.has(id)) {
            this.depIds.add(id);
            this.deps.push(dep);
            dep.addSub(this);
        }
    }
}


class Dep {
	//...
    depend() {
        if (window.target) {
            window.target.addDep(this);
           //  this.addSub(window.target); 删除
        }
    }
    //...
}
```

```ad-info
上面 在 Watch 中 constructor 新增的  的条件是判断，传入的是表达式还是函数，如果 传入的是函数，则 getter 是 parsePath，这里的 parsePath 是 读取 传入表达式的值，读取意味着 会触发相关收集依赖过程，而当传入的函数也是一样，如果函数内部读取了相关响应式数据，也会触发相关收集依赖过程。

```


之前添加依赖的时候，this.addSub(window.target)是直接将 watch 实例添加进去，现在为了让 watch 实例 知道被哪些 Dep收集了，在 Watch 新增了 addDep 方法， 执行 window.target.addDep(this) 后，watch 的 this.deps 就能知道 自己被 哪些 数据的Dep 收集了 

depIds 则是 判断 如果当前的watch 实例 是否订阅了 该 Dep，则不会重新订阅。
当数据发生变化时，会通知 watch 重新获取最新的数据。如果没有这个判断，获取相当于重新读取，也就是再次收集依赖，这样会导致Dep中的依赖有重复，会重复通知watch。


一个数据会收集很多依赖，因此我们需要去唯一的标识每个依赖👇

```js
let uid = 0;

class Dep {

    constructor() {

        this.subs = [];

        this.id = uid++;

    }
}
  
```


```ad-note
title:回顾
让我们回顾一下总体过程（建议边看代码边理解）：

<font color=#81B300>收集过程：</font>
我们通过Observer类对 需要监听的数据进行监听，并且每个数据元素在初始化监听的时候都会实例化一个依赖数组Dep，里边会收集着对应的依赖，监听的过程有个 get() 函数，<font color=#ffdc5c>当读取</font>被监听的数据时，会执行get函数， get 函数 里边又会执行 Dep实例的depend方法（childOb.dp.depend()），该方法是将window.target 添加到依赖数组中。
而当我们去创建一个依赖，即用 Watch类去创建时，Watch类做的事情就是，收集要监听的数据（字符或者函数），其 实例 也有一个 get 方法，该方法是为了获取最新的值，并把自身赋值到window.taget上，执行 Watch 实例的 get 方法 意味着读取数据，也就意味着触发了 Observer实例的 get方法，这样下来Watch实例 = window.target 会被 Observer实例的Dep收集.

收集的目的都是为了去更新触发回调，接下来是更新过程。

<font color=#81B300>更新过程：</font>
收集完依赖后，每个数据元素对应着每一个Observer实例，Observer 实例有一个 Dep负责维护依赖，当更新数据元素时，即触发了 监听数据的set方法，主要做的就是让当前实例下的依赖去通知依赖（childOb.dep.notify），notify 就是循环各个依赖（watch实例），执行每个依赖的update函数，该函数主要是获取最新的值，然后执行自定义回调（可能是开发者自定义函数，也可能是视图更新）。

<font color=#81B300>再看 $watch：</font>

$watch 做的事情其实很简单，就是实例化一个Watch（实例过程就完成了依赖的收集，等待数据更新触发），添加自己的自定义函数回调

```


理解完上述过程后，再来看一下 teardown 函数的实现

前面是实现被收集的的过程，当数据更新时不需要在进行 通知 时，需要去掉 关联的依赖数组中的依赖（即watch自身）👇
```js
class Watch {
    //...
    teardown() {

        let i = this.deps.length;

        while(i--) {

            this.deps[i].removeSub(this);

        }

    }

}
```

这里有多个依赖数组，是因为一个依赖(watch)可能会被多个Dep收集，比如 $watch 传入的是一个函数，函数读取了几个监听的值（this.data.a、this.data.b），这时候就会会被多个依赖数组收集，
所以在去除的过程也需要一一去除.

## immediate

实现 Immediate 也很简单，判断是否为 true，如果为 true 那么就在 初始化的时候手动执行 cb 回调函数👇

	if(options.immediate) { cb.call(vm,watcher.value) }


## deep

deep 的目的是当 当前值 在内的所有子值发生变更时，也能被通知，换句话说，watch实例除了要被当前值的依赖数组收集，还要被 所有子值的依赖数组收集.


```ad-note

用递归去实现，递归收集依赖 👇
```

```js
Class Watcher {
	constructor(vm, expOrFn, cb, options) {
        this.vm = vm;
        this.deps = [];
        this.depIds = new Set();
        //...
        if (options) {//新增
            this.deep = !!options.deep;
        } else {
            this.deep = false;
        }
        this.cb = cb;
        this.value = this.get();
    }
	//...
	get() {
		window.target = this;
        value = this.getter.call(this.vm, this.vm);
		if (options.deep) { // 新增
            traverse(value);
        }
        window.target = undefined;
        return value
	}

}



const seenObjects = new Set();
function traverse(val,) {
    _traverse(val, seenObjects);
    seenObjects.clear()
}

  

function _traverse(val, seen) {
    let i, keys;
    const isA = Array.isArray(val);
    if ((!isA && !isObject(val)) || Object.isFrozen(val)) return;
    if (val.__ob__) {
        const depId = val.__ob__.dep.id;
        if (seen.has(depId)) return;
        seen.add(depId);
    }
    if (isA) {
        i = val.length;
        while (i--) {
            _traverse(val[i], seen);
        }
    } else {
        i = Object.keys(val);
        while (i--) { _traverse(val[keys[i]], seen); }
    }
}
```

主要的实现还是在  _traverse 函数中， 该函数 判断值是数组还是对象，如果是对象则遍历 对象各个属性，如果是数组，则遍历每个元素。 seenObjects 是为了收集每个 Observe实例的 depId，防止循环引用时，发生死递归。

```ad-info
title: 依赖收集在哪
咋一看 _traverse 实现，好像没有出现依赖收集的代码呀？？？

再次强调，依赖收集的触发条件是<font color=#ffdc5c>读取了值</font>，再仔细看看，代码在哪里读取了值
在调用_traverse(val,seen)、_traverse(val[i], seen)、_traverse(val[keys[i]], seen)的时候，我们就读取了值，而且在Watch的get函数代码中，是在window.target = undefined 之前进行收集的。
```

最后再改一下 $watch 的 代码 👇

```js
const $watch = function(expOrFn,cb,options) {
	//...
    const watcher = new Watch(vm,expOrFn,cb,options); // 修改
   //...
}
```

# vm.$set

```ad-tldr
之前我们在做数据侦测的时候，由于 ES6之前 没有 提供 元编程能力，所以 无法对  对象的新增属性操作进行侦测

但 Vue 为 弥补这一缺点，提供了 $set API，能够对新增属性进行侦测

```


## 用法

Vue.set(target,propertyName/index.value)

-   **参数**：
    
    -   `{Object | Array} target`
    -   `{string | number} propertyName/index`
    -   `{any} value`
-   **返回值**：设置的值。


使用 set <font color=#ffdc5c>向响应式对象</font> 添加一个 property，能够是这个新的 property 是响应式的，且能够触发视图更新。

```ad-attention
title:响应式
注意 set 方法与 watch 方法一样，传入的数据元素是已经被Vue初始化过了，换句话说 其 必须用于响应式对象上，否则是无法起到效果的

```


## 内部实现


变化的检测主要有 对象侦测和数组侦测，因此需要分开处理

### 数组处理


```ad-tip
title: 回顾
回顾一下我们之前是如何对数组进行侦测的，我们通过 拦截器的方式对数组方法侦测数组本身，用 侦测对象那一套方法侦测数组元素。在处理一些新增元素的数组方法时，为新增的元素进行响应式处理，将其转为响应式数据
```

因此，对于 响应式数组中元素的修改，可以使用 splice 方法，这个方法
可以修改数组中的元素（增加、删除、替换，[Array.prototype.splice() - JavaScript | MDN (mozilla.org)](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/splice)）。

比如 set(arr,1,value)，arr 中  index 为 1 的元素被修改 为 value ，可以看成是去掉 arr 中 index 为 1 的元素， 并在 index 为 1 的位置 新增一个元素 value
这样看似修改其实是去除添加的过程。

对响应式数组处理代码👇

```js
const $set = function(target,key,val) {
    if(Array.isArray(target) && isValidArrayIndex(key)) {
        target.length = Math.max(target.length,key) 
        target.splice(key,1,val);
        return val;
    }
}
```

代码中 如果传递的索引值  key 大于 当前数组的 length时，就需要让 target 的length等于 索引值

然后通过 splice 方法 将 val 添加到 响应式数组中，在执行splice  方法过程中，数组拦截器 会为 新增的元素 进行响应式处理，让val 具备响应式，因为调用了数组，修改了元素,最后也会通知依赖（详细看 数组拦截器）.


### 属性处理

```ad-tip
title: 响应式
对于属性的处理很简单，直接调用 监听对象某属性方法defineReactive

```

```js
const $set = function (target, key, val) {
    //...
    if (key in target && !(key in Object.prototype)) { // 添加的属性已存在，直接修改
        target[key] = val;
        return;
    }
    const ob = target.__ob__;
    if (target._isVue || (ob && ob.vmCount)) { // 不能监听根数据对象
        process.env.NODE_ENV != 'production' && console.warn(
            'Avkjd addj g reactive properties to a Vue instance of its root $data' +
            'at runtime - decaler it upfront in the data option.'
        );
        return val;
    }
    if (!ob) { // target不是响应式数据
        target[key] = val;
        return;
    }
    defineReactive(ob.value, key, val);
    ob.dep.notify();
    return val;
}
```


key 如果 已经被响应式处理了，那么直接修改值即可

中间代码 可以忽略  _isVue 和 vmCount，主要是 对 不能监听根数据对象做处理

如果 target不是响应式数据（也就是说没有__ob__属性） ，则直接修改值即可

如果是 target 是响应式数据（有 __ob__属性），则对新增属性进行响应式处理追踪变化，最后调用 notify 通知 依赖（因为当前对象新增了一个属性）


# vm.$delete

## 用法

Vue.delete(target, propertyName/index)

**参数**：

-   `{Object | Array} target`
-   `{string | number} propertyName/index`

删除对象的property，如果对象是响应式的，删除时能触发更新视图 


```ad-note
title: 偏方
除了 调用官方API，可以危险的手动更新：
delete this.data.a;
this.data.__ob__.dep.notify()

```

## 内部实现

其实大致的实现与上面的 <font color=#ffdc5c>偏方</font> 差不多，删除数组元素或者对象属性，通知依赖👇

```js
const $delete = function (target, key) {
    if (Array.isArray(target) && isValidArrayIndex(key)) {
        target.splice(key, 1);
        return
    }
    if (target._isVue || (ob && ob.vmCount)) { // 不能监听根数据对象
        process.env.NODE_ENV != 'production' && console.warn(
            'Avkjd addj g reactive properties to a Vue instance of its root $data' +
            'just set it to null'
        );
        return;
    }
    const ob = target.__ob__;
    if (!hasOwn(target, key)) { // key 不是自身属性
        return;
    }
    delete target[key];
    if (!ob) return; // 不是响应式数据
    ob.dep.notify();
}
```

与 set 一样，需要判断
如果是数组，则调用 数组方法删除元素，删除元素的过程会通知依赖

如果是 对象，不能删除根数据对象上的属性
如果删除的属性在 target 中不存在，则不需要进行删除操作，也不需要通知依赖

删除属性后，还有判断当前的 target 是不是响应式数据，如果不是则不需要通知依赖，否则就需要通知依赖,
