var TextureFormat = require('../gl/TextureFormat'),
    Texture       = require('../gl/Texture'),
    ImageState    = require('./ImageState');

function _Image(ctx,src){
    Texture.call(this,ctx,0,0,new TextureFormat().set(false,
                                                       TextureFormat.LINEAR,
                                                       TextureFormat.LINEAR,
                                                       TextureFormat.CLAMP_TO_EDGE,
                                                       TextureFormat.CLAMP_TO_EDGE,
                                                       true));


    this._status = ImageState.IMAGE_NOT_LOADED;
    if(src){
        this.setData(src,src.width,src.height);
        this._status = ImageState.IMAGE_LOADED;
    }
}

_Image.prototype = Object.create(Texture.prototype);

_Image.prototype.getStatus = function(){
   return this._status;
};

_Image.prototype.draw = function(x,y,width,height){
    this._ctx._drawImage(this,x,y,width,height);
};

//TODO: urgs, Fix me
_Image.prototype.copy = function(){
    var width  = this.width(),
        height = this.height();

    var pixels = new Uint8Array(width * height * 4);
    this.readPixels(0,0,width,height,pixels);

    var copy = new _Image(this._ctx,null);
    copy.setData(pixels,width,height);
    return copy;
};

/*
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
*/

module.exports = _Image;