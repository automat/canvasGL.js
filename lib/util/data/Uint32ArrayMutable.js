var ArrayMutable = require('./ArrayMutable');

function Uint32ArrayMutable(reserveSize,autoresize,autoresizeLimit){
    ArrayMutable.apply(this,arguments);
    this.array = new Uint32Array(this._size);
}

Uint32ArrayMutable.prototype = Object.create(ArrayMutable.prototype);

module.exports = Uint32ArrayMutable;