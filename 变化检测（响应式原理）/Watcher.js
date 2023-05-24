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
    constructor(vm, expOrFn, cb, options) {
        this.vm = vm;
        this.deps = [];
        this.depIds = new Set();
        if (typeof expOrFn === 'function') {
            this.getter = expOrFn;
        } else {
            this.getter = parsePath(expOrFn);
        }
        if (options) {
            this.deep = !!options.deep;
        } else {
            this.deep = false;
        }
        this.cb = cb;
        this.value = this.get();
    }
    get() {
        window.target = this;
        value = this.getter.call(this.vm, this.vm);
        if (options.deep) {
            traverse(value);
        }
        window.target = undefined;
        return value
    }

    update() {
        const oldValue = this.value;
        this.value = this.get();
        this.cb.call(this.vm, this.value, oldValue);
    }
    addDep(id) {
        const id = dep.id;
        if (!this.depIds.has(id)) {
            this.depIds.add(id);
            this.deps.push(dep);
            dep.addSub(this);
        }
    }
    teardown() {
        let i = this.deps.length;
        while (i--) {
            this.deps[i].removeSub(this);
        }
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
        while (i--) { traverse(val[keys[i]], seen); }
    }
}
function isObject(val) {
    return typeof val === 'object';
}
module.exports = Watch;