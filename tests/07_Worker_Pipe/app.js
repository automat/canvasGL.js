var ObjectUtil = require('../../src/util/cglObjectUtil');
var WorkerConsole = require('../../src/util/worker/cglWorkerConsole');
var work = require('webworkify');

function Pipe(){
    var worker = this._worker = work(require('./worker.js'));

    this._queue = [];

    WorkerConsole.addListener(worker);

    var self = this;
    worker.addEventListener('message',function(e){
        var returnObj;
        var dataObj = e.data;

        switch (dataObj.msg){
            case Pipe.Msg.FUNCTION_A_PROCESSED:
                returnObj = {msg:'returnBufferA',data:dataObj.data,transfer:[dataObj.data.buffer]};

                //this.postMessage(returnObj,[returnObj.data.buffer]);
                //console.log(dataObj.msg);
                self._unshiftMsg(returnObj);
                self._processQueue();
                break;
            case Pipe.Msg.FUNCTION_B_PROCESSED:
                returnObj = {msg:'returnBufferB',data:dataObj.data,transfer:[dataObj.data.buffer]};

                //this.postMessage(returnObj,[returnObj.data.buffer]);
                //console.log(dataObj.msg);
                self._unshiftMsg(returnObj);
                self._processQueue();
                break;
        }

    });

    worker.addEventListener('error',function(e){
        throw new Error(e.message + ' (' + e.filename + ':' + e.lineo + ')');
    });

    // check transferableObjects
    var ab = new ArrayBuffer(1);
    worker.postMessage( ab, [ab] );
    if(ab.byteLength){
        throw Error('Transferable object not available');
    }
}

Pipe.prototype._exec = function(msg,data){
    this._worker.postMessage({msg:msg,data:data});
};

Pipe.prototype.methodA = function(data){
    this._pushMsg({msg:Pipe.Msg.FUNCTION_A,data:data});
};

Pipe.prototype.methodB = function(data){
    this._pushMsg({msg:Pipe.Msg.FUNCTION_B,data:data});
};

Pipe.prototype._processQueue = function(){
    if(this._queue.length == 0)return;
    console.log(ObjectUtil.toString(this._queue));
    var front = this._queue.shift();

    //this._exec(front.msg,front.data);
    this._worker.postMessage({msg:front.msg,data:front.data},front.transfer);

};

Pipe.prototype._unshiftMsg = function(msgObj){
    this._queue.unshift(msgObj);
    if(this._queue.length == 1)this._processQueue();
};

Pipe.prototype._pushMsg = function(msgObj){
    this._queue.push(msgObj);
    if(this._queue.length == 1)this._processQueue();
};

Pipe.Msg = {
    LOG : 0,
    FUNCTION_A: 'functionA',
    FUNCTION_B: 'functionB',
    FUNCTION_A_PROCESSED : 0,
    FUNCTION_B_PROCESSED : 1,
    INIT: 'init'
};

function App(){
    var pipe = this._pipe = new Pipe();
    pipe.methodA();
    pipe.methodA();
    //pipe.methodB();
    //pipe.methodB();
    //pipe.methodB();
    //pipe.methodB();
    //pipe.methodA();

}

window.addEventListener('load',function(){
    var app = new App();
});