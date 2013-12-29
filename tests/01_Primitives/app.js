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

    c.setModeRect(CanvasGL.CENTER);
    c.fill3f(1,0,0.25);
    c.roundRect(275,-125,100,100,10);
    c.fill3f(1,1,1);
    c.roundRect(300,-100,100,100,(Math.sin(time) * 0.5 + 0.5) * 30);


    this.drawShapeOrigin(-325,-125);
    this.drawShapeOrigin(-300,-100);

    this.drawShapeOrigin(-100,-100);

    this.drawShapeOrigin(100,-100);
    this.drawShapeOrigin( 75,-125);

    this.drawShapeOrigin(275,-125);
    this.drawShapeOrigin(300,-100);
};

App.prototype.drawShapeOrigin = function(x,y){
    var c = this.getContext();
    var prevStroke = c.getStroke();
    var prevFill   = c.getFill();
    var prevMode   = c.getModeCircle();

    c.setModeCircle(CanvasGL.CENTER);
    c.noStroke();
    c.fill3f(0.15,0,0.65);
    c.circle(x,y,3,3);

    c.setModeCircle(prevMode);
    if(prevStroke)c.stroke(prevStroke);
    if(prevFill)c.fill(prevFill);
};


window.addEventListener("load",function(){
    var app = new App(document.getElementById("container"));
});
