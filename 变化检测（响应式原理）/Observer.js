const { arrayMethods } = require('./ArrayProxy')
const { Dep } = require('./Dep')
const hasProto = '__proto__' in {};
const arrayKeys = Object.getOwnPropertyNames(arrayMethods);
class Observer {
    constructor(value) {
        this.value = value;
        def(val, '__ob__', this);
        this.dep = new Dep();
        if (Array.isArray(value)) { // 监听值为数组的属性
            const augment = hasProto ? protoAugment : copyAugment;
            augment(value, arrayMethods, arrayKeys)
            this.observeArray(value);
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

    // 监听所有非数组属性
    walk(obj) {
        const keys = Object.keys(obj);
        for (let i = 0; i < keys.length; i++) {
            defineReactive(obj, keys[i], obj[keys[i]]);
        }
    }
}

function def(obj, key, val, enumerable) {
    Object.defineProperty(obj, key, {
        val: val,
        enumerable: !!enumerable,
        writable: true,
        configurable: true
    })
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

// 监听对象某属性变化
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
            childOb.Dep.notify();
        }
    })
}

function observe(val) {
    if (!isObject(val)) return;
    let ob;
    if (hasOwn(val, '__ob__') && val.__ob__ instanceof Observer) {
        ob = val.__ob__;
    } else {
        ob = new Observer(val);
    }
    return ob;
}

function isObject(val) {
    return typeof val === 'object';
}
function hasOwn(val, key) {
    return Object.hasOwn(val, key);
}


module.exports = observe;