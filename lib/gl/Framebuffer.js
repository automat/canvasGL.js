var Default       = require('../common/Default'),
    TextureFormat = require('./TextureFormat'),
    Texture       = require('./Texture'),
    gl_           = require('./gl');

var last = null;

function Framebuffer(width,height,format){
    var gl = this._gl = gl_.get();
    format = format || new TextureFormat().set(false,
                                               TextureFormat.LINEAR,
                                               TextureFormat.LINEAR,
                                               TextureFormat.CLAMP_TO_EDGE,
                                               TextureFormat.CLAMP_TO_EDGE);

    this._tex = new Texture(width,height,format);

    this.size(width  || Default.FRAMEBUFFER_WIDTH,
                 height || Default.FRAMEBUFFER_HEIGHT);

    this._fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER,this._fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this._tex.getGLTexture(),0);
    gl.bindFramebuffer(gl.FRAMEBUFFER,last);
}

Framebuffer.prototype.size = function(width,height){
    this._tex.size(width,height);
};

Framebuffer.prototype.width = function(){
    return this._tex.width();
};

Framebuffer.prototype.height = function(){
    return this._tex.height();
};

Framebuffer.prototype.getAspectRatio = function(){
    return this._tex.getAspectRatio();
};

Framebuffer.prototype.getTexture = function(){
    return this._tex;
};

Framebuffer.prototype.delete = function(){
    var gl = this._gl;
    gl.deleteTexture(this._tex);
    gl.deleteFramebuffer(this._fbo);
};

Framebuffer.prototype.bind = function(){
    if(last == this._fbo){
        return;
    }
    var gl = this._gl;
    this._gl.bindFramebuffer(gl.FRAMEBUFFER,this._fbo);
    last = this._fbo;
};

Framebuffer.prototype.unbind = function(){
    this._gl.bindFramebuffer(this._gl.FRAMEBUFFER,last);
};

Framebuffer.prototype.draw = function(x,y,width,height){
    //this._ctx._drawFbo(this,x,y,width,height);
};

Framebuffer.prototype.getGLFramebuffer = function(){
    return this._fbo;
};

Framebuffer.prototype.readPixels = function(x,y,width,height,format,type,out){
    var gl = this._gl;
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE){
        gl.readPixels(x,y,width,height,format,type,out);
    }
};

Framebuffer.prototype.writePixels = function(x,y,width,height,format,type,pixels){
    this._tex.writePixels(x,y,width,height,format,type,pixels);
};

module.exports = Framebuffer;