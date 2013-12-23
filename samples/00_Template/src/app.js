function App(element){
    CanvasGL.call(this,element);
}

App.prototype = Object.create(CanvasGL.prototype);

App.prototype.draw = function(){

    var c = this;

    //console.log(c.getKeyStr());


    c.background(Math.abs(Math.sin(c.getSecondsElapsed() * Math.PI)) * 255,1,1);
    c.fill1f(1);
    c.circle(0,0,10,10);

    c.stroke1f(1);
    c.line(0,0,50,50);

    c.stroke3f(1,1,1);
    c.rect(20,20,10,10);

    c.arc(100,100,50,50,0,1.2,10,10);

    c.setLineWidth(10);
    c.stroke3f(Math.abs(Math.sin(c.getSecondsElapsed() * 100 * Math.PI)),0,0);
    c.strokefv([1,1,1,1,0,0,0,0]);
    c.line(100+ Math.cos(c.getSecondsElapsed()*Math.PI) * 100,100+ Math.sin(c.getSecondsElapsed()*Math.PI) * 100,250,250);
};




window.addEventListener("load",function(){
   var app = new App(document.getElementById("container"));
});

window.addEventListener("resize",function(){

});