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
module.exports = Watch;