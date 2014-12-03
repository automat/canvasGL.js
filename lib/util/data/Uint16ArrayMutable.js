var ArrayMutable = require('./ArrayMutable');

function Uint16ArrayMutable(reserveSize,autoresize,autoresizeLimit){
    ArrayMutable.apply(this,arguments);
    this.array = new Uint16Array(this._size);
}

Uint16ArrayMutable.prototype = Object.create(ArrayMutable.prototype);

module.exports = Uint16ArrayMutable;