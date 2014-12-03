var ArrayMutable = require('./ArrayMutable');

function Float32ArrayMutable(reserveSize,autoresize,autoresizeLimit){
    ArrayMutable.apply(this,arguments);
    this.array = new Float32Array(this._size);
}

Float32ArrayMutable.prototype = Object.create(ArrayMutable.prototype);

module.exports = Float32ArrayMutable;