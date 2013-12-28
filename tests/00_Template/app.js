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
    var c = this;
    var time      = c.getSecondsElapsed(),
        timeDelta = c.getTimeDelta();

    var sinTime = Math.sin(time * Math.PI);

    var lineWidth0 = 2,
        lineWidth1 = 5 + (1 - (sinTime * 0.5 + 0.5)) * 5;

    c.backgroundfv(0.15,0,0.15);
    c.setDetailCircle(20);

    c.translate(c._getWidth() * 0.5 - 350,0);

    /*
    c.fill1f(0);
    var i = - 1;
    while(++i < 1000){
        c.fill3f(Math.random(),0, Math.random()*0.15);
        c.circle(Math.random() * c._getWidth(),
                 Math.random() * c._getHeight(),
                 5);
    }
      */


    /*

    var i = -1;
    var l = 3;
    var positions = new Array(l);
    var radii     = new Array(l);
    var fills     = new Array(l);

    while(++i < l){
        positions[i] = [Math.random() * c._getWidth(),
                        Math.random() * c._getHeight()];
        radii[i]     = 10.0;
        fills[i]     = [0,0,0,1];
    }

    */

   // c.circleSet(positions,radii,fills,null);


    /*
    c.drawShapeOrigin(50,50);
    c.drawShapeOrigin(200,50);
    */

    //c.drawShapeOrigin(200,0);



    c.noFill();
    c.stroke1f(1);
    c.setLineWidth(lineWidth0);
    c.setModeRect(CanvasGL.CORNER);
    c.rect(50,50,100,100);
    c.setLineWidth(lineWidth1);
    c.setModeRect(CanvasGL.CENTER);
    c.rect(50,50,100,100);
    c.drawShapeOrigin(50,50);

    c.setLineWidth(lineWidth0);
    c.setModeCircle(CanvasGL.CORNER);
    c.circle(200,50,50);
    c.setLineWidth(lineWidth1);
    c.setModeCircle(CanvasGL.CENTER);
    c.circle(200,50,50);
    c.drawShapeOrigin(200,50);

    c.setLineWidth(lineWidth0);
    c.triangle(400,50,350,150,450,150);
    c.setLineWidth(lineWidth1);
    c.triangle(350,0,300,100,400,100);


    c.setDetailEllipse(20);
    c.setLineWidth(lineWidth0);
    c.setModeEllipse(CanvasGL.CORNER);
    c.ellipse(500,50,50,25);
    c.setLineWidth(lineWidth1);
    c.setModeEllipse(CanvasGL.CENTER);
    c.ellipse(500,50,50,25);
    c.drawShapeOrigin(500,50);

    c.setLineWidth(lineWidth0);
    c.setModeEllipse(CanvasGL.CORNER);
    c.arc(650,50,50,50,0,(sinTime*0.5 + 0.5) * Math.PI );
    c.setLineWidth(lineWidth1);
    c.setModeEllipse(CanvasGL.CENTER);
    c.arc(650,50,50,50,0,(sinTime*0.5 + 0.5) * Math.PI );
    c.drawShapeOrigin(650,50);

    c.noStroke();
    c.fillfv([1,1,1,1,
        1,0,0,1,
        0,1,0,1,
        0,0,1,1]);
    c.setModeRect(CanvasGL.CORNER);
    c.rect(0,150,150,150);

    /*
    c.setDetailCircle(4);
    c.fillfv([0,0,0,1,
              0,0,0,1,
              0,0,0,1,
              0,0,0,1]);
    c.setModeRect(CanvasGL.CORNER);
    c.circle(300,0,75);
    */

    c.stroke3f(1,0,0);
    c.setDetailCurve(20);
    c.setLineWidth(10);
    c.beginCurve();
    c.curveVertex(0,150);
    c.curveVertex(100,200);
    c.curveVertex(150,300);
    c.curveVertex(200,200);
    c.curveVertex(300,150);
    c.curveVertex(400,200);
    c.curveVertex(450,300);
    c.curveVertex(500,200);
    c.curveVertex(600,150);
    c.curveVertex(700,200);
    c.curveVertex(750,300);
    c.curveVertex(800,200);
    c.curveVertex(850,150);
    c.endCurve();




    c.setLineWidth(100);
    c.strokefv([sinTime*0.5+0.5,1,1,1,1,1,1,0]);
    c.line(150,100,300,100);
    c.line(150,100,300,400);
    c.line(150,400,300,400);

    c.pushMatrix();
    c.translate(300,0);
    c.line(150,100,300,100);
    c.line(150,100,300,400);
    c.line(150,400,300,400);
    c.popMatrix();


    c.setDetailCorner(10);
    c.noStroke();
    c.fill3f(1,0,0);
    c.roundRect(0,475,150,150,50);

    c.setModeRect(c.CENTER);
    var i,j;
    var lenx = 100,
        leny = 100;
    i = -1;
    while(++i < lenx){
        j = -1;
        while(++j < leny){
            c.pushMatrix();
            c.translate(i/lenx * 750,j/leny * 750);
            c.rotate(sinTime * Math.PI);
            c.scale(sinTime * 0.5 + 0.5,sinTime * 0.5 + 0.5);
            //c.stroke1f(1);
            c.setLineWidth(2);
            c.circle(0,0,10);
            //c.roundRect(0,0,20,20,3);
            c.popMatrix();


        }
    }

    c.drawShapeOrigin(250,550);







    /*
    c.pushMatrix();
    c.translate(0,300);
    var numCircles = Math.floor(Math.random() * 100);
    var circlePos   = new Array(numCircles);
    var circleRadii = new Array(numCircles);
    var circleFills = new Array(numCircles);

    var i = -1;
    while(++i < numCircles){
        circlePos[i]   = [Math.random()* 200,Math.random() * 200];
        circleRadii[i] = 10;
        circleFills[i] = [1,1,1,1];
    }
    this.circleSet(circlePos,circleRadii,circleFills,null);

    c.popMatrix();
    */



    /*
    c.setLineWidth(1);
    c.setModeEllipse(CanvasGL.CENTER);
    c.circle(200,50,50);
    c.drawShapeOrigin(200,50);
    */

    /*
    c.setLineWidth(1);
    c.triangle(350,0,300,100,400,100);
    c.setLineWidth(5);
    c.triangle(400,50,350,150,450,150);

    c.setDetailEllipse(20);
    c.setLineWidth(1);
    c.setModeEllipse(CanvasGL.CORNER);
    c.ellipse(450,50,50,50);
    c.setLineWidth(5);
    c.setModeEllipse(CanvasGL.CENTER);
    c.ellipse(450,50,50,50);
    */

};

App.prototype.drawShapeOrigin = function(x,y){
    var c = this;
    var oldStroke = c.getStroke(),
        oldFill   = c.getFill();

    c.noStroke();
    c.fill3f(0,0,0);
    c.setModeCircle(CanvasGL.CENTER);
    c.setDetailCircle(10);
    c.circle(x,y,7.5);

    if(oldStroke)c.strokefv(oldStroke);
    else c.noStroke();
    if(oldFill)c.fillfv(oldFill);
    else c.noFill();
};

App.prototype.onKeyDown = function(e){
    console.log('Key pressed: ' + this.getKeyStr() + ' / code: ' + this.getKeyCode());
};

App.prototype.onMouseDown = function(e){
    console.log("Mouse down.")
};

App.prototype.onMouseMove = function(e){
    console.log("Mouse position: " + this.getMousePos() + ' / last: ' + this.getMousePosLast());
};

window.addEventListener("load",function(){
   var app = new App(document.getElementById("container"));
});
