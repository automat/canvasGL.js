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
        console.log('post: ' + WorkerConsole.format(msgObj,false));
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

Pipe.prototype.isFinished = function(){
    return this._msgQueue.isFinished();
};


function App(){
    this._pipe = new Pipe();

    this.__timeInterval = 30.0 / 1000.0;
    this.__time = Date.now();
    this.__timeNext = 0;
    this.__timeDelta = 0;
    this.__timeElapsed = 0;
    this.__frameNum  = 0;

    this.__mainLoop();

}

App.prototype.__mainLoop = function(){
    var time, timeDelta;
    var timeInterval = this.__timeInterval;
    var timeNext;
    var self = this;
    function loop(){
        if(self.__frameNum <= 15)requestAnimationFrame(loop,null);
        time      = self.__time = Date.now();
        timeDelta = time - self.__timeNext;
        self.__timeDelta = Math.min(timeDelta / timeInterval, 1);

        console.log('-- BEGIN --');

        if(!self._pipe.isFinished())return;

        if(timeDelta > timeInterval){
            timeNext = self.__timeNext = time - (timeDelta % timeInterval);

            self.draw();

            self.__timeElapsed = (timeNext - self.__timeStart) / 1000.0;
            self.__frameNum++;
        }

        console.log('-- END --');
    }
    loop();
};



App.prototype.draw = function(){
    var pipe = this._pipe;

    pipe.methodA();
    pipe.methodA();
    pipe.methodA();
    pipe.methodA();
    pipe.methodB();
    pipe.methodB();
    pipe.methodB();
    pipe.methodB();
    pipe.methodA();
    console.log('draw');

};

window.addEventListener('load',function(){
    var app = new App();
});