function Value4Stack(){
    this._a = [null,null,null,null];
    this._b = [null,null,null,null];
}

Value4Stack.prototype.push = function(){
    var a = this._a,
        b = this._b;

    b[0] = a[0];
    b[1] = a[1];
    b[2] = a[2];
    b[3] = a[3];

    switch (arguments.length){
        case 1:
            var args0 = arguments[0];
            if(!args0.length ||
                args0.length < 4 ||
                args0.length > 4){
                throw new TypeError('Invalid length.');
            }

            a[0] = args0[0];
            a[1] = args0[1];
            a[2] = args0[2];
            a[3] = args0[3];
            break;
        case 4:
            a[0] = arguments[0];
            a[1] = arguments[1];
            a[2] = arguments[2];
            a[3] = arguments[3];
            break;
    }
};

Value4Stack.prototype.peek = function(){
    return this._a;
};

Value4Stack.prototype.isEqual = function(){
    var a = this._a,
        b = this._b;
    return a[0] == b[0] &&
           a[1] == b[1] &&
           a[2] == b[2] &&
           a[3] == b[3];
};


module.exports = Value4Stack;