function ArrayMutable(reserveSize,autoresize,autoresizeLimit){
    this._size        = reserveSize;
    this._resize      = typeof autoresize === 'undefined' ? false : autoresize;
    this._resizeLimit = autoresizeLimit;
    this._index       = 0;
    this.array        = null;
}

ArrayMutable.__RESIZE_F = 1.5;

ArrayMutable.prototype.set = function(array,offset,limit){
    offset = typeof offset === 'undefined' ? 0 : offset;
    limit  = typeof limit  === 'undefined' ? array.length : limit;

    var offsetSize = offset + limit;

    if(this._resize && (offset + array.length >= this._size)){
        this.resize(Math.floor(offsetSize * ArrayMutable.__RESIZE_F));
    }

    this.array.set(array,offset);
    this._index = Math.max(this._index,offsetSize);
};


ArrayMutable.prototype.at = function(index){
    if(index > this._index)throw new RangeError('Index out of bounds.');
    return this.array[index];
};

ArrayMutable.prototype.setAt = function(val,index){
    if(index > this._index)throw new RangeError('Index out of bounds.');
    this.array[index] = val;
};

ArrayMutable.prototype.push = function(){
    var argsLen = arguments.length;
    if(argsLen == 0)return;

    var size  = this._size;
    var array = this.array;

    if(this._resize && (this._index + argsLen + 1) >= size){
        this.resize(Math.floor((this._index + argsLen + 1) * ArrayMutable.__RESIZE_F));
    }

    var i = -1;
    while(++i < arguments.length){
        array[this._index++] = arguments[i];
    }
};

ArrayMutable.prototype.pop = function(){
    if(this._index == 0)return null;
    return this.array[this.index--];
};

ArrayMutable.prototype.reserve = function(size){
    if(size > this._size)this.resize(size);
};

ArrayMutable.prototype.resize = function(size){
    this._size = size;
    var array = new this.array.constructor(this._size);
    array.set(this.array);
    this.array = array;
};

ArrayMutable.prototype.size  = function(){return this._index;};
ArrayMutable.prototype.sizeAllocated = function(){return this.array.length;};
ArrayMutable.prototype.reset = function(){this._index = 0;};



module.exports = ArrayMutable;