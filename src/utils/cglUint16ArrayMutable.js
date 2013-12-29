function Uint16ArrayMutable(reserveSize,autoresize){
    this._reservedSize = reserveSize;
    this.array         = new Uint16Array(this._reservedSize);
    this._autoresize   = typeof autoresize === 'undefined' ? false : autoresize;

    this._index = 0;
}

Uint16ArrayMutable.__RESIZE_F = 1.5;
Uint16ArrayMutable.MAX = 134217728;

Uint16ArrayMutable.prototype.put1f = function(a){
    var size = this._reservedSize;
    if(this._autoresize && (this._index + 1 >= size)){
        this.resize(Math.floor((size + 1) * Uint16ArrayMutable.__RESIZE_F));
    }
    var array = this.array;
    array[this._index++] = a;
};

Uint16ArrayMutable.prototype.put2f = function(a,b){
    var size  = this._reservedSize;
    if(this._autoresize && (this._index + 2 >= size)){
        this.resize(Math.round((size + 2) * Uint16ArrayMutable.__RESIZE_F));
    }
    var array = this.array;
    array[this._index++] = a;
    array[this._index++] = b;
};

Uint16ArrayMutable.prototype.put3f = function(a,b,c){
    var size  = this._reservedSize;
    if(this._autoresize && (this._index + 3 >= size)){
        this.resize(Math.round((size + 3) * Uint16ArrayMutable.__RESIZE_F));
    }
    var array = this.array;
    array[this._index++] = a;
    array[this._index++] = b;
    array[this._index++] = c;
};

Uint16ArrayMutable.prototype.put4f = function(a,b,c,d){
    var size  = this._reservedSize;
    if(this._autoresize && (this._index + 4 >= size)){
        this.resize(Math.round((size + 4) * Uint16ArrayMutable.__RESIZE_F));
    }
    var array = this.array;
    array[this._index++] = a;
    array[this._index++] = b;
    array[this._index++] = c;
    array[this._index++] = d;
};

Uint16ArrayMutable.prototype.putiv = function(arr,limit,offset){
    offset = offset ? offset : 0;
    var l      = limit  ? arr.length : limit;
    var size   = this._reservedSize;
    if(this._autoresize && (this._index + l >= size)){
        this.resize(Math.round((size + l) * Uint16ArrayMutable.__RESIZE_F));
    }
    var array = this.array;
    var i = -1;
    while(++i < l){array[this._index++] = offset + arr[i];}
};

Uint16ArrayMutable.prototype.resize = function(size){
    this._reservedSize = size;
    var array = new Uint16Array(this._reservedSize);
    array.set(this.array);
    this.array = array;
};

Uint16ArrayMutable.prototype.size  = function(){return this._index;};
Uint16ArrayMutable.prototype.sizeAllocated = function(){return this.array.length;};
Uint16ArrayMutable.prototype.reset = function(){this._index = 0;};

module.exports = Uint16ArrayMutable;