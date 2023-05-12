

# 如何监测


```ad-abstract
title: Object
在前面我们监测Object是用到了用到了 Object.defineProperty getter/setter 去监听 对象属性的值的变化

```

然而使用 getter/setter 去监听 数据的操作（push、pop等方法）是行不通的，这些方法并不会触发getter/setter



## 实现方案

```ad-tip
title: 拦截
既然数组会通过数组方法改变数据内容，那么我们可以在数组调用原型的方法时，在中间加多一层拦截器，在调用原生数组方法之前对数据进行处理💹

```


### 拦截器
对每个方法添加一层拦截器👇

```js
const arrayProto = Array.prototype;
const arrayMethods = Object.create(arrayProto);
['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(method => {
    const original = arrayProto[method]; // 原始方法
    Object.defineProperty(arrayMethods, method, {
        value: function mutator(...args) {
            return original.aplly(this.args)
        },
        enumerable: false,
        writable: true,
        configurable: true
    })
})
  
export default arrayMethods;
```

上面代码中 arrayMethods 是 与 数组原型 的 拷贝对象，通过Object.create创建出来的，其引用不是同一个地方.

然后通过 Object.defineProperty 对 arrayMethods 每个方法进行重写，当调用封装过的数组方法时，会走mutator这个方法，我们可以在这个函数里边添加一些自定义逻辑，最后调用 original 即 原生数组的方法，并返回结果.

粗糙的添加拦截器👇

```js
Array.protoype = arrayMethods;
```

```ad-failure
title: 全局

上面这样操作是直接改变了全局数组原型，这样会污染全局变量的，导致每个数组一旦调用数据方法，都会走拦截逻辑，显然这样是不对的


```
```ad-success
title: 侦测

在上一个Object变化检测中，我们实现了一个Observer类，Observer 类 是 对针对需要的Object进行监测，但是之前的实现是监测不了值是数组，现在我们可以添加我们上面写的拦截器，对值为数组的属性进行监听👇

```


```js
class Observer {
    constructor(value) {
        this.value = value;
        if (Array.isArray(value)) {
            value.__proto__ = arrayMethods; // 监听值为数组的属性
        } else {
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



### 问题

由于小数浏览器 是不支持直接访问 **__proto__** 的情况，所以我们需要进行特殊的判断和处理.

```ad-note
title: Vue 2
Vue 2 的做法是如果当前不支持访问__proto__，那么不直接去覆盖调 当前的原型对象，而是直接在需要监听的对象上面添加方法

```


因此我们可以实现以下代码👇

```js
const hasProto = '__proto__' in {};const arrayKeys = Object.getOwnPropertyNames(arrayMethods);
class Observer {
    constructor(value) {
        this.value = value;
        if (Array.isArray(value)) { // 监听值为数组的属性
            const augment = hasProto ? protoAugment : copyAugment;
            augment(value, arrayMethods, arrayKeys)
        } else {
            this.walk(value);
        }
    }
    //...
}
  
// 如果支持__proto__,则直接覆盖掉原型对象
function protoAugment(target, src, keys) {
    target.__proto__ = src;
}
  
// 不支持则往其 添加封装的数组方法
function copyAugment(target, src, keys) {
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        def(target, key, src[key]);
    }
}
```

添加以上代码后，我们就兼容了不支持 **__proto__**的浏览器

## 依赖

```ad-note
上面我们已经具备了 对 数组的监听， 监听数据的目的就是为了能够通知 对 数据的依赖
与 处理Object一样，我们要为数组去收集依赖

```



其实我们之前写的代码就能够收集依赖了 👇

```js
// 监听对象某属性变化

