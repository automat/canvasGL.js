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

    c.setDetailCircle(10);
    c.fill3f(1,1,1);
    c.noStroke();
    //c.circleSet([0,0,100,0],[50,10]);

    var w = 50,h = 50;
    var posArr    = new Array(w * h * 2),
        radiusArr = new Array(w * h);
    var i, j,ij;
    i = -1;
    while(++i < w){
        j = -1;
        while(++j < h){
            ij = i * w + j;

            posArr[ij*2  ] = (-0.5 + i/(w-1)) * 2 * 300;
            posArr[ij*2+1] = (-0.5 + j/(h-1)) * 2 * 300;
            radiusArr[ij]  = 10;

        }
    }

    c.circleSet(posArr,radiusArr);
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
