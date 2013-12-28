var Default       = require('../common/cglDefault'),
    TextureFormat = require('./cglTextureFormat'),
    Texture       = require('./cglTexture');

function Framebuffer(ctx,width,height,format){
    this._glRef  = ctx;
    format = format || new TextureFormat().set(false,
                                               TextureFormat.LINEAR,
                                               TextureFormat.LINEAR,
                                               TextureFormat.CLAMP_TO_EDGE,
                                               TextureFormat.CLAMP_TO_EDGE);

    this._tex = new Texture(ctx,width,height,format);

    this.setSize(width  || Default.RENDERBUFFER_WIDTH,
                 height || Default.RENDERBUFFER_HEIGHT);

    var gl = this._glRef;
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
    return this.getWidth() / this.getHeight;
};

Framebuffer.prototype.getTexture = function(){
    return this._tex;
};

Framebuffer.prototype.delete = function(){
    var gl = this._glRef;
    gl.deleteTexture(this._tex);
    gl.deleteFramebuffer(this._fbo);
};

Framebuffer.prototype.bind = function(){
    this._glRef.bindFramebuffer(this._glRef.FRAMEBUFFER,this._fbo);
};

Framebuffer.prototype.unbind = function(){
    this._glRef.bindFramebuffer(this._glRef.FRAMEBUFFER,null);
};


module.exports = Framebuffer;