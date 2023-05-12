const { Watcher } = require('./Watcher')

const data = {
    a: 1
}
data.__proto__ = {
    getA:function() {
        console.log(this.a);
    }
}
data.getA();