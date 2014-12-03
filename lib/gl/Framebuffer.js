var Default       = require('../common/Default'),
    TextureFormat = require('./TextureFormat'),
    Texture       = require('./Texture');

function Framebuffer(ctx,width,height,format){
    this._ctx = ctx;
    var gl = this._ctx.getContext3d();
    format = format || new TextureFormat().set(false,
                                               TextureFormat.LINEAR,
                                               TextureFormat.LINEAR,
                                               TextureFormat.CLAMP_TO_EDGE,
                                               TextureFormat.CLAMP_TO_EDGE);

    this._tex = new Texture(ctx,width,height,format);

    this.setSize(width  || Default.FRAMEBUFFER_WIDTH,
                 height || Default.FRAMEBUFFER_HEIGHT);

    this._fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER,this._fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this._tex.getGLTexture(),0);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
}

Framebuffer.prototype.setSize = function(width,height){
    this._tex.setSize(width,height);
};

Framebuffer.prototype.getWidth = function(){
    return this._tex.getWidth();
};

Framebuffer.prototype.getHeight = function(){
    return this._tex.getHeight();
};

Framebuffer.prototype.getAspectRatio = function(){
    return this._tex.getAspectRatio();
};

Framebuffer.prototype.getTexture = function(){
    return this._tex;
};

Framebuffer.prototype.delete = function(){
    var gl = this._ctx.getContext3d();
    gl.deleteTexture(this._tex);
    gl.deleteFramebuffer(this._fbo);
};

Framebuffer.prototype.bind = function(){
    if(this._ctx.getCurrFramebuffer() == this)return;
    this._ctx._bindFramebuffer(this);
};

Framebuffer.prototype.unbind = function(){
    this._ctx._unbindFramebuffer();
};

Framebuffer.prototype.draw = function(x,y,width,height){
    this._ctx._drawFbo(this,x,y,width,height);
};

Framebuffer.prototype.getGLFramebuffer = function(){
    return this._fbo;
};

Framebuffer.prototype.readPixels = function(x,y,width,height,format,type,out){
    var gl = this._ctx.getContext3d();
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE){
        gl.readPixels(x,y,width,height,format,type,out);
    }
};

Framebuffer.prototype.writePixels = function(x,y,width,height,format,type,pixels){
    this._tex.writePixels(x,y,width,height,format,type,pixels);
};

module.exports = Framebuffer;