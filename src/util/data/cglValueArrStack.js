function ValueArrStack(){
    this._a = null;
    this._b = null;
}

ValueArrStack.prototype.push = function(a){
    this._b = this._a;
    this._a = a;
};

ValueArrStack.prototype.peek = function(){
    return this._a;
};

ValueArrStack.prototype.isEqual = function(){
    var a = this._a,
        b = this._b;

    if((!a || !b) || (a.length != b.length))return false;

    var l = a.length;
    var i = -1;

    while(++i < l){
        if(a[i] != b[i])return false;
    }

    return true;
};

ValueArrStack.prototype.EMPTY = null;

module.exports = ValueArrStack;