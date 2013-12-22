function App(element){
    this.cgl = new CanvasGL(element,300,100);


}

App.prototype.draw = function(){
    var cgl = this.cgl;

    cgl.background(255,1,1);
    cgl.fill1f(1);
    cgl.circle(0,0,10,10);

    cgl.stroke1f(1);
    cgl.line(0,0,50,50);
};

window.addEventListener("load",function(){
   var app = new App(document.getElementById("container"));
       app.draw();
       app.draw();
});

window.addEventListener("resize",function(){

});