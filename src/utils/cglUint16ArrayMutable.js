function Uint16ArrayMutable(reserveSize,autoresize){
    this._size   = reserveSize;
    this._resize = typeof autoresize === 'undefined' ? false : autoresize;
    this._index  = 0;
    this.array   = new Uint16Array(this._size);
}

Uint16ArrayMutable.__RESIZE_F = 1.5;
Uint16ArrayMutable.MAX = 134217728;

// just forward
Uint16ArrayMutable.prototype.set = function(array,offset,limit){
    offset = typeof offset === 'undefined' ? 0 : offset;
    limit  = typeof limit  === 'undefined' ? array.length : limit;

    var offsetSize = offset + limit;

    if(this._resize && (offset + array.length >= this._size)){
        this.resize(Math.floor(offsetSize * Uint16ArrayMutable.__RESIZE_F));
    }

    this.array.set(array,offset);
    this._index = Math.max(this._index,offsetSize);
};

Uint16ArrayMutable.prototype.at = function(index){
    if(index > this._index)throw new RangeError('Index out of bounds.');
    return this.array[index];
};

Uint16ArrayMutable.prototype.setAt = function(val,index){
    if(index > this._index)throw new RangeError('Index out of bounds.');
    this.array[index] = val;
};

Uint16ArrayMutable.prototype.push = function(){
    var argsLen = arguments.length;
    if(argsLen == 0)return;

    var size  = this._size;
    var array = this.array;

    if(this._resize && (this._index + argsLen + 1) >= size){
        this.resize(Math.floor((this._index + argsLen + 1) * Uint16ArrayMutable.__RESIZE_F));
    }

    var i = -1;
    while(++i < arguments.length){
        array[this._index++] = arguments[i];
    }
};

Uint16ArrayMutable.prototype.pop = function(){
    if(this._index == 0)return null;
    return this.array[this.index--];
};

Uint16ArrayMutable.prototype.reserve = function(size){
    if(size > this._size)this.resize(size);
};


Uint16ArrayMutable.prototype.resize = function(size){
    this._size = size;
    var array = new Uint16Array(this._size);
    array.set(this.array);
    this.array = array;
};

Uint16ArrayMutable.prototype.size  = function(){return this._index;};
Uint16ArrayMutable.prototype.sizeAllocated = function(){return this.array.length;};
Uint16ArrayMutable.prototype.reset = function(){this._index = 0;};

module.exports = Uint16ArrayMutable;