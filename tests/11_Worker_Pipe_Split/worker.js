importScripts('workerMsg.js','workerConsole.js');

self.postMessage = self.webkitPostMessage || self.postMessage;
var console = WorkerConsole.console;
var BUFFER_INIT_SIZE = 10000;
var bufferA,
    bufferB;

/*--------------------------------------------------------------------------------------------*/

var funcs = {};

funcs.init = function(){
    bufferA = new Float32Array(BUFFER_INIT_SIZE);
    bufferB = new Float32Array(BUFFER_INIT_SIZE);
};

funcs[WorkerMsg.RETURN_BUFFER_A] = function(data){
    bufferA = data;
    var obj = {msg:WorkerMsg.RETURN_BUFFER_A_PROCESSED,data:null};
    self.postMessage(obj);
};

funcs[WorkerMsg.RETURN_BUFFER_B] = function(data){
    bufferB = data;
    var obj = {msg:WorkerMsg.RETURN_BUFFER_B_PROCESSED,data:null};
    self.postMessage(obj);
};

funcs[WorkerMsg.FUNCTION_A] = function(){
    var l = bufferA.length;
    var i = 0;
    while(i < l){
        bufferA[i  ] = Math.random(); //x
        bufferA[i+1] = Math.random(); //y
        i+=2;
    }
    var obj = {msg:WorkerMsg.FUNCTION_A_PROCESSED,data:bufferA};
    self.postMessage(obj,[obj.data.buffer]);
};

funcs[WorkerMsg.FUNCTION_B] = function(){
    var l = bufferA.length * 0.5;
    var i = 0;
    while(i < l){
        bufferB[i  ] = Math.random(); //x
        bufferB[i+1] = Math.random(); //y
        i+=2;
    }
    var obj = {msg:WorkerMsg.FUNCTION_B_PROCESSED,data:bufferB};
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
    }
});