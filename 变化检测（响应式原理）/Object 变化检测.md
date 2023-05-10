 

# 变化检测


```ad-note
title: Vue
我们在进行Vue模板渲染数据的时候，大部分都会在data 声明 哪些 数据 是响应式的，这里的响应式是指 数据更新，视图自动更新，无需我们去手动操作视图。
而如何去进行数据更新呢，在 Vue 中， 我们直接去更改实例上的 data 中的数据就会触发 视图更新。
那 Vue 是如何 知道 我们更改了数据 呢 ？ 答案就是 Vue 对 data 中的数据进行了 变化检测

```


所谓的变化检测就是侦测数据的变化，然后做出相应的处理。


## 分类


### “拉”

React 和 Angular 都属于这种类型，所谓“拉” 是说，当状态发生改变的时候，框架不知道是具体哪个状态发生改变了，只知道有状态改变了，发信号给框架说要进行数据和视图的更新，然后通过暴力对比找出哪些需要更新。在React中，是构建 整个 React Fiber 进行 新旧对比，在Angular是进行脏检查


### "推"

Vue 与 “拉”不同，当状态改变时，Vue知道是哪个状态改变了，对那些改变的状态的视图依赖进行更新就行，其粒度更细。

```ad-summary
title: 注意
但是由于粒度越细，其状态绑定的依赖越多，需要更多的内存消耗

```


```ad-note
title: Vue
Vue 1 意识到这个问题后，从 Vue 2 开始 ，Vue 将 粒度 提升至 组件，依赖不再是具体的DOM节点，而是组件，同时引入 虚拟DOM，这样当状态改变时，通知到组件，然后在组件内部进行虚拟DOM的对比即可，这样大大减少依赖数量，也降低了内存消耗。可见 Vue 粒度 是中等程度的.

```


# 如何监测 Object 


在JS中，有两种方法可以检测 对象 的变化，一是通过 Object.defineproperty ，一种是 通过 ES6 的proxy

```ad-info 
在Vue 3 使用的 是 ES6 的 proxy进行数据监测，在 Vue 2 中使用的是 Object.defineProperty

```


## Object.defineproperty


object.defineproperty 这个 方法可以定义 对象上的某个属性以及属性的配置

在设置属性的值的时候，可以不使用 value选项，直接使用 get和set两个函数进行值的监测.

封装成 一个 函数 👇

```js
function defineReactive(data, key, val) {
    Object.defineProperty(data, key, {
        enumerable: true,
        configurable: true,
        get() {
            return val;
        },
        set(newVal) {
            if (newVal === val) return;
            val = newVal;
        }
    })
} 
```


defineReactive函数可以对 data对象进行监听，上述函数只是一个雏形，还需要收集相应的依赖


## 收集依赖


所谓的依赖是指 监测到状态的变化后，我们要去通知 对 这些变化的状态的 依赖，如模板的更新.

例如有以下模板

```vue
<template>
	<h1>{{name}}</h1>
</template>
```

模板中使用到了 name 数据，当 name 发生变化时， 我们要向使用它的地方发送通知

先收集依赖，在数据发生变化的使用，通知依赖


**从对象的角度上看就是，在 getter 中收集依赖，在 setter 中 通知依赖.**


假设依赖是一个函数，保存在 window.target 上 ，我们为每个key定义一个变量用来收集依赖 👇

```js
function defineReactive(data, key, val) {
    let dep =[];
    Object.defineProperty(data, key, {
        enumerable: true,
        configurable: true,
        get() {
            dep.push(window.target);
            return val;
        },
        set(newVal) {
            if (newVal === val) return;
            for(let item of dep) item(newVal,val);
            val = newVal;
        }
    })
}
```

上述新增了dep数组用于保存依赖，我们把它抽离出来成一个类 👇 

