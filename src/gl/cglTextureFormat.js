function TextureFormat(){
    this.mipmap    = false;
    this.magFilter = TextureFormat.LINEAR;
    this.minFilter = TextureFormat.LINEAR_MIPMAP_NEAREST;
    this.wrapMode  = TextureFormat.CLAMP_TO_EDGE;
    this.flipY     = false;

    this.dataFormat = TextureFormat.RGBA;
    this.dataType   = TextureFormat.UNSIGNED_BYTE;
}

TextureFormat.prototype.set = function(mipmap, magFilter, minFilter, wrapMode, flipY){
    this.mipmap    = mipmap;
    this.magFilter = magFilter;
    this.minFilter = minFilter;
    this.wrapMode  = wrapMode;
    this.flipY     = flipY;

    return this;
};

TextureFormat.isEqual = function(format0,format1){
    return format0.mipmap     == format1.mipmap &&
           format0.magFilter  == format1.magFilter &&
           format0.minFilter  == format1.minFilter &&
           format0.wrapMode   == format1.wrapMode &&
           format0.flipY      == format1.flipY &&
           format0.dataFormat == format1.dataFormat &&
           format0.dataType   == format1.dataType;
};



TextureFormat.RGB  = WebGLRenderingContext.RGB;
TextureFormat.RGBA = WebGLRenderingContext.RGBA;
TextureFormat.UNSIGNED_BYTE = WebGLRenderingContext.UNSIGNED_BYTE;
TextureFormat.FLOAT = WebGLRenderingContext.FLOAT;

TextureFormat.NEAREST = WebGLRenderingContext.NEAREST;
TextureFormat.LINEAR = WebGLRenderingContext.LINEAR;
TextureFormat.NEAREST_MIPMAP_NEAREST = WebGLRenderingContext.NEAREST_MIPMAP_NEAREST;
TextureFormat.LINEAR_MIPMAP_NEAREST = WebGLRenderingContext.LINEAR_MIPMAP_NEAREST;
TextureFormat.NEAREST_MIPMAP_LINEAR = WebGLRenderingContext.NEAREST_MIPMAP_LINEAR;
TextureFormat.LINEAR_MIPMAP_LINEAR = WebGLRenderingContext.LINEAR_MIPMAP_LINEAR;
TextureFormat.CLAMP_TO_EDGE = WebGLRenderingContext.CLAMP_TO_EDGE;

module.exports = TextureFormat;