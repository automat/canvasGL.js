var CanvasGL = require('../../src/CanvasGL');

var src_img = new Image();

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
   // this._img = CanvasGL.Image.fromImage(ctx,src_img);
};

App.prototype.draw = function(){

    var time   = this.getSecondsElapsed();
    var width  = this.getWidth(),
        height = this.getHeight();
    var c =  this.getContext();

    // Draw stuff goes here

    c.backgroundfv(0.15,0,0.15);

    c.translate(width * 0.5, height * 0.5);

    c.setModeEllipse(c.kCenter);
    c.setDetailCircle(20);

    c.fill3f(0.65,0,0.75);
    c.circle(0,0,30);

    //this._img.draw();
};


window.addEventListener("load",function(){
    var app;
    /*
    src_img.addEventListener('load',function(e){
        console.log(src_img.width);
        app = new App(document.getElementById('container'));
    });

    src_img.crossOrigin = 'anonymous';
    src_img.src = 'http://i40.photobucket.com/albums/e242/vester_DK/BATs/checkermap_b_zps5f23918f.png';
    */
    app = new App(document.getElementById('container'));


});
