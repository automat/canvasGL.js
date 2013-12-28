function Value1State(a,b){
    a = typeof a === 'undefined' ? null : a;
    b = typeof b === 'undefined' ? null : b;
    this.a=a;
    this.b=b;
}

Value1State.prototype.write      = function(a){this.b=this.a;this.a=a;};
Value1State.prototype.isEqual    = function(){return this.a == this.b;};
Value1State.prototype.writeEmpty = function(){this.write(null);};
//Value1State.prototype.toString   = function(){return this.a + ' ' + this.b;};

module.exports = Value1State;