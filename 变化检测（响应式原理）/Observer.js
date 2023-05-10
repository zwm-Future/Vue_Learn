
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
            return val;
        },
        set(newVal) {
            if (newVal === val) return;
            val = newVal;
            dep.notify();
        }
    })
}

module.exports = Observer;