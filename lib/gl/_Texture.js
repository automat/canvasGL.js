var _Math         = require('../math/Math'),
    Warning       = require('../common/Warning'),
    Extension     = require('../common/Extension'),
    Util          = require('../util/Util'),
    TextureFormat = require('./TextureFormat'),
    gl_           = require('./gl');

function Texture(width,height,format,unit){
    var gl = this._gl = gl_.get();
    this._format      = format ? format.copy() : new TextureFormat();
    this._dataType    = null;
    this._width       = null;
    this._height      = null;
    this._initialized = false;
    this._texUnit     = unit;
    this._tex         = gl.createTexture();

    this.size(width,height);
}

Texture.prototype.size = function(width,height){
    if(!this._initialized){
        this.setData(null,width,height);
        this._initialized = true;

    } else {
        this._width  = width;
        this._height = height;

        var gl = this._gl,
            glTexture2d = gl.TEXTURE_2D;
        var format   = this._format,
            dataType = this._dataType;

        var unit     = this._texUnit,
            prevUnit = gl.getParameter(gl.ACTIVE_TEXTURE);
        var pot      = _Math.isPOT(width) && _Math.isPOT(height);

        if(!pot && format.wrapMode == gl.REPEAT){
            throw new TypeError(Warning.TEX_NP2_WRAP_MODE_RESIZE);
        }

        if(!format.dataType == TextureFormat.FLOAT && !Extension.FloatTextureAvailable){
            throw new TypeError(Warning.TEX_FLOAT_FORMAT_NOT_SUPPORTED);
        }

        if(unit && unit != prevUnit){
            gl.activeTexture(gl.TEXTURE0 + unit);
        }

        gl.bindTexture(glTexture2d,this._tex);

        if(dataType != 'HTMLImageElement' ||
           dataType != 'HTMLCanvasElement' ||
           dataType != 'HTMLVideoElement'){
            gl.texImage2D(glTexture2d,0,gl.RGBA,width,height,0,format.dataFormat,format.dataType,null);
        }

        if(unit){
            gl.activeTexture(prevUnit);
        }
        gl.bindTexture(glTexture2d,null);
    }
};

Texture.prototype.bind = function(){
    this._ctx._enableTextureObj(this);
};

Texture.prototype.unbind = function(){
    this._ctx._disableTextureObj();
};

Texture.prototype.width = function(){
    return this._width;
};

Texture.prototype.height = function(){
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

Texture.prototype.setData = function(data, width, height, format, type){
    var gl = this._gl,
        glTexture2d = gl.TEXTURE_2D;

    var unit = this._texUnit,
        prevUnit = gl.getParameter(gl.ACTIVE_TEXTURE);

    var pot = _Math.isPOT(width) && _Math.isPOT(height);
    var wrapMode;

    var _format = this._format;
        _format.dataType   = type   || _format.dataType;
        _format.dataFormat = format || _format.dataFormat;

    if(!pot && _format.wrapMode == gl.REPEAT){
        console.log(Warning.TEX_NP2_WRAP_MODE_INIT);
        wrapMode = gl.CLAMP_TO_EDGE;
    } else {
        wrapMode = _format.wrapMode;
    }

    this._width  = width;
    this._height = height;

    if(unit && unit != prevUnit){
        gl.activeTexture(gl.TEXTURE0 + unit);
    }
    gl.bindTexture(glTexture2d,this._tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, _format.flipY);

    if(_format.mipmap){
        if(!pot){
            console.log(Warning.TEX_NP2_MIPMAP);
        } else {
            gl.generateMipmap(glTexture2d);
        }
    }

    gl.texParameteri(glTexture2d, gl.TEXTURE_MIN_FILTER, _format.minFilter);
    gl.texParameteri(glTexture2d, gl.TEXTURE_MAG_FILTER, _format.magFilter);
    gl.texParameteri(glTexture2d, gl.TEXTURE_WRAP_S, wrapMode);
    gl.texParameteri(glTexture2d, gl.TEXTURE_WRAP_T, wrapMode);

    var dataType = this._dataType = !data ? null : data.constructor.name;

    if(dataType == 'HTMLImageElement' ||
       dataType == 'HTMLCanvasElement' ||
       dataType == 'HTMLVideoElement'){
        gl.texImage2D(glTexture2d,0,gl.RGBA,_format.dataFormat,_format.dataType,data);
    } else {
        gl.texImage2D(glTexture2d,0,gl.RGBA,width,height,0,_format.dataFormat,_format.dataType,data);
    }

    if(unit){
        gl.activeTexture(prevUnit);
    }
    gl.bindTexture(glTexture2d,null);
};

Texture.prototype.readPixels = function(x,y,width,height,out){
    //this._ctx._readPixelsFromTex(this,x,y,width,height,out);
};

Texture.prototype.writePixels = function(x,y,width,height,format,type,pixels){
    //this._ctx._writePixelsToTex(this,x,y,width,height,format,type,pixels);
};

Texture.prototype.delete = function(){
    this._gl.deleteTexture(this._tex);
};

/*------------------------------------------------------------------------------------------------------------*/
//  gen
/*------------------------------------------------------------------------------------------------------------*/

Texture.genBlankTexture = function(){
    return Texture.genFromData(new Uint8Array([1,1,1,1]),1,1);
};

Texture.genFromData = function(data,width,height){
    var tex = new Texture(width,height);
    tex.setData(data,width,height);
    return tex;
};

/*------------------------------------------------------------------------------------------------------------*/
//  exports
/*------------------------------------------------------------------------------------------------------------*/

module.exports = Texture;