```js
export default class Dep {
    constructor() {
        this.subs = [];
    }
    addSub(sub) {
        this.subs.push(sub);
    }
    removeSub(sub) {
        remove(this.subs, sub);
    }
    depend() {
        if (window.target) {
            this.addSub(window.target);
        }
    }
    notify() {
        const subs = this.subs.slice();
        for (let item of subs) {
            item.update();
        }
    }
}
  
function remove(arr, item) {
    if (arr.length) {
        const index = arr.indexOf(item);
        if (index > - 1) {
            return arr.splice(index, 1);
        }
    }
}
```

更改一下 defineReactive 函数 👇

```js
function defineReactive(data, key, val) {
    let dep = new Dep;
    Object.defineProperty(data, key, {
        enumerable: true,
        configurable: true,
        get() {
            dep.depend();
            return val;
        },
        set(newVal) {
            if (newVal === val) return;
            val = newVal;
            dep.notify();
        }
    })
}
```




## watcher

前面说了很多依赖，window.target 又是什么。

其实从具体上来讲，依赖可能是 前面具体的模板，也可能是 我们写的 watch


```js
vm.$watch('a.b',function(newVal,oldVal){
	//状态变化时, Todo Something
})
```


为了处理这些情况，把其抽成一个类 watcher ，我们在收集依赖的时候 只需实例化这个类，状态变化的时候，通知这个类，再由这个类去通知其他地方.


实现 watcher 类

为了读取 a.b 深层的值，我们先写一个函数 👇 


```js
const bailRE = /[^\w.$]/
function parsePath(path) {
    if (bailRE.test(path)) return;
    const segments = path.split('.');
    return function (obj) {
        if (!obj) return;
        for (let i = 0; i < segments.length; i++) {
            obj = obj[segments[i]];
        }
        return obj;
    }
}
```

该函数返回一个函数，我们传入对象后就能读取值.


wathcer类👇

```js
class Watch {
    constructor(vm, expOrFn, cb) {
        this.vm = vm;
        this.getter = parsePath(expOrFn);
        this.cb = cb;
        this.value = this.get();
    }
    get() {
        window.target = this;
        value = this.getter.call(this.vm, this.vm);
        window.target = undefined;
        return value
    }
  
    update() {
        const oldValue = this.value;
        this.value = this.get();
        this.cb.call(this.vm, this.value, oldValue);
    }
}
```

constructor 主要是 初始化实例，其中getter 就是 上面 获取深层值的函数

仔细看 get 的 实现，其 将 window.target = this， 然后调用 getter 也就是 去获取深层值，
在上面我们对值进行了监听，获取 深层的值 也就触发了  ge t函数（在Object.dfineproperty 参数中声明的函数），而get函数 又会将 window.target 添加到 依赖中

也就是说 一但实例化 Watch， 那么 这个实例就会 自动添加到 监听数据的 依赖中。

update 会在在值更新时执行 get 方法，实例会获取最新的值，并触发 cb 回调函数


## Obsever

上述 defineReactive 只实现了 对 某个属性进行监听，现在我们封装成 Observer 类，该类能对数据所有属性进行监听

```js
class Observer {
    constructor(value) {
        this.value = value;
        if (!Array.isArray(value)) {
            this.walk(value);
        }
    }
    // 监听所有属性
    walk(obj) {
        const keys = Object.keys(obj);
        for (let i = 0; i < keys.length; i++) {
            defineReactive(obj, keys[i], obj[keys[i]]);
        }
    }
}
```


![[Pasted image 20230510225905.png]]


# 问题


使用 Object.defineProperty 去监听对象的时候，set 和  get 函数只能监听到数据是否修改，并不能监听到 对象上新增或者删除了属性 

```js
  

const vm = new Vue({
    el: '#root',
    template: '#demo',
    data() {
        return {
            obj: {
                name: 'name',
            }
        }
    },
    watch: {
        'obj.name': function () {
            console.log("name isn't modefied !");
        }
    },
    methods: {
        action: function () {
            delete this.data.obj.name;
        }
    },
  
})
```


所以在 Vue 2 中 对 数据 进行 添加 或者 删除 属性，Vue 2 并不能监听到.

```ad-info
title:因此 Vue 3 使用 ES6中的 Proxy 进行 数据的监听

```