function defineReactive(data, key, val) {
    if (typeof val === 'object') {
        new Observer(val);
    }
    let dep = new Dep;
    Object.defineProperty(data, key, {
        enumerable: true,
        configurable: true,
        get() {
            dep.depend();
            // 收集依赖
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


```ad-abstract
在 get() 函数中 dep.depend() 就是为了收集依赖

```


### 依赖位置


```ad-note
title: 位置
在前面我们是通过 Observer类 去管理每个监听数据，但是我们的依赖是 在 defineReactive 中创建的，每个Observer实例 未能收取到, 所以应该把 收集的依赖放置每个实例下，这样实例都能访问到自己的依赖项.👇

```


```js
class Observer {
    constructor(value) {
        this.value = value;
        this.dep = new Dep(); // 依赖
        if (Array.isArray(value)) { // 监听值为数组的属性
            const augment = hasProto ? protoAugment : copyAugment;
            augment(value, arrayMethods, arrayKeys)
        } else {
            this.walk(value);
        }
    }
    //...
}
```


```ad-info
在上面我们为每个实例都有自己的依赖，能在数据监听通知依赖

```


### 依赖收集


知道依赖收集的位置后，我们就要去相应的地方收集依赖，前面已经讲过，依赖是在 getter 里边收集的，setter里边触发依赖 👇

```js
Object.defineProperty(data, key, {
        enumerable: true,
        configurable: true,
        get() {
            dep.depend(); // 收集依赖
            return val;
        },
        set(newVal) {
            if (newVal === val) return;
            val = newVal;
            dep.notify();
        }
})
```


```ad-note
分离代码👇

```


```js
// 为每个 val 创建实例
// 如果已经存在则返回已经存在的实例
// 否则 创建实例
function observe(val) {
    if (!isObject(val)) return;
    let ob;
    if (hasOwn(val, '__ob__') && val.__ob__ instanceof Observer) {
        ob = val.__ob__;
    } else {
        ob = new Observer();
    }
    return ob;
}
  
function isObject(val) {
    return typeof val === 'object';
}
function hasOwn(val, key) {
    return Object.hasOwn(val, key);
}
```


```js
function defineReactive(data, key, val) {
    let childOb = observe(val);
    Object.defineProperty(data, key, {
        enumerable: true,
        configurable: true,
        get() {
            if (childOb) {
                childOb.dep.depend();
            }
            return val;
        },
        set(newVal) {
            if (newVal === val) return;
            val = newVal;
            childOb.ob.notify();
        }
    })
}
```


上面把新建实例的代码分离出来，新增了observe 函数， 处理 数据的监听实例，尝试创建一个实例，如果已经有了，则直接返回已经创建的实例，避免重复侦测 数据的 变化👆

```ad-info
这里的hasOwn(val, '__ob__') && val.__ob__ instanceof Observer 可能会有点晦涩难懂，
这里的val.__ob__ 其实就是创建的Obverser实例
<font color=#81B300>那为什么判断这个就能知道是不是已经创建实例了呢？</font>我们继续往下看
```


## 获取实例


```ad-note
前面我们通过拦截器去监听数组的变化，监听的目的是为了在数组使用操作方法时能够通知依赖
但是在拦截器中我们还获取不到依赖，为了能使 数组方法能过获取依赖，依赖dep是保存在Observer的，所以我们需要在拦截器的this上能读到Obverser实例👇
```

```js

class Observer {

    constructor(value) {

        this.value = value;

        def(val,'__ob__',this);//为 val 属性 __ob__ 赋值 实例
        //...
}

function def(obj,key,val,enumerable) {
    Object.defineProperty(obj,key,{
        val:val,
        enumerable:!!enumerable,
        writable:true,
        configurable:true
    })
}

```


```ad-tip
仔细看def函数，这个函数就是在对象上某个属性添加某个值，def(val,'__ob__',this)意味着，val有个属性__ob__是指向该实例的，也就是说当 val 是数组比如[1,2]，我们在 [1,2]这个数组上添加了一个属性指向该实例，而我们拦截器是直接覆盖掉数组的原型的，这样子我们在拦截器中通过 this.__ob__ 访问到 Obverser实例，从而访问到依赖，通知依赖.👆

并且，我们能通过 hasOwn(val, '__ob__') && val.__ob__ instanceof Observer 知道 val 是否已经拥有着对应的 Observer 实例

```



```ad-note
能访问到实例依赖后，我们就能在数组操作方法中去通知依赖👇

```

```js
['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(method => {
    const original = arrayProto[method]; // 原始方法
    Object.defineProperty(arrayMethods, method, {
        value: function mutator(...args) {
            const result = original.aplly(this, ...args);
            const ob = this.__ob__;
            ob.dep.notify();
            return result;
        },
        enumerable: false,
        writable: true,
        configurable: true
    })
})
```


## 数组变化

### 数组元素

```ad-note
前面我们只关注了数组本身，并未关注数组的元素，数组元素也可能是Object，也是会变化的，因此我们也需要对其进行侦测👇

```


```js
class Observer {
    constructor(value) {
        this.value = value;
        def(val, '__ob__', this);
        this.dep = new Dep();
        if (Array.isArray(value)) { // 监听值为数组的属性
            const augment = hasProto ? protoAugment : copyAugment;
            augment(value, arrayMethods, arrayKeys)
            this.observeArray(value); // 新增
        } else {
            this.walk(value);
        }
    }
    //监听数组元素
    observeArray(items) {
        for (let i = 0; i < items.length; i++) {
            observe(items[i]);
        }
    }
}
```

```ad-note
在上边通过 observerArray函数 去监听 数组中每一个元素.

```


### 新增元素

数组中有一些方法是会新增元素的，而新增的元素也是需要转成响应式的，即被侦测

对操作的方法进行判断，得到新增的元素👇

```js
['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(method => {
    const original = arrayProto[method]; // 原始方法
    Object.defineProperty(arrayMethods, method, {
        value: function mutator(...args) {
            const result = original.aplly(this, ...args);
            const ob = this.__ob__;
            let inserted;//新增
            switch (method) {
                case 'push':
                case 'unshit':
                    inserted = args;
                    break;
                case 'splice':
                    inserted = args.slice(2);
                    break
            }
            //...
        },
        //...
    })
})
```

在上面我们通过 swich 判断 数组操作方法，并得到新增的元素

```ad-tldr
title: 侦测
得到元素之后，这里的insered数组，直接使用ob.observerArray进行侦测👇

```


```js
['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(method => {
    const original = arrayProto[method]; // 原始方法
    Object.defineProperty(arrayMethods, method, {
        value: function mutator(...args) {
            const result = original.aplly(this, ...args);
            const ob = this.__ob__;
            let inserted;//新增
            switch (method) {
                case 'push':
                case 'unshit':
                    inserted = args;
                    break;
                case 'splice':
                    inserted = args.slice(2);
                    break
            }
            if(inserted) ob.observeArray(inserted);//新增
            //...
        },
        //...
    })
})
```

# 问题

回顾前面，Vue 2  监测数组是通过拦截原型方式实现的，正是因为这种实现方式，导致有些数组操作我们是监听不到的，例如

```js
this.list[0] = 1;
this.list.length = 0;
```

修改数组中第一个元素的值或者清空数组，是无法侦测到数组的变化，所以也不会触发 re-render 或者watch


```ad-info
这个问题还是在于 ES6 之前无法提供元编程的能力，所以 在 ES6 有了 Proxy之后， Vue3 中
通过 Proxy 重写了 数据侦测的实现
```
