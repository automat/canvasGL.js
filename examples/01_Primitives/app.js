var CanvasGL = require('../../index.js');


function App(element){
    CanvasGL.call(this,element);

    this.size(400,400);
}

App.prototype = Object.create(CanvasGL.prototype);
App.prototype.constructor = App;


App.prototype.draw = function(){
    var ctx = this.getContext();
    ctx.background(1,1,1);

    var s = this.secondsElapsed();

    ctx.strokeCap(CanvasGL.ROUND);
    ctx.pointSize(6.0);
    ctx.strokeWeight(2);
    ctx.stroke(0,0,1);
    ctx.lines([40,40,360,40,200,360],true);

    var l = 500, l_1 = 1.0 / (l - 1), arr = new Array(l * 2);
    var i = -1;
    while(++i < l){
        arr[i * 2]     = 40 + i * l_1 * 320;
        arr[i * 2 + 1] = 200 + Math.sin(i*l_1 * Math.PI * 4 - s * 4) * 50;

    }
    ctx.strokeWeight(30);
    ctx.stroke(0);
    //p.lines(arr);

    ctx.pushMatrix();
    ctx.translate(0,-2);
    ctx.stroke([1,0,1,1,0,0,1,1]);
    //p.lines(arr);
    ctx.popMatrix();

    ctx.pushMatrix();


    ctx.translate(this.width(), 0);
    ctx.rotate(Math.PI * 0.5);
    ctx.strokeWeight(60);
    ctx.lines(arr);
    ctx.translate(-5,0);
    ctx.stroke([0.25,0.15,0.15,1.0,0,0,0,1.0]);
    ctx.lines(arr);
    ctx.popMatrix();

    ctx.pushMatrix();
    ctx.translate(100,100);
    ctx.scale(0.5,0.5);
    ctx.stroke(1,0,1,1);
    ctx.lines(arr);
    ctx.translate(0,-10);
    ctx.stroke([1,1,1,1,1,0.65,1,1]);
    ctx.lines(arr);
    ctx.popMatrix();

    ctx.pushMatrix();
    ctx.strokeWeight(1);
    ctx.translate(0,30);
    i = -1; l = 10; l_1 = 1.0 / (l - 1);
    while(++i < l){
        ctx.translate((this.width() - 40)/l,0);
        ctx.strokeWeight(1 + i * 2);
        ctx.stroke([i * l_1,0,i * l_1,1,1,0,0,1]);
        ctx.line(0,0,0,20);
    }
    ctx.popMatrix();

    i = -1; l = 500; l_1 = 1.0 / (l-1);
    while(++i < l){
        arr[i * 2    ] = i * l_1 * 200;
        arr[i * 2 + 1] = Math.cos(i * l_1 * Math.PI / 2) * 100;
    }
    ctx.lines(arr);

    //
    //p.lines([30,200,370,200,370,370,30,370]);
};

window.addEventListener('load',function(){
    var app = new App(document.getElementById('container'));
});



