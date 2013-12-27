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
    //if(this.runTick > 1)return;

    var c = this;
    var time      = c.getSecondsElapsed(),
        timeDelta = c.getTimeDelta();

    c.backgroundfv(0.15,0,0.15);
    c.setDetailCircle(20);

    var width   = c.getWidth(),
        height  = c.getHeight(),
        width_2 = width * 0.5,
        height_2= height * 0.5;

    var sin = Math.sin(time) * 0.5 + 0.5;
    c.fill3f(1,0,0);

    //c.circleSet([0,0],[10]);

    var w_2 = 50;
    c.translate(width_2,height_2);
    c.drawElements(new Float32Array([-w_2,-w_2,
                                      w_2,-w_2,
                                      w_2, w_2,
                                     -w_2, w_2]),new Uint16Array([0,1,2,0,2,3]));


   // console.log('---');

   this.runTick++;

};

App.prototype.drawShapeOrigin = function(x,y){
    var c = this;
    var oldStroke = c.getStroke(),
        oldFill   = c.getFill();

    c.noStroke();
    c.fill3f(0,0,0);
    c.setModeCircle(CanvasGL.CENTER);
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
