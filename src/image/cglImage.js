var TextureFormat = require('../gl/cglTextureFormat'),
    Texture       = require('../gl/cglTexture'),
    ImageState    = require('./cglImageState');

function _Image(ctx,format){
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

_Image.loadImage = function(ctx,imgPath,targetImg,callback){
    var imgSrc = new Image();

    imgSrc.addEventListener('load',function(){
        if(!imgSrc){
            targetImg._status = ImageState.IMAGE_ERROR;
        }

        targetImg.getTexture().setData(imgSrc,imgSrc.width,imgSrc.height);
        targetImg._status = ImageState.IMAGE_LOADED;
        callback();
    });

    imgSrc.src = imgPath;
};



module.exports = _Image;