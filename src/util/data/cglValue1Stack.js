function Value1Stack(){
    this._a = null;
    this._b = null;
}

Value1Stack.prototype.push = function(a){
    this._b=this._a;
    this._a=a;
};

Value1Stack.prototype.peek = function(){
    return this._a;
};

Value1Stack.prototype.isEqual = function(){
    return this._a == this._b;
};

Value1Stack.EMPTY = null;


module.exports = Value1Stack;