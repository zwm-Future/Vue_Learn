const Watch = require('./Watcher');

const $watch = function (expOrFn, cb, options) {
    const vm = this;
    options = options || {};
    const watcher = new Watch(vm, expOrFn, cb, options);
    if (options.immediate) {
        cb.call(vm, watcher.value);
    }
    return function unwatchFn() {
        watcher.teardown();
    }
}


const $set = function (target, key, val) {
    if (Array.isArray(target) && isValidArrayIndex(key)) {
        target.length = Math.max(target.length, key)
        target.splice(key, 1, val);
        return val;
    }
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
    if (!ob) { // 不是响应式数据
        target[key] = val;
        return;
    }
    defineReactive(ob.value, key, val);
    ob.dep.notify();
    return val;
}

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