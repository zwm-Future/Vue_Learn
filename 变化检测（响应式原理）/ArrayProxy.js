const arrayProto = Array.prototype;
const arrayMethods = Object.create(arrayProto);
['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(method => {
    const original = arrayProto[method]; // 原始方法
    Object.defineProperty(arrayMethods, method, {
        value: function mutator(...args) {
            const result = original.aplly(this, ...args);
            const ob = this.__ob__;
            let inserted;
            switch (method) {
                case 'push':
                case 'unshit':
                    inserted = args;
                    break;
                case 'splice':
                    inserted = args.slice(2);
                    break
            }
            if(inserted) ob.observeArray(inserted);
            ob.dep.notify();
            return result;
        },
        enumerable: false,
        writable: true,
        configurable: true
    })
})

module.exports = { arrayMethods };