function TextureFormat(){
    this.mipmap    = false;
    this.mag_filter = TextureFormat.LINEAR;
    this.min_filter = TextureFormat.LINEAR_MIPMAP_NEAREST;
    this.wrap_mode  = TextureFormat.CLAMP_TO_EDGE;
    this.flip_y     = false;

    this.data_format = TextureFormat.RGBA;
    this.data_type   = TextureFormat.UNSIGNED_BYTE;
}

TextureFormat.prototype.set = function(mipmap, mag_filter, min_filter, wrap_mode, flip_y){
    this.mipmap     = mipmap;
    this.mag_filter = mag_filter;
    this.min_filter = min_filter;
    this.wrap_mode  = wrap_mode;
    this.flip_y     = flip_y;

    return this;
};

TextureFormat.isEqual = function(format0,format1){
    return format0.mipmap      == format1.mipmap &&
           format0.mag_filter  == format1.mag_filter &&
           format0.min_filter  == format1.min_filter &&
           format0.wrap_mode   == format1.wrap_mode &&
           format0.flip_y      == format1.flip_y &&
           format0.data_format == format1.data_format &&
           format0.data_type   == format1.data_type;
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