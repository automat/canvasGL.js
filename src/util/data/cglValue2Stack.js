function Value2Stack(){
    this._a = [null,null];
    this._b = [null,null];
}

Value2Stack.prototype.push = function(){
    var a = this._a,
        b = this._b;

    b[0] = a[0];
    b[1] = a[1];

    switch (arguments.length){
        case 1:
            var args0 = arguments[0];
            if(!args0.length ||
                args0.length < 2 ||
                args0.length > 2){
                throw new TypeError('Invalid length.');
            }

            a[0] = args0[0];
            a[1] = args0[1];
            break;
        case 2:
            a[0] = arguments[0];
            a[1] = arguments[1];
            break;
    }
};

Value2Stack.prototype.peek = function(){
    return this._a;
};

Value2Stack.prototype.isEqual   = function(){
    var a = this._a,
        b = this._b;
    return a[0] == b[0] && a[1] == b[1];
};

Value2Stack.EMPTY = [null,null];


module.exports = Value2Stack;