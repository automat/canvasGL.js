function Value2State(a0,a1,b0,b1){
    a0 = typeof a0 === 'undefined' ? null : a0;
    a1 = typeof a1 === 'undefined' ? null : a1;
    b0 = typeof b0 === 'undefined' ? null : b0;
    b1 = typeof b1 === 'undefined' ? null : b1;
    this.a0 = a0;
    this.a1 = a1;
    this.b0 = b0;
    this.b1 = b1;
}

Value2State.prototype.write = function(a0,a1){this.b0=this.a0;this.b1=this.a1;this.a0=a0;this.a1=a1;};
Value2State.prototype.isEqual = function(){return this.a0 == this.b0 && this.a1 == this.b1;};
Value2State.prototype.writeEmpty = function(){this.write(null,null);};
//Value2State.prototype.toString = function(){return this.a0 + ' ' + this.a1 + ' ' + this.b0 + ' ' + this.b1;};

module.exports = Value2State;