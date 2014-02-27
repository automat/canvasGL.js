function MsgQueue(){
    this._queue = [];
    this._processing = false;
}

MsgQueue.prototype.append = function(msgObj){
    this._queue.push(msgObj);
    if(!this._processing){
        this.process();
        this._processing = true;
    }
};

MsgQueue.prototype.prepend = function(msgObj){
    this._queue.unshift(msgObj);
};

MsgQueue.prototype.process = function(){
    if(this._queue.length == 0){
        this._processing = false;
        this.onFinish();
        return;
    }
    this.onProcess(this._queue[0]);
};

MsgQueue.prototype.shift = function(){
    this._queue.shift();
};

MsgQueue.prototype.getLength = function(){
    return this._queue.length;
};

MsgQueue.prototype.isFinished = function(){
    return this._queue.length == 0;
};

MsgQueue.prototype.onProcess = function(msgObj){};
MsgQueue.prototype.onFinish = function(){};

module.exports = MsgQueue;