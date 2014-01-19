var _Math         = require('../math/cglMath'),
    Warning       = require('../common/cglWarning'),
    Extension     = require('../common/cglExtension'),
    TextureFormat = require('./cglTextureFormat');

function Texture(ctx,width,height,format,unit){
    this._ctx = ctx;
    var gl = ctx.getContext3d();

    this._format      = format || new TextureFormat();
    this._width       = null;
    this._height      = null;
    this._initialized = false;
    this._texUnit     = unit;
    this._tex         = gl.createTexture();

    this.setSize(width,height);
}

Texture.prototype.setSize = function(width,height){
    var gl = this._ctx.getContext3d(),
        glTexture2d = gl.TEXTURE_2D;

    var unit     = this._texUnit;
    var prevUnit = gl.getParameter(gl.ACTIVE_TEXTURE);

    this._width  = width;
    this._height = height;

    var format = this._format;
    var pot    = _Math.isPOT(width) && _Math.isPOT(height);

    if(!this._initialized){
        var wrapMode;

        if(!pot && format.wrap_mode == gl.REPEAT){
            console.log(Warning.kTextureNP2WrapModeInit);
            wrapMode = gl.CLAMP_TO_EDGE;
        } else {
            wrapMode = format.wrap_mode;
        }

        if(unit && unit != prevUnit){
            gl.activeTexture(gl.TEXTURE0 + unit);
        }
        gl.bindTexture(glTexture2d,this._tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, format.flip_y);

        if(format.mipmap){
            if(!pot){
                console.log(Warning.kTextureNP2Mipmap);
            } else {
                gl.generateMipmap(glTexture2d);
            }
        }

        gl.texParameteri(glTexture2d, gl.TEXTURE_MIN_FILTER, format.min_filter);
        gl.texParameteri(glTexture2d, gl.TEXTURE_MAG_FILTER, format.mag_filter);
        gl.texParameteri(glTexture2d, gl.TEXTURE_WRAP_S, wrapMode);
        gl.texParameteri(glTexture2d, gl.TEXTURE_WRAP_T, wrapMode);
        gl.texImage2D(glTexture2d,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);

        if(unit){
            gl.activeTexture(prevUnit);
        }
        gl.bindTexture(glTexture2d,null);

        this._initialized = true;
    } else {

        if(!pot && format.wrap_mode == gl.REPEAT){
            throw Warning.kTextureNP2WrapModeResize;
        }

        if(unit && unit != prevUnit){
            gl.activeTexture(gl.TEXTURE0 + unit);
        }
        gl.bindTexture(glTexture2d,this._tex);
        gl.texImage2D(glTexture2d,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);

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


//TODO: Add format check
Texture.prototype.setData = function(data, width, height, type){
    var gl = this._ctx.getContext3d(),
        glTexture2d = gl.TEXTURE_2D;

    var format = this._format;

    var unit = this._texUnit,
        prevUnit = gl.getParameter(gl.ACTIVE_TEXTURE);

    var pot = _Math.isPOT(width) && _Math.isPOT(height);

    var wrapMode;

    if(!pot && format.wrap_mode == gl.REPEAT){
        console.log(Warning.kTextureNP2WrapModeInit);
        wrapMode = gl.CLAMP_TO_EDGE;
    } else {
        wrapMode = format.wrap_mode;
    }

    if(unit && unit != prevUnit){
        gl.activeTexture(gl.TEXTURE0 + unit);
    }
    gl.bindTexture(glTexture2d,this._tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, format.flip_y);

    if(format.mipmap){
        if(!pot){
            console.log(Warning.kTextureNP2Mipmap);
        } else {
            gl.generateMipmap(glTexture2d);
        }
    }

    gl.texParameteri(glTexture2d, gl.TEXTURE_MIN_FILTER, format.min_filter);
    gl.texParameteri(glTexture2d, gl.TEXTURE_MAG_FILTER, format.mag_filter);
    gl.texParameteri(glTexture2d, gl.TEXTURE_WRAP_S, wrapMode);
    gl.texParameteri(glTexture2d, gl.TEXTURE_WRAP_T, wrapMode);
    gl.texImage2D(glTexture2d,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,data);

    if(unit){
        gl.activeTexture(prevUnit);
    }
    gl.bindTexture(glTexture2d,null);

    /*
    var ctx = this._ctx;
    var gl  = ctx.getContext3d();

    format = format || gl.RGBA;
    type   = type   || gl.UNSIGNED_BYTE;

    if(type == gl.FLOAT && !Extension.FloatTextureAvailable){
        throw Warning.kTextureFloatNotSupported;
    }

    var prev_tex = ctx.getCurrTexture();
    var glTexture2d = gl.TEXTURE_2D;

    var _format = this._format;
        _format.data_format = format;
        _format.data_type = type;

    var pot = _Math.isPOT(width) && _Math.isPOT(height);

    if(!pot && format.wrap_mode == gl.REPEAT){

    }



    gl.bindTexture(glTexture2d, this._tex);
    //gl.texImage2D( gl.TEXTURE_2D, 0, _format.data_format, width, height, 0, _format.data_format, _format.data_type, data);
    gl.texImage2D( glTexture2d, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.bindTexture(glTexture2d, prev_tex ? prev_tex.getGLTexture() : ctx.getNullTexture());
    */
};

Texture.prototype.readPixels = function(out){
    this._ctx._readPixelsFromTex(this,out);
};

Texture.prototype.writePixels = function(x,y,width,height,format,type,pixels){
    this._ctx._writePixelsToTex(this,x,y,width,height,format,type,pixels);
};

Texture.prototype.delete = function(){
    this._ctx.getContext3d().deleteTexture(this._tex);
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