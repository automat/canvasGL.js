var TextureFormat = require('../gl/cglTextureFormat'),
    Texture       = require('../gl/cglTexture'),
    ImageState    = require('./cglImageState');

function _Image(ctx,format){
    this._ctx = ctx;
    format = format || new TextureFormat().set(false,
                                               TextureFormat.LINEAR,
                                               TextureFormat.LINEAR,
                                               TextureFormat.CLAMP_TO_EDGE,
                                               TextureFormat.CLAMP_TO_EDGE);
    this._tex    = new Texture(ctx,0,0,format);
    this._status = ImageState.IMAGE_NOT_LOADED;
}

_Image.prototype.setSize = function(width,height){
    this._tex.setSize(width,height);
};

_Image.prototype.getTexture = function(){
    return this._tex;
};

_Image.prototype.getStatus = function(){
   return this._status;
};

_Image.prototype.draw = function(){
    this._ctx._drawImage(this);
};

_Image.loadImage = function(ctx,imgPath,targetImg,callback){
    var imgSrc = new Image();

    imgSrc.addEventListener('load',function(){
        if(!imgSrc){
            targetImg._status = ImageState.IMAGE_ERROR;
            callback();
        }

        targetImg.getTexture().setData(imgSrc,imgSrc.width,imgSrc.height);
        targetImg._status = ImageState.IMAGE_LOADED;
        callback();
    });

    imgSrc.src = imgPath;
};

_Image.fromImage = function(ctx,image){
    var _image = new _Image(ctx);
    _image.getTexture().setData(image,image.width,image.height);
    return _image;
};

module.exports = _Image;