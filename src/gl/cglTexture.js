var _Math         = require('../math/cglMath'),
    Warning       = require('../common/cglWarning'),
    Extension     = require('../common/cglExtension'),
    TextureFormat = require('./cglTextureFormat');

function Texture(ctx,width,height,format){
    this._ctxRef = ctx;
    var gl = ctx.getContext3d();
    this._format = format || new TextureFormat();
    this._width  = null;
    this._height = null;
    this._initialized = false;
    this._tex = gl.createTexture();
    this.setSize(width,height);
}

Texture.prototype.setSize = function(width,height){
    var gl = this._ctxRef.getContext3d(),
        glTexture2d = gl.TEXTURE_2D;

    this._width  = width;
    this._height = height;

    var format = this._format;
    var pot    = _Math.isPOT(width) && _Math.isPOT(height);

    if(!this._initialized){
        var wrapMode;

        if(!pot && format.wrapMode == gl.REPEAT){
            console.log(Warning.TEX_NP2_WRAP_MODE_INIT);
            wrapMode = gl.CLAMP_TO_EDGE;
        } else {
            wrapMode = format.wrapMode;
        }


        gl.bindTexture(glTexture2d,this._tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, format.flipY);

        if(format.mipmap){
            if(!pot){
                console.log(Warning.TEX_NP2_MIPMAP);
            } else {
                gl.generateMipmap(glTexture2d);
            }
        }

        gl.texParameteri(glTexture2d, gl.TEXTURE_MIN_FILTER, format.minFilter);
        gl.texParameteri(glTexture2d, gl.TEXTURE_MAG_FILTER, format.magFilter);
        gl.texParameteri(glTexture2d, gl.TEXTURE_WRAP_S, wrapMode);
        gl.texParameteri(glTexture2d, gl.TEXTURE_WRAP_T, wrapMode);
        gl.texImage2D(glTexture2d,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
        gl.bindTexture(glTexture2d,null);

        this._initialized = true;
    } else {

        if(!pot && format.wrapMode == gl.REPEAT){
            throw Warning.TEX_NP2_WRAP_MODE_RESIZE;
        }

        gl.bindTexture(glTexture2d,this._tex);
        gl.texImage2D(glTexture2d,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
        gl.bindTexture(glTexture2d,null);
    }
};

Texture.prototype.bind = function(){
    this._ctxRef._bindTexture(this);
};

Texture.prototype.unbind = function(){
    this._ctxRef._unbindTexture(this);
};

Texture.prototype.getWidth = function(){
    return this._width;
};

Texture.prototype.getHeight = function(){
    return this._height;
};

Texture.prototype.getAspectRatio = function(){
    return this._width / this._height;
};

Texture.prototype.getGLTexture = function(){
    return this._tex;
};

Texture.prototype.getFormat = function(){
    return this._format;
};

Texture.prototype.setData = function(data,dataWidth,dataHeight,dataFormat,dataType){
    var ctx = this._ctxRef;
    var gl  = ctx.getContext3d();
    var prevTex = ctx.getCurrTexture();

    dataFormat = dataFormat || gl.RGBA;
    dataType   = dataType   || gl.UNSIGNED_BYTE;

    if(dataType == gl.FLOAT && !Extension.FloatTextureAvailable){
        throw Warning.TEX_FLOAT_NOT_SUPPORTED;
    }

    gl.bindTexture(gl.TEXTURE_2D, this._tex);
    gl.texImage2D( gl.TEXTURE_2D, 0, dataFormat, dataWidth, dataHeight, 0, dataFormat, dataType, data);
    gl.bindTexture(gl.TEXTURE_2D, prevTex ? prevTex.getGLTexture() : ctx.getNullTexture());
};

Texture.prototype.delete = function(){
    this._glRef.deleteTexture(this._tex);
};

/*------------------------------------------------------------------------------------------------------------*/
//  gen
/*------------------------------------------------------------------------------------------------------------*/

Texture.genBlankTexture = function(ctx){
    return Texture.genFromData(ctx,new Uint8Array([1,1,1,1]),1,1);
};

Texture.genFromData = function(ctx,data,width,height){
    var tex = new Texture(ctx,width,height);
    tex.setData(data,width,height);
    return tex;
};

/*------------------------------------------------------------------------------------------------------------*/
//  exports
/*------------------------------------------------------------------------------------------------------------*/

module.exports = Texture;