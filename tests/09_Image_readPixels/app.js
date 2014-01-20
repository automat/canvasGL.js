var CanvasGL = require('../../src/CanvasGL');

var srcImg = new Image();

function App(element){
    CanvasGL.call(this,element);

    this.setSize(window.innerWidth,window.innerHeight);

    var self = this;
    window.addEventListener('resize',function(){
        self.setSize(window.innerWidth,window.innerHeight);
    });
}

App.prototype = Object.create(CanvasGL.prototype);

App.prototype.setup = function(){
    // Init stuff goes here
    var ctx = this.getContext();
    var img = this._img = new CanvasGL.Image(ctx,srcImg),
        imgWidth  = img.getWidth(),
        imgHeight = img.getHeight();

    var imgPixels = new Uint8Array(imgWidth * imgHeight * 4);
    img.readPixels(0,0,imgWidth,imgHeight,imgPixels);

    var i,j;
    i = 0;
    while(i < imgPixels.length){
        imgPixels[i  ] = (Math.random() * 255) >> 0;
        imgPixels[i+3] = (Math.random() * 255) >> 0;
        i+=4;
    }

    this._imgMixed = img.copy();
    this._imgMixed.writePixels(0,0,imgWidth,imgHeight,CanvasGL.RGBA,CanvasGL.UNSIGNED_BYTE,imgPixels);
};

App.prototype.draw = function(){
    var time   = this.getSecondsElapsed();
    var width  = this.getWidth(),
        height = this.getHeight();

    var c =  this.getContext();

    // Draw stuff goes here
    c.backgroundfv(0.15,0,0.15);
    c.translate(width * 0.5, height * 0.5);

    c.setModeRect(CanvasGL.CENTER);
    this._img.draw(-this._img.getWidth() * 0.5,0);
    this._imgMixed.draw(this._imgMixed.getWidth() * 0.5,0);

};

window.addEventListener("load",function(){
    var app;

    srcImg.addEventListener('load',function(e){
        app = new App(document.getElementById('container'));
    });

    srcImg.crossOrigin = 'anonymous';
    srcImg.src = 'http://upload.wikimedia.org/wikipedia/en/thumb/2/24/Lenna.png/440px-Lenna.png';
});
