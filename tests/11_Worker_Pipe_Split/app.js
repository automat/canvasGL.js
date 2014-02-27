function App(){
    this._queue = [];
    this._queueProcessing = false;

    this._worker = new Worker('worker.js');

    var self = this;
    this._worker.addEventListener('message', function(e){
        var returnObj;
        var dataObj = e.data;

        switch (dataObj.msg){
            // worker is done with functionA
            case WorkerMsg.FUNCTION_A_PROCESSED:
                returnObj = {msg:WorkerMsg.RETURN_BUFFER_A,data:dataObj.data,transfer:[dataObj.data.buffer]};
                self._queueShift(); // WorkerMsg.FUNCTION_A done!, remove from queue
                self._queuePrepend(returnObj); // prepend return msg, so it gets executed as the next one
                self._queueProcess(); // process
                break;
            // worker is done with functionB
            case WorkerMsg.FUNCTION_B_PROCESSED:
                returnObj = {msg:WorkerMsg.RETURN_BUFFER_B,data:dataObj.data,transfer:[dataObj.data.buffer]};
                self._queueShift();
                self._queuePrepend(returnObj);
                self._queueProcess();
                break;
            // main thread returned bufferA to worker
            case WorkerMsg.RETURN_BUFFER_A_PROCESSED:
                self._queueShift();
                self._queueProcess();
                break;
            // main thread returned bufferB to worker
            case WorkerMsg.RETURN_BUFFER_B_PROCESSED:
                self._queueShift();
                self._queueProcess();
                break;
        }
    });

    // add Error listener
    this._worker.addEventListener('error',function(e){
        throw new Error(e.message + ' (' + e.filename + ':' + e.lineo + ')');
    });

    // add fake console listener
    WorkerConsole.addListener(this._worker);

    // check transferableObjects & init
    var ab = new ArrayBuffer(1);
    this._worker.postMessage( ab, [ab] );
    if(ab.byteLength){
        throw Error('Transferable object not available');
    }
}

/*--------------------------------------------------------------------------------------------*/


// front done, remove from queue
App.prototype._queueShift = function(){
    this._queue.shift();
};

// prepend msg to front of queue, postponing the rest
App.prototype._queuePrepend = function(msgObj){
    this._queue.unshift(msgObj);
};

// append msg to back of queue
App.prototype._queueAppend = function(msgObj){
    this._queue.push(msgObj);
    if(!this._queueProcessing){  //if the queue isnt running, start it
        console.log('-- START --');
        this._queueProcess();
        this._queueProcessing = true;
    }
};

App.prototype._queueProcess = function(){
    if(this._queue.length == 0){
        this._queueProcessing = false; // so it can immediately restart
        this._queueOnFinish();
        return;
    }

    var msgObj = this._queue[0]; // get front
    console.log('post: ' + WorkerConsole.format(msgObj,false));
    this._worker.postMessage({msg:msgObj.msg,data:msgObj.data},msgObj.transfer); //send to worker, including transfer list, in this example the buffer to be returned
};

// when done
App.prototype._queueOnFinish = function(){
    console.log('--- END ---');
};

// test func
App.prototype.methodA = function(){
    this._queueAppend({msg:WorkerMsg.FUNCTION_A,data:null});
};

// test func
App.prototype.methodB = function(){
    this._queueAppend({msg:WorkerMsg.FUNCTION_B,data:null});
};

/*--------------------------------------------------------------------------------------------*/

var app;
window.addEventListener('load',function(e){
    app = new App();

    var l = 10, i = -1;
    while(++i < l){
        app.methodA();
        app.methodA();
        app.methodB();
        app.methodB();
        app.methodA();
        app.methodB();
        app.methodA();
        app.methodB();
    }
});