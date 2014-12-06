var CanvasGL = require('../../src/CanvasGL');

function App(element){
    CanvasGL.call(this,element);

    this.size(window.innerWidth,window.innerHeight);

    var self = this;
    window.addEventListener('resize',function(){
        self.size(window.innerWidth,window.innerHeight);
    });
}

App.prototype = Object.create(CanvasGL.prototype);

App.prototype.setup = function(){
    // Init stuff goes here
};

App.prototype.draw = function(){

    var time   = this.secondsElapsed();
    var width  = this.width(),
        height = this.height();
    var c =  this.getContext();

    // Draw stuff goes here

    c.background(0.15,0,0.15);

    c.translate(width * 0.5, height * 0.5);

    c.setModeEllipse(c.kCenter);
    c.circleDetail(20);

    c.fill3f(0.65,0,0.75);
    c.circle(0,0,50 + (Math.sin(time) * 0.5 + 0.5) * 50);
};


window.addEventListener("load",function(){
    var app = new App(document.getElementById("container"));
});
