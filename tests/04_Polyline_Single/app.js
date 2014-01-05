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

App.prototype.setup = function(){
    // Init stuff goes here
    this.noLoop();
};

App.prototype.draw = function(){

    var time   = this.getSecondsElapsed();
    var width  = this.getWidth(),
        height = this.getHeight();
    var c =  this.getContext();

    // Draw stuff goes here

    c.backgroundfv(0.15,0,0.15);

    c.translate(width * 0.5, height * 0.5);

    c.setModeEllipse(c.CENTER);


    c.stroke1f(1);
    c.setLineWidth(50);

    c.line([-100,-100,0,0,-100,100,0,200]);
};


window.addEventListener("load",function(){
    var app = new App(document.getElementById("container"));
});
