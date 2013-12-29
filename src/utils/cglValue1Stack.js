function Value1Stack(a,b){
    this.a = typeof a === 'undefined' ? null : a;
    this.b = typeof b === 'undefined' ? null : b;
}

Value1Stack.prototype.push = function(a){
    this.b=this.a;
    this.a=a;
};

Value1Stack.prototype.peek = function(){
    return this.a;
};

Value1Stack.prototype.isEqual = function(){
    return this.a == this.b;
};

Value1Stack.prototype.pushEmpty = function(){
    this.push(null);
};

//Value1Stack.prototype.toString   = function(){return this.a + ' ' + this.b;};

module.exports = Value1Stack;