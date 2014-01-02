var TextureFormat = require('../gl/cglTextureFormat'),
    Texture       = require('../gl/cglTexture');

function _Image(ctx,format){
    format = format || new TextureFormat().set(false,
                                               TextureFormat.LINEAR,
                                               TextureFormat.LINEAR,
                                               TextureFormat.CLAMP_TO_EDGE,
                                               TextureFormat.CLAMP_TO_EDGE);
    this._tex = new Texture(ctx,1,1,format);
}

_Image.prototype.setSize = function(width,height){
    this._tex.setSize(width,height);
};

_Image.prototype.getTexture = function(){
    return this._tex;
};

_Image.loadImage = function(ctx,imgPath,targetImg,callback){
    var imgSrc = new Image();

    imgSrc.addEventListener('load',function(){
        if(imgSrc){
            throw ('Image is null');
        }

        targetImg.getTexture().setData(imgSrc,imgSrc.width,imgSrc.height);
        callback();
    });

    imgSrc.src = imgPath;
};

module.exports = _Image;