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
    //this.noLoop();
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

    /*
    c.fill3f(1,1,1);
    var i = -1;
    while(++i < 10){
        c.ellipse((-1 + Math.random() * 2) * width,
                  (-1 + Math.random() * 2) * width,
                   2,2);
    }
    */




    c.stroke1f(1);
    c.setLineWidth(50);

    c.line([-100,-100,0,0,-100,100,0,200]);

    c.setLineWidth(2);
    c.line([200,-100,180,0,180,100,160,120,140,80]);
    /*
    var arr = new Array(8);
    var i = -1;
    while(++i < 10){
        arr[0] = (-1 + Math.random() * 2) * width;
        arr[2] = (-1 + Math.random() * 2) * width;
        arr[4] = (-1 + Math.random() * 2) * width;
        arr[6] = (-1 + Math.random() * 2) * width;
        arr[1] = (-1 + Math.random() * 2) * height;
        arr[3] = (-1 + Math.random() * 2) * height;
        arr[5] = (-1 + Math.random() * 2) * height;
        arr[7] = (-1 + Math.random() * 2) * height;
        c.line(arr);

    }
    */



};


window.addEventListener("load",function(){
    var app = new App(document.getElementById("container"));
});
