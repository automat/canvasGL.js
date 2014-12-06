var CanvasGL = require('../../index.js');

//App inherits from CanvasGL
function App(element){
    CanvasGL.call(this,element);
    this.size(800,600);

    var ctx = this.getContext();

}

App.prototype = Object.create(CanvasGL.prototype);
App.prototype.constructor = App;


var PI   = Math.PI,
    PI_2 = PI * 0.5,
    PI_4 = PI * 0.25,
    PI2  = PI * 2.0;

App.prototype.draw = function(){
    var ctx = this.getContext(); //get CanvasGL context
    var t   = this.secondsElapsed() * 1.0;
    var i0  = 0.5 + Math.sin(t) * 0.5,
        i1  = 0.5 + Math.sin(t * 2.0) * 0.5,
        i2  = 0.5 + Math.sin(t * 3.0) * 0.5,
        i3  = 0.5 + Math.sin(t * 4.0) * 0.5,
        i4  = 0.5 + Math.sin(t * 5.0) * 0.5,
        i5  = 0.5 + Math.sin(t * 6.0) * 0.5;

    var i11 = 0.5 + Math.sin(t * (2.0 + i0 * 0.1)) * 0.5;


    var legBackLength = 80 + i0 * 20;


    function thinLine(x0,y0,x1,y1){
        ctx.setLineWidth(10);
        ctx.line(x0,y0,x1,y1);
    }

    function thickLine(x0,y0,x1,y1){
        ctx.setLineWidth(20);
        ctx.line(x0,y0,x1,y1);
    }

    ctx.background(1,0,0);

    ctx.circleDetail(10);
    ctx.setLineWidth(10);

    ctx.pushMatrix();
    ctx.translate(this.width() * 0.5, this.height() * 0.5);
    ctx.rotate(i0 * 0.125);


    ctx.pushMatrix();
    ctx.fill(i0,1,1-i0);


    //leg back
    ctx.pushMatrix();
    ctx.scale(0.95,0.95);
    ctx.rotate(PI_4 + PI_2 * i1);
    ctx.noStroke();
    ctx.circle(100,0,10);
    ctx.stroke(0,0,0);
    ctx.setLineWidth(10);
    ctx.line(0,0,100,0);
    ctx.translate(100,0);
    ctx.rotate(i1 * PI_4);
    ctx.setLineWidth(20);
    ctx.line(0,0,legBackLength,0);
    ctx.line(legBackLength,0,legBackLength,-10);
    ctx.popMatrix();

    //leg front
    ctx.pushMatrix();
    ctx.rotate(PI_4 + PI_2 * (1-i1));
    ctx.noStroke();
    ctx.circle(100,0,10);
    ctx.stroke(0,0,0);
    ctx.setLineWidth(10);
    ctx.line(0,0,100,0);
    ctx.translate(100,0);
    ctx.rotate((1-i1) * PI_4);
    ctx.setLineWidth(20);
    ctx.line(0,0,legBackLength,0);
    ctx.line(legBackLength,0,legBackLength,-10);
    ctx.popMatrix();

    //body

    ctx.rotate(i1);
    ctx.noStroke();
    ctx.circle(0,0,60);

    for(var i = 0, l = 10,j; i < l; ++i, j = i/l){
        ctx.pushMatrix();
        ctx.translate(i * 5 + Math.sin(j * i1 * PI2) * 40,-i*20);
        ctx.circle(0,0,60);
        ctx.popMatrix();
    }

    ctx.fill(i0,1,1-i0);



    ctx.popMatrix();

    //arm front
    ctx.pushMatrix();
    ctx.translate(-30,0);
    ctx.rotate(PI * i1);
    ctx.stroke(0);
    ctx.setLineWidth(10);
    ctx.line(0,0,50,0);
    ctx.translate(50,0);
    ctx.rotate(-PI_2 * (1.0-i2));
    ctx.setLineWidth(20);
    ctx.line(0,0,80,0);
    ctx.noStroke();
    ctx.translate(80,0);
    ctx.rect(0,-20,20,40);
    ctx.stroke(0,0,0);
    ctx.pushMatrix();
    ctx.translate(20,20);
        ctx.pushMatrix();
        ctx.rotate(i3 * PI_4);
        ctx.line(0,0,20,0);
        ctx.translate(20,0);
        ctx.rotate(i5 * PI_2);
        ctx.line(0,0,10,0);
        ctx.popMatrix();
        ctx.pushMatrix();
        ctx.translate(0,-20);
        ctx.rotate(i4 * PI_4);
        thickLine(0,0,20,0);
        ctx.translate(20,0);
        ctx.rotate(i5 * PI_2);
        thinLine(0,0,10,0);
        ctx.popMatrix();
        ctx.pushMatrix();
        ctx.translate(0,-40);
        ctx.rotate(i5 * PI_4);
        thickLine(0,0,20,0);
        ctx.translate(20,0);
        ctx.rotate(i5 * PI_2);
        thinLine(0,0,10,0);
        ctx.popMatrix();
        ctx.pushMatrix();
        ctx.translate(0,-50);
        ctx.rotate(PI + PI_4 + i1 * PI_4);
        thickLine(0,0,0,10);
        ctx.translate(0,10);
        thinLine(0,0,0,10);

        ctx.popMatrix();

    ctx.popMatrix();
    ctx.popMatrix();

    ctx.popMatrix();
};

window.addEventListener('load',function(){
    var app = new App(document.getElementById('container'));
});