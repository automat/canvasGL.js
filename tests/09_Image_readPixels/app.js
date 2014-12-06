var CanvasGL = require('../../src/CanvasGL');

var srcImg = new Image();

function App(element){
    CanvasGL.call(this,element);

    this.size(window.innerWidth,window.innerHeight);

    var self = this;
    window.addEventListener('resize',function(){
        self.size(window.innerWidth,window.innerHeight);
    });
}

App.prototype = Object.create(CanvasGL.prototype);

App.prototype.setup = function(){
    // Init stuff goes here
    var ctx = this.getContext();
    var img = this._img = new CanvasGL.Image(ctx,srcImg),
        imgWidth  = img.width(),
        imgHeight = img.height();

    this._imgPixels0 = new Uint8Array(imgWidth * imgHeight * 4);
    this._imgPixels1 = new Uint8Array(imgWidth * imgHeight * 4);
    img.readPixels(0,0,imgWidth,imgHeight,this._imgPixels0);



    this._imgMixed = img.copy();
};

App.prototype.draw = function(){
    var time   = this.secondsElapsed();
    var width  = this.width(),
        height = this.height();

    var c =  this.getContext();

    // Draw stuff goes here
    c.background(0.15,0,0.15);
    c.translate(width * 0.5, height * 0.5);

    var img = this._img,
        imgWidth  = img.width(),
        imgHeight = img.height();
    var imgPixels0 = this._imgPixels0,
        imgPixels1 = this._imgPixels1;

    var i, j, k,k4,chroma,num_1 = imgWidth * imgHeight - 1;
    i = -1;
    while(++i < imgWidth){
        j = -1;
        while(++j < imgHeight){
            k = (i * imgHeight + j);
            k4 = k * 4;
            chroma = ((imgPixels0[k4  ] + imgPixels0[k4+1] + imgPixels0[k4+2]) / 3) >> 0;

            imgPixels1[k4  ] = Math.max(0,Math.min((chroma + Math.sin(k/num_1*Math.PI  +time)*255)>>0,255));
            imgPixels1[k4+1] = Math.max(0,Math.min((chroma + Math.sin((i*j)/num_1*Math.PI*2+time*10)*255)>>0,255));
            imgPixels1[k4+2] = Math.max(0,Math.min((chroma + Math.sin(k/num_1*Math.PI*4+time*100)*255)>>0,255));
            imgPixels1[k4+3] = 255;//
        }
    }

    this._imgMixed.writePixels(0,0,imgWidth,imgHeight,CanvasGL.RGBA,CanvasGL.UNSIGNED_BYTE,imgPixels1);


    c.setModeRect(CanvasGL.CENTER);
    this._img.draw(-this._img.width() * 0.5,0);
    this._imgMixed.draw(this._imgMixed.width() * 0.5,0);

};

window.addEventListener("load",function(){
    var app;

    srcImg.addEventListener('load',function(e){
        app = new App(document.getElementById('container'));
    });

    srcImg.crossOrigin = 'anonymous';
    srcImg.src = 'http://upload.wikimedia.org/wikipedia/en/thumb/2/24/Lenna.png/440px-Lenna.png';
});
