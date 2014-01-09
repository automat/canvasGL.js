var workerAScript = require('./workerA.js'),
    workerBScript = require('./workerB.js'),
    workerCScript = require('./workerC.js');


function Pipe(){
    this._queue   = [];

    this._counterA = 0;
    this._counterB = 0;
    this._counterC = 0;


    this._sharedDataA = new Float32Array(4 * 3);
    this._sharedDataB = new Float32Array(4 * 3);
    this._sharedDataC = new Float32Array(4 * 3);

    var workerA = this._workerA = new Worker(workerSrcFromStr(workerAScript)),
        workerB = this._workerB = new Worker(workerSrcFromStr(workerBScript)),
        workerC = this._workerC = new Worker(workerSrcFromStr(workerCScript));

    workerA.addEventListener('message',this._onWorkerMessage.bind(this));
    workerB.addEventListener('message',this._onWorkerMessage.bind(this));
    workerC.addEventListener('message',this._onWorkerMessage.bind(this));
}

Pipe.prototype._onWorkerMessage = function(e){
    var dataObj = e.data;
    switch (this['_'+dataObj.target]){
        case this._workerA:
            console.log('Worker A: done! Order: ' + dataObj.order);
            break;
        case this._workerB:
            console.log('Worker B: done! Order: ' + dataObj.order);
            break;
        case this._workerC:
            console.log('Worker C: done! Order: ' + dataObj.order);
            break;
    }

    var queue = this._queue;
    queue.splice(queue.indexOf(dataObj),1);
    if(queue.length == 0)this._onFinish();
};

Pipe.prototype._onFinish = function(){
    console.log('done');
};

Pipe.prototype.methodA = function(a){
    if(this._counterA * this._sharedDataA.length){this._doResizeWhatever();}
    this._queue.push({target:'workerA',data:a,sharedData:this._sharedDataA,order:this._counterA++});
};

Pipe.prototype.methodB = function(b){
    if(this._counterB * this._sharedDataB.length){this._doResizeWhatever();}
    this._queue.push({target:'workerB',data:b,sharedData:this._sharedDataB,order:this._counterB++});
};

Pipe.prototype.methodC = function(c){
    if(this._counterC * this._sharedDataC.length){this._doResizeWhatever();}
    this._queue.push({target:'workerC',data:c,sharedData:this._sharedDataC,order:this._counterC++});
};

Pipe.prototype._doResizeWhatever = function(){};

/*
Pipe.prototype.process = function(){
    var queue = this._queue;
    var item;
    var i = -1;
    while(++i < queue.length){
        item = queue[i];
        this['_'+item.target].postMessage(item);
    }
};
*/



function App(){

    //console.log(Pipe);

    var pipe = this._pipe = new Pipe();

    var data = new Float32Array([0,0,0]);

    pipe.methodA(data);
    /*
    pipe.methodB(data);
    pipe.methodC(data);
    pipe.methodC(data);
    pipe.methodB(data);
    pipe.methodA(data);
    */
    pipe.process();


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