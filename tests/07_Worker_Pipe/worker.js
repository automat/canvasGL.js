var console = require('../../src/util/worker/WorkerConsole').console,
    Msg = require('./workerMsg');

module.exports = function () {
    self.postMessage = self.webkitPostMessage || self.postMessage;

    /*--------------------------------------------------------------------------------------------*/

    var Msg = {
        FUNCTION_A_PROCESSED : 0,
        FUNCTION_B_PROCESSED : 1,
        RETURN_BUFFER_A_PROCESSED : 2,
        RETURN_BUFFER_B_PROCESSED : 3
    };

    var bufferAInitSize = 10000,
        bufferBInitSize = 10000;

    var bufferA,
        bufferB;

    /*--------------------------------------------------------------------------------------------*/

    var funcs = {};

    funcs.init = function(){
        bufferA = new Float32Array(bufferAInitSize);
        bufferB = new Float32Array(bufferBInitSize);
    };

    funcs.returnBufferA = function(data){
        bufferA = data;
        var obj = {msg:Msg.RETURN_BUFFER_A_PROCESSED,data:null};
        self.postMessage(obj);
    };

    funcs.returnBufferB = function(data){
        bufferB = data;
        var obj = {msg:Msg.RETURN_BUFFER_B_PROCESSED,data:null};
        self.postMessage(obj);
    };

    funcs.functionA = function(data){
        //console.log(bufferA,false);
        var l = bufferA.length * 0.5;
        var i,i2;
        i = 0;
        while(++i < l){
            i2 = i * 2;
            bufferA[i2  ] = Math.random();
            bufferA[i2+1] = Math.random();
            i++;
        }
        var obj = {msg:Msg.FUNCTION_A_PROCESSED,data:bufferA};
        self.postMessage(obj,[obj.data.buffer]);
    };

    funcs.functionB = function(){
        var l = bufferB.length * 0.5;
        var i,i2;
        i = 0;
        while(++i < l){
            i2 = i * 2;
            bufferB[i2  ] = Math.random();
            bufferB[i2+1] = Math.random();
            i++;
        }
        var obj = {msg:Msg.FUNCTION_B_PROCESSED,data:bufferB};
        self.postMessage(obj,[obj.data.buffer]);
    };

    /*--------------------------------------------------------------------------------------------*/


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
