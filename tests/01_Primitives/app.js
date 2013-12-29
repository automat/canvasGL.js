var CanvasGL = require('../../src/CanvasGL');

function App(element){
    CanvasGL.call(this,element);

    this.setSize(window.innerWidth,window.innerHeight);



    var self = this;
    window.addEventListener('resize',function(){
        self.setSize(window.innerWidth,window.innerHeight);
    });
}

App.prototype = Object.create(CanvasGL.prototype);

App.prototype.draw = function(){

    var time   = this.getSecondsElapsed();
    var width  = this.getWidth(),
        height = this.getHeight();
    var c =  this.getContext();

    c.backgroundfv(0.15,0,0.15);
    c.translate(width * 0.5, height * 0.5);

    c.stroke3f(0.25,0,0.25);
    c.rect(-400,-200,800,400);

    c.line(-400,0,400,0);
    c.line(-200,-200,-200, 200);
    c.line(   0,-200,   0, 200);
    c.line( 200,-200, 200, 200);

    c.noStroke();

    c.setDetailCircle(30);
    c.fill3f(1,0,0.25);
    c.circle(-325,-125,50);

    c.setDetailCircle(10);
    c.fill3f(1,1,1);
    c.circle(-300,-100,50);

    c.setDetailEllipse(30);
    c.fill3f(1,0,0.25);
    c.ellipse(-100,-100,25,50);

    c.setDetailEllipse(10);
    c.fill3f(1,1,1);
    c.ellipse(-100,-100,75,25);

    c.setModeRect(CanvasGL.CORNER);
    c.fill3f(1,0,0.25);
    c.rect(25,-175,100,100);

    c.setModeRect(CanvasGL.CENTER);
    c.fill3f(1,1,1);
    c.rect(100,-100,100,100);

};


window.addEventListener("load",function(){
    var app = new App(document.getElementById("container"));
});
