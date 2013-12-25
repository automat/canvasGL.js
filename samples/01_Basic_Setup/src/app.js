function App(element){
    CanvasGL.call(this,element);
    this.setSize(window.innerWidth,window.innerHeight);


    var self = this;
    window.addEventListener('resize',function(){
        self.setSize(window.innerWidth,window.innerHeight);
    });
}

App.prototype = Object.create(CanvasGL.prototype);

App.prototype.draw = function(){
    var c = this;
    var time      = c.getSecondsElapsed(),
        timeDelta = c.getTimeDelta();

    c.backgroundfv(0.15,0,0.15);
    c.setDetailCircle(20);

    var width   = c.getWidth(),
        height  = c.getHeight(),
        width_2 = width * 0.5,
        height_2= height * 0.5;

    c.translate(width_2,height_2);
    //c.fill1f(1);
    c.stroke1f(1);
    c.fill3f(1,0,0);
    //c.setModeRect(c.CORNER);
    //c.rect(0,0,100,100);
    //c.circle(0,0,100);
    c.setModeRect(c.CENTER);
    c.roundRect(0,0,100,100,20);

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

App.prototype.onKeyDown = function(e){
    console.log('Key pressed: ' + this.getKeyStr() + ' / code: ' + this.getKeyCode());
};

App.prototype.onMouseDown = function(e){
    console.log("Mouse down.")
};

App.prototype.onMouseMove = function(e){
    console.log("Mouse position: " + this.getMousePos() + ' / last: ' + this.getMousePosLast());
};

window.addEventListener("load",function(){
   var app = new App(document.getElementById("container"));
});
