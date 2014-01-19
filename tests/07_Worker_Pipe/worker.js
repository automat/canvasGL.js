var console = require('../../src/util/worker/cglWorkerConsole').console;

module.exports = function () {
    self.postMessage = self.webkitPostMessage || self.postMessage;

    var Msg = {
        FUNCTION_A_PROCESSED : 0,
        FUNCTION_B_PROCESSED : 1
    };

    var queue = [];

    var buffer_a_init_size = 10000,
        buffer_b_init_size = 10000;

    var buffer_a,
        buffer_b;


    var funcs = {};

    funcs.init = function(){
        buffer_a = new Float32Array(buffer_a_init_size);
        buffer_b = new Float32Array(buffer_b_init_size);
    };

    funcs.pushMsg = function(msg,data){
        queue.push({msg:msg,data:data});
        if(queue.length == 1)funcs.processQueue();
    };

    funcs.processQueue = function(){
        if(queue.length == 0)return;
        var front = queue.shift();
        funcs[front.msg](front.data);
    };

    funcs.returnBufferA = function(data){
        console.log('returned ' + console.format(data,false),false);
        buffer_a = data;
    };

    funcs.returnBufferB = function(data){
        console.log(data,false);
        buffer_b = data;
    };

    funcs.functionA = function(data){
        console.log(buffer_a,false);
        var l = buffer_a.length * 0.5;
        var i,i2;
        i = 0;
        while(++i < l){
            i2 = i * 2;
            buffer_a[i2  ] = Math.random();
            buffer_a[i2+1] = Math.random();
            i++;
        }
        var obj = {msg:Msg.FUNCTION_A_PROCESSED,data:buffer_a};
        self.postMessage(obj,[obj.data.buffer]);
    };

    funcs.functionB = function(){
        var l = buffer_b.length * 0.5;
        var i,i2;
        i = 0;
        while(++i < l){
            i2 = i * 2;
            buffer_b[i2  ] = Math.random();
            buffer_b[i2+1] = Math.random();
            i++;
        }
        var obj = {msg:Msg.FUNCTION_A_PROCESSED,data:buffer_b};
        self.postMessage(obj,[obj.data.buffer]);
    };

    self.addEventListener('message',function(e){
        var dataObj = e.data;

        if(dataObj.byteLength && dataObj.byteLength == 1){
            funcs.init();
        }

        if(dataObj.msg){
            funcs[dataObj.msg](dataObj.data);
            //funcs.pushMsg(dataObj.msg,dataObj.data);
            //console.log(dataObj);
        }
    });

};
