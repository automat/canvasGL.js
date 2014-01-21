var work = require('webworkify');

var WorkerConsole = require('../../src/util/worker/cglWorkerConsole'),
    ObjectUtil    = require('../../src/util/cglObjectUtil'),
    WorkerMsg     = require('./workerMsg'),
    MsgQueue      = require('./msgQueue');


function Pipe(){
    var worker = this._worker = work(require('./worker.js'));
        worker.postMessage = worker.webkitPostMessage || worker.postMessage;
    WorkerConsole.addListener(worker);


    this._msgQueue = new MsgQueue();
    this._msgQueue.onFinish = this.onQueueFinished.bind(this);
    this._msgQueue.onProcess = function(msgObj){
        console.log('post: ' + ObjectUtil.toString(msgObj));
        worker.postMessage({msg:msgObj.msg,data:msgObj.data},msgObj.transfer);
    };

    var self = this;
    worker.addEventListener('message',function(e){
        var returnObj;
        var dataObj = e.data;

        switch (dataObj.msg){
            case WorkerMsg.FUNCTION_A_PROCESSED:
                returnObj = {msg:'returnBufferA',data:dataObj.data,transfer:[dataObj.data.buffer]};
                self._msgQueue.shift();
                self._msgQueue.prepend(returnObj);
                self._msgQueue.process();
                break;
            case WorkerMsg.FUNCTION_B_PROCESSED:
                returnObj = {msg:'returnBufferB',data:dataObj.data,transfer:[dataObj.data.buffer]};
                self._msgQueue.shift();
                self._msgQueue.prepend(returnObj);
                self._msgQueue.process();
               break;
            case WorkerMsg.RETURN_BUFFER_A_PROCESSED:
                self._msgQueue.shift();
                self._msgQueue.process();
                break;
            case WorkerMsg.RETURN_BUFFER_B_PROCESSED:
                self._msgQueue.shift();
                self._msgQueue.process();
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

Pipe.prototype.methodA = function(data){
    this._msgQueue.append({msg:WorkerMsg.FUNCTION_A,data:data});
};

Pipe.prototype.methodB = function(data){
    this._msgQueue.append({msg:WorkerMsg.FUNCTION_B,data:data});
};

Pipe.prototype.onQueueFinished = function(){
    console.log('done !');
};


function App(){
    var pipe = this._pipe = new Pipe();
    //var i = -1;
    //while(++i < 1000){
        pipe.methodA();
        pipe.methodA();
        pipe.methodA();
        pipe.methodA();
        pipe.methodB();
        pipe.methodB();
        pipe.methodB();
        pipe.methodB();
        pipe.methodA();
    //}
}

window.addEventListener('load',function(){
    var app = new App();
});