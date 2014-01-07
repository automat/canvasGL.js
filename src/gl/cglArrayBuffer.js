function ArrayBuffer(ctx){
    this._ctxRef = ctx;

    var gl      = ctx.getContext3d();
    this._type  = gl.ARRAY_BUFFER;
    this.buffer = gl.createBuffer();
}

ArrayBuffer.prototype.setData = function(data,mode){
    this.buffer.bufferData(this._type,data,mode);
};

ArrayBuffer.prototype.bind = function(){
    this._ctxRef.getContext3d().bindBuffer(this._type,this.buffer);
};

ArrayBuffer.prototype.unbind = function(){
    this._ctxRef._bindDefaultGLArrayBuffer();
};

module.exports = ArrayBuffer;