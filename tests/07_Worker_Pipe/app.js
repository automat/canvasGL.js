var WorkerConsole = require('../../src/util/worker/cglWorkerConsole');
var work = require('webworkify');

function Pipe(){

    var worker = this._worker = work(require('./worker.js'));

    console.log(new Float32Array(101));

    this._queue = [];
    this._sharedData = new Float32Array(1000 * 2);

    // check transferableObjects
    var ab = new ArrayBuffer(1);
    worker.postMessage( ab, [ab] );
    if(ab.byteLength){
        throw Error('Transferable object not available');
    }


    WorkerConsole.addListener(worker);

    /*
    worker.addEventListener('message',function(e){
        var dataObj = e.data;

        switch (dataObj.msg){
            case Pipe.Msg.LOG:
                console.log(e.target + ': \n' + dataObj.data);
                break;
        }

    });
    */

    worker.addEventListener('error',function(e){
        throw new Error(e.message + ' (' + e.filename + ':' + e.lineo + ')');
    });

    this._exec(Pipe.Msg.INIT,null);

}

Pipe.prototype._exec = function(msg,data){
    this._worker.postMessage({msg:msg,data:data});
};

Pipe.prototype.methodA = function(data){
    this._exec(Pipe.Msg.FUNCTION_A,data);
};

Pipe.Msg = {
    LOG : 0,
    FUNCTION_A: 'functionA',
    FUNCTION_B: 'functionB',
    INIT: 'init'
};

function App(){
    var pipe = new Pipe();
}



window.addEventListener('load',function(){
    var app = new App();
});