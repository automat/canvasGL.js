function Float32ArrayMutable(reserveSize,autoresize){
    this._size   = reserveSize;
    this._resize = typeof autoresize === 'undefined' ? false : autoresize;
    this._index  = 0;
    this.array   = new Float32Array(this._size);
}

Float32ArrayMutable.__RESIZE_F = 1.5;
Float32ArrayMutable.MAX = 134217728;

// just forward
Float32ArrayMutable.prototype.set = function(array,offset,limit){
    offset = typeof offset === 'undefined' ? 0 : offset;
    limit  = typeof limit  === 'undefined' ? array.length : limit;

    var offsetSize = offset + limit;

    if(this._resize && (offsetSize >= this._size)){
        this.resize(Math.floor(offsetSize * Float32ArrayMutable.__RESIZE_F));
    }

    this.array.set(array,offset);
    this._index = Math.max(this._index,offsetSize);
};

Float32ArrayMutable.prototype.at = function(index){
    if(index > this._index)throw new RangeError('Index out of bounds.');
    return this.array[index];
};

Float32ArrayMutable.prototype.setAt = function(val,index){
    if(index > this._index)throw new RangeError('Index out of bounds.');
    this.array[index] = val;
};

Float32ArrayMutable.prototype.push = function(){
    var argsLen = arguments.length;
    if(argsLen == 0)return;

    var size  = this._size;
    var array = this.array;

    if(this._resize && (this._index + argsLen + 1) >= size){
        this.resize(Math.floor((this._index + argsLen + 1) * Float32ArrayMutable.__RESIZE_F));
    }

    var i = -1;
    while(++i < arguments.length){
        array[this._index++] = arguments[i];
    }
};

Float32ArrayMutable.prototype.pop = function(){
    if(this._index == 0)return null;
    return this.array[this.index--];
};


Float32ArrayMutable.prototype.resize = function(size){
    this._size = size;
    var array = new Float32Array(this._size);
    array.set(this.array);
    this.array = array;
};

Float32ArrayMutable.prototype.size  = function(){return this._index;};
Float32ArrayMutable.prototype.sizeAllocated = function(){return this.array.length;};
Float32ArrayMutable.prototype.reset = function(){this._index = 0;};

module.exports = Float32ArrayMutable;