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

    this._w = 200;
    this._h = 200;
    this._num = this._w * this._h;
    this._posArr = new Array(this._num * 2);
    this._radiusArr = new Array(this._num);
    this._colorArr  = new Array(this._num* 4);

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

    c.setDetailCircle(6);
    c.fill3f(1,1,1);
    c.noStroke();
    //c.circleSet([0,0,100,0],[50,10]);
    //c.rotate(this.getMousePosY()/height*Math.PI);


    var w = this._w,
        h = this._h;
    var num = this._num;
    var posArr    = this._posArr,///new Array(num * 2),
        radiusArr = this._radiusArr,//new Array(num),
        colorArr  = this._colorArr;//new Array(num * 4);
    var i, j,ij,ijn,iN,jN;
    var s = (this.getMousePosX() / width) * 4;
    var mx = this.getMousePosX();
    i = -1;
    while(++i < w){
        j = -1;
        while(++j < h){
            ij = i * w + j;
            ijn= ij / (num-1);
            iN = i / (w-1);
            jN = j / (h-1);
            //posArr[ij*2  ] = Math.cos(i/(w-1)*Math.PI*2) * (j/(h-1)) * (width * 1.5 + Math.sin(j/(h-1)*Math.PI*16+time*4) * (-0.5+Math.sin(time*10)*0.5) * 512) * 0.5;
            //posArr[ij*2+1] = Math.sin(i/(w-1)*Math.PI*2) * (j/(h-1)) * (width * 1.5 + Math.sin(i/(w-1)*Math.PI*16+time*4) * (-0.5+Math.sin(time)*0.5) * 512) * 0.5;
            posArr[ij*2  ] = Math.cos(iN*Math.PI*2) * jN * (width + Math.sin(iN*Math.PI*8  + time)  *300);
            posArr[ij*2+1] = Math.sin(iN*Math.PI*2) * jN * (width + Math.sin(jN*Math.PI*16   + time*18)  *100);
            //posArr[ij*2  ] = (-0.5 + i/(w-1)) * 2 * width_2  ;
            //posArr[ij*2+1] = (-0.5 + j/(h-1)) * 2 * (height_2 * 0.75 + Math.sin(i/(w-1)*Math.PI*16+time*4) * Math.sin(j/(h-1) * Math.PI * (0.5 +Math.sin(time) *0.5)*8 + time)* 20);
            radiusArr[ij]  = 1 + (0.5+Math.sin(iN * Math.PI * 32 + time) * 0.5) * 4 ;


        }
    }

    c.circleSet(posArr,radiusArr,colorArr);

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
