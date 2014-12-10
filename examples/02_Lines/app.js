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

    var arr = [], i, j, l;

    ctx.strokeCap(CanvasGL.ROUND);
    ctx.pointSize(6.0);
    ctx.strokeWeight(6);

    //ctx.lines([40,40,360,40,200,360],true);
    //
    //ctx.stroke(1,0,0);
    //ctx.line(50,200,350,200);
    //
    //ctx.strokeWeight(10);
    //ctx.lines([50,300,100,250,150,300,200,250,250,300,300,250,350,300]);
    //

    ctx.stroke(1,0,0);
    //ctx.line(50,50,200,50);
    ctx.stroke([1,0,1,1,0,0,0,1]);
    ctx.lines([50,100,200,100]);

    //ctx.lines([50,150,200,150,350,150,350,200]);


    ctx.lines([50,200,100,200,50,200,100,200,50,200,100,200]);



};

window.addEventListener('load',function(){
    var app = new App(document.getElementById('container'));
});



