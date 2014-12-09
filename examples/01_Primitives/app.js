var CanvasGL = require('../../index.js');


function App(element){
    CanvasGL.call(this,element);

    this.size(400,400);
}

App.prototype = Object.create(CanvasGL.prototype);
App.prototype.constructor = App;


App.prototype.draw = function(){
    var p = this;
    p.background(1,1,1);

    var s = this.secondsElapsed();


    p.strokeCap(CanvasGL.ROUND);
    p.pointSize(6.0);


    //p.stroke(1,1,1);
    //p.strokeWeight(10);
    //p.line(20,20,380,20);
    //p.stroke(0.25,0,0);
    //p.strokeWeight(5);
    //p.line(380,20,380,380);
    //p.stroke(0,0.25,0);
    //p.strokeWeight(20);
    //p.line(380,380,20,380);
    //p.stroke(0,0,0.25);
    //p.strokeWeight(15);
    //p.line(20,380,20,20);
    //
    p.strokeWeight(2);
    p.stroke(0,0,1);
    p.lines([40,40,360,40,200,360],true);


    var l = 500, l_1 = 1.0 / (l - 1), arr = new Array(l * 2);
    var i = -1;
    while(++i < l){
        arr[i * 2]     = 40 + i * l_1 * 320;
        arr[i * 2 + 1] = 200 + Math.sin(i*l_1 * Math.PI * 4 - s * 4) * 50;

    }
    p.strokeWeight(30);
    p.stroke(0);
    //p.lines(arr);

    p.pushMatrix();
    p.translate(0,-2);
    p.stroke([1,0,1,1,0,0,1,1]);
    //p.lines(arr);
    p.popMatrix();

    p.pushMatrix();


    p.translate(this.width(), 0);
    p.rotate(Math.PI * 0.5);
    p.strokeWeight(60);
    p.lines(arr);
    p.translate(-5,0);
    p.stroke([0.25,0.15,0.15,1.0,0,0,0,1.0]);
    p.lines(arr);
    p.popMatrix();

    p.pushMatrix();
    p.translate(100,100);
    p.scale(0.5,0.5);
    p.stroke(1,0,1,1);
    p.lines(arr);
    p.translate(0,-10);
    p.stroke([1,1,1,1,1,0.65,1,1]);
    p.lines(arr);
    p.popMatrix();

    p.pushMatrix();
    p.strokeWeight(1);
    p.translate(0,30);
    i = -1; l = 10; l_1 = 1.0 / (l - 1);
    while(++i < l){
        p.translate((this.width() - 40)/l,0);
        p.strokeWeight(1 + i * 2);
        p.stroke([i * l_1,0,i * l_1,1,1,0,0,1]);
        p.line(0,0,0,20);
    }
    p.popMatrix();

    i = -1; l = 500; l_1 = 1.0 / (l-1);
    while(++i < l){
        arr[i * 2    ] = i * l_1 * 200;
        arr[i * 2 + 1] = Math.cos(i * l_1 * Math.PI / 2) * 100;
    }
    p.lines(arr);

    //
    //p.lines([30,200,370,200,370,370,30,370]);
};

window.addEventListener('load',function(){
    var app = new App(document.getElementById('container'));
});