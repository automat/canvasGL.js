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


TextureFormat.NEAREST = 0x2600;
TextureFormat.LINEAR = 0x2601;
TextureFormat.NEAREST_MIPMAP_NEAREST = 0x2700;
TextureFormat.LINEAR_MIPMAP_NEAREST = 0x2701;
TextureFormat.NEAREST_MIPMAP_LINEAR = 0x2702;
TextureFormat.LINEAR_MIPMAP_LINEAR = 0x2703;
TextureFormat.CLAMP_TO_EDGE = 0x812F;

module.exports = TextureFormat;