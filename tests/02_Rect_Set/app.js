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
    var ctx = this.getContext();
    this._texture = CanvasGL.Texture.genBlankTexture(ctx);



};


App.prototype.draw = function(){
    var time     = this.secondsElapsed();
    var width    = this.width(),
        height   = this.height();
    var width_2  = width * 0.5,
        height_2 = height * 0.5;

    var c =  this.getContext();

    c.background(0.15,0,0.15);
    c.translate(width_2,height_2);

    c.stroke3f(0.25,0,0.25);

    c.line(-width_2,0,width_2,0);
    c.line(0,-height_2,0,height_2);


    var num = 30000;
    var posArr     = new Array(num * 2),
        dimArr     = new Array(num * 2),
        fillColArr = new Array(num * 4);

    var a, b, d;

    b = Math.sin(time * Math.PI) * 0.5 + 0.5;

    var  i = 0;
    var n;
    while(i < num){
        n = i / (num - 1);
        a = n * Math.PI * 128 + time * 2;
        d = Math.sin(n * Math.PI * 4) * 0.5 + 0.5;
        posArr[i * 2    ]   = Math.cos(a) * n * (800 + b * 500);
        posArr[i * 2 + 1]   = Math.sin(a) * n * (800 + b * 500);
        dimArr[i * 2    ]   = 2 + d * 20;
        dimArr[i * 2 + 1]   = 2 + d * 20;
        fillColArr[i*4 + 0] = n;
        fillColArr[i*4 + 1] = 0;
        fillColArr[i*4 + 2] = 1-n;
        fillColArr[i*4 + 3] = Math.sin(n*Math.PI * (Math.sin(time) * 0.5 + 0.5) * 128) * 0.5 + 0.5;
        ++i;
    }

    c.rectSet(posArr,dimArr,fillColArr);
};

App.prototype.drawShapeOrigin = function(x,y){
    var c = this.getContext();
    var prevStroke = c.getStroke();
    var prevFill   = c.getFill();
    var prevMode   = c.getModeCircle();

    c.circleMode(CanvasGL.kCenter);
    c.noStroke();
    c.fill3f(0.15,0,0.65);
    c.circle(x,y,3,3);

    c.circleMode(prevMode);
    if(prevStroke)c.stroke(prevStroke);
    if(prevFill)c.fill(prevFill);
};


window.addEventListener("load",function(){
    var app = new App(document.getElementById("container"));
});
