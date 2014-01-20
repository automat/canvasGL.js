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

    this._imagesW = 25;
    this._imagesH = 25;
    this._images = new Array( this._imagesW * this._imagesH);
    var i = -1;while(++i < this._images.length){
        this._images[i] = new CanvasGL.Image(ctx,srcImg);
    }
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
    c.stroke1f(1);

    var cglMath = CanvasGL.Math;
    var sinF = (0.5 + Math.sin(time * 0.125) * 0.5);

    var images = this._images;
    var imagesNum = images.length;
    var imagesW = this._imagesW,
        imagesH = this._imagesH;
    var w = 1000 * (0.5+sinF*1.5),
        h = w;
    var w_2 = w * 0.5,
        h_2 = h * 0.5;

    var imageW = w / (imagesW-1),
        imageH = h / (imagesH-1);

    var i = -1, j, s;
    while(++i < imagesW){
        j = -1;
        while(++j < imagesH){
            s = cglMath.stepSmoothInvCubed(0.5 + (Math.sin((j * imagesW + i) / imagesNum * Math.PI * sinF * 256 + time*2)) * 0.5);
            c.pushMatrix();
            c.translate(-w_2 + i * imageW,-h_2 + j * imageH);
            c.rotate(s *  Math.PI * 2);
            s = 10 + s * (imageW-10);
            images[i].draw(0,0,s,s);
            c.popMatrix();
        }
    }
};

window.addEventListener("load",function(){
    var app;

    srcImg.addEventListener('load',function(e){
        app = new App(document.getElementById('container'));
    });

    srcImg.crossOrigin = 'anonymous';
    srcImg.src = 'http://upload.wikimedia.org/wikipedia/en/thumb/2/24/Lenna.png/440px-Lenna.png';
});
