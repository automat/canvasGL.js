function TextureFormat(){
    this.mipmap    = false;
    this.magFilter = TextureFormat.LINEAR;
    this.minFilter = TextureFormat.LINEAR_MIPMAP_NEAREST;
    this.wrapMode  = TextureFormat.CLAMP_TO_EDGE;
    this.flipY     = false;
}

TextureFormat.prototype.set = function(mipmap,magFilter,minFilter,wrapMode,flipY){
    this.mipmap = mipmap;
    this.magFilter = magFilter;
    this.minFilter = minFilter;
    this.wrapMode = wrapMode;
    this.flipY = flipY;

    return this;
};


TextureFormat.NEAREST = WebGLRenderingContext.NEAREST;
TextureFormat.LINEAR = WebGLRenderingContext.LINEAR;
TextureFormat.NEAREST_MIPMAP_NEAREST = WebGLRenderingContext.NEAREST_MIPMAP_NEAREST;
TextureFormat.LINEAR_MIPMAP_NEAREST = WebGLRenderingContext.LINEAR_MIPMAP_NEAREST;
TextureFormat.NEAREST_MIPMAP_LINEAR = WebGLRenderingContext.NEAREST_MIPMAP_LINEAR;
TextureFormat.LINEAR_MIPMAP_LINEAR = WebGLRenderingContext.LINEAR_MIPMAP_LINEAR;
TextureFormat.CLAMP_TO_EDGE = WebGLRenderingContext.CLAMP_TO_EDGE;

module.exports = TextureFormat;