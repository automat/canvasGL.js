
function Float32ArrayMutable(reserveSize,autoresize){
    this._reservedSize = reserveSize;
    this.array         = new Float32Array(this._reservedSize);
    this._autoresize   = typeof autoresize === 'undefined' ? false : autoresize;

    this._index = 0;
}

Float32ArrayMutable.__RESIZE_F = 1.5;
Float32ArrayMutable.MAX = 134217728;

Float32ArrayMutable.prototype.put1f = function(a){
    var size = this._reservedSize;
    if(this._autoresize && (this._index + 1 >= size)){
        this.resize(Math.floor((size + 1) * Float32ArrayMutable.__RESIZE_F));
    }
    var array = this.array;
    array[this._index++] = a;
};

Float32ArrayMutable.prototype.put2f = function(a,b){
    var size  = this._reservedSize;
    if(this._autoresize && (this._index + 2 >= size)){
        this.resize(Math.round((size + 2) * Float32ArrayMutable.__RESIZE_F));
    }
    var array = this.array;
    array[this._index++] = a;
    array[this._index++] = b;
};

Float32ArrayMutable.prototype.put3f = function(a,b,c){
    var size  = this._reservedSize;
    if(this._autoresize && (this._index + 3 >= size)){
        this.resize(Math.round((size + 3) * Float32ArrayMutable.__RESIZE_F));
    }
    var array = this.array;
    array[this._index++] = a;
    array[this._index++] = b;
    array[this._index++] = c;
};

Float32ArrayMutable.prototype.put4f = function(a,b,c,d){
    var size  = this._reservedSize;
    if(this._autoresize && (this._index + 4 >= size)){
        this.resize(Math.round((size + 4) * Float32ArrayMutable.__RESIZE_F));
    }
    var array = this.array;
    array[this._index++] = a;
    array[this._index++] = b;
    array[this._index++] = c;
    array[this._index++] = d;
};

Float32ArrayMutable.prototype.putfv = function(arr,limit){
    var l      = limit  ? arr.length : limit;
    var size   = this._reservedSize;
    if(this._autoresize && (this._index + l >= size)){
        this.resize(Math.round((size + l) * Float32ArrayMutable.__RESIZE_F));
    }
    var array = this.array;
    var i = -1;
    while(++i < l){array[this._index++] = arr[i];}
};

Float32ArrayMutable.prototype.resize = function(size){
    this._reservedSize = size;
    var array = new Float32Array(this._reservedSize);
    array.set(this.array);
    this.array = array;
};

Float32ArrayMutable.prototype.size  = function(){return this._index;};
Float32ArrayMutable.prototype.sizeAllocated = function(){return this.array.length;};
Float32ArrayMutable.prototype.reset = function(){this._index = 0;};

module.exports = Float32ArrayMutable;