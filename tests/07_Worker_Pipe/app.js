var workerScript = require('./worker.js');

function Pipe(){
    var worker = this._worker = new Worker(workerSrcFromStr(workerScript));
    worker.postMessage = worker.webkitPostMessage || worker.postMessage;

    this._shared_data = new Float32Array(1000 * 2);

    // check transferableObjects
    var ab = new ArrayBuffer(1);
    worker.postMessage( ab, [ab] );
    var TRANSFERABLE_OBJS_AVAILABLE = !ab.byteLength;

    worker.postMessage({msg:Pipe.kWorkerFunc.FUNCTION_A,data:this._shared_data});

    worker.addEventListener('message',function(e){
        var dataObj = e.data;

        switch (dataObj.msg){
            case Pipe.kWorkerMsg.LOG:
                console.log(e.target + ': ' + dataObj.data);
                break;
        }

    });

}


Pipe.kWorkerMsg = {
    LOG : 0
};

Pipe.kWorkerFunc = {
    FUNCTION_A : 'functionA',
    FUNCTION_B : 'functionB'
};

function App(){
    var pipe = new Pipe();


}



function workerSrcFromStr(string){
    var blob;
    try {
        blob = new Blob([string], {type: 'application/javascript'});
    } catch (e) {
        blob = new ( window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder)();
        blob.append(string);
        blob = blob.getBlob();
    }

    return window.webkitURL ? window.webkitURL.createObjectURL(blob) :
           window.URL && window.URL.createObjectURL ? window.URL.createObjectURL(blob) :
           null;

}

window.addEventListener('load',function(){
    var app = new App();
});