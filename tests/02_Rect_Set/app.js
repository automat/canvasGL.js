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
    var ctx = this.getContext();
    this._texture = CanvasGL.Texture.genBlankTexture(ctx);

};


App.prototype.draw = function(){
    var time     = this.getSecondsElapsed();
    var width    = this.getWidth(),
        height   = this.getHeight();
    var width_2  = width * 0.5,
        height_2 = height * 0.5;

    var c =  this.getContext();

    c.backgroundfv(0.15,0,0.15);
    c.translate(width_2,height_2);

    c.stroke3f(0.25,0,0.25);

    c.line(-width_2,0,width_2,0);
    c.line(0,-height_2,0,height_2);

   // c.rectSet([0,0,100,0],[100,100,100,100]);

    var num = 15000;
    var verticesSet = new Array(num * 2),
        sizesSet    = new Array(num * 2);

    var  i = 0;
    var n;
    while(i < num){
        n = i / (num - 1);
        verticesSet[i * 2    ] = Math.cos(n * Math.PI * 32 + time * 2) * n * 500;
        verticesSet[i * 2 + 1] = Math.sin(n * Math.PI * 32 + time * 2) * n * 500;
        sizesSet[i * 2    ] = 2 + (Math.sin(n * Math.PI * 4) * 0.5 + 0.5) * 20;
        sizesSet[i * 2 + 1] = 2 + (Math.sin(n * Math.PI * 4) * 0.5 + 0.5) * 20;
        ++i;
    }

    c.rectSet(verticesSet,sizesSet);

    //c.drawElements([-50,-50,50,-50]);



   // console.log('---');




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
