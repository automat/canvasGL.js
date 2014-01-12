var console = require('../../src/util/worker/cglWorkerConsole').console;

module.exports = function () {
    var funcs = {};

    funcs.init = function(){
        console.log(new Float32Array(10));
        console.log(new Float64Array(10));
        console.log(new Uint16Array(10));
        console.log(new Uint32Array(10));
        console.log(new Uint8Array(10));
        console.log([0,1,2,3]);
        console.log({a:1,func:function(args){var i = 0;}});

        function ClassA(){}
        ClassA.prototype.methodA = function(){};
        console.log(ClassA);

        function ClassB(){
            ClassA.apply(this);
        }
        ClassB.prototype = Object.create(ClassA.prototype);
        ClassB.prototype.methodB = function(){};
        console.log(ClassB);
    };

    funcs.functionA = function(data){
        console.log(data);

    };

    funcs.functionB = function(){
    };

    self.addEventListener('message',function(e){
        var dataObj = e.data;

        if(dataObj.msg){
            funcs[dataObj.msg](dataObj.data);
        }
    });

};
