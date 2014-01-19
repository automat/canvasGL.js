var CanvasGL = require('../../src/CanvasGL');

function App(element){
    CanvasGL.call(this,element);

    this.setSize(window.innerWidth,window.innerHeight);


    /*
    console.log(f32Array.size() + ' ' + f32Array.sizeAllocated());
    f32Array.put2f(1,2);
    console.log(f32Array.size() + ' ' + f32Array.sizeAllocated());
    f32Array.put2f(3,4);
    console.log(f32Array.size() + ' ' + f32Array.sizeAllocated());
    */

    this.runTick = 0;

    var self = this;
    window.addEventListener('resize',function(){
        self.setSize(window.innerWidth,window.innerHeight);
    });
}

App.prototype = Object.create(CanvasGL.prototype);

App.prototype.draw = function(){

    var time   = this.getSecondsElapsed();
    var PI_4 = Math.PI * 0.25;
    var width  = this._getWidth(),
        height = this._getHeight();

    var c = this.getContext();


    c.backgroundfv(0.15,0,0.15);

   // c.rect(0,0,10,10);


    c.setDetailCircle(20);

    c.translate(width * 0.5, height * 0.5);
    c.rotate(time);

    // c.rotate(time);
    c.fill3f(1,0,0);
    c.rect(-300,-300,600,600);

    c.fill3f(0,0,1);
    c.rect(-300,0,300,300);

    c.fill1f(1);
    c.rect(0,200,200,10);

    c.noStroke();
    c.fill3f(1,0,1);


    var i = -1;
    var l = Math.floor((Math.sin(time*0.0025) * 0.5 + 0.5) * 3000);
    var s = Math.PI * 2 / l;
    var si;
    var r = 300;
    var ri;

    var strokeColor = [1,1,1,1,
        0.35,0,0.75,0];



    while(++i < l){
        si = s * i;
        ri = Math.sin(si * 32 ) * r;
        c.pushMatrix();
        c.translate(ri * 0.5 + Math.cos(si) * ri ,
            ri * 0.5 + Math.sin(si) * ri);
        //c.rect(0,0,10,10);
        c.rotate(time + si );
        c.setLineWidth((Math.sin(si * 128) * 0.5 + 0.5) * 50);
        //c.circle(0,0,(Math.sin(si * 128) * 0.5 + 0.5) * 25);
        c.strokefv(strokeColor);
        c.line(0,0,100,0);
        c.noStroke();
        c.popMatrix();
    }


};

App.prototype.drawShapeOrigin = function(x,y){
    var c = this;
    var oldStroke = c.getStroke(),
        oldFill   = c.getFill();

    c.noStroke();
    c.fill3f(0,0,0);
    c.setModeCircle(CanvasGL.kCenter);
    c.setDetailCircle(10);
    c.circle(x,y,7.5);

    if(oldStroke)c.strokefv(oldStroke);
    else c.noStroke();
    if(oldFill)c.fillfv(oldFill);
    else c.noFill();
};


window.addEventListener("load",function(){
   var app = new App(document.getElementById("container"));
});
