function App(element){
    this.cgl = new CanvasGL(element,300,100);


}

App.prototype.draw = function(){
    var ctx = this.cgl;

    ctx.background(255,1,1);
    ctx.fill1f(1);
    ctx.circle(0,0,10,10);

    ctx.stroke1f(1);
    ctx.line(0,0,50,50);

    ctx.stroke3f(0);
    ctx.rect(20,20,10,10);

    ctx.arc(100,100,50,50,0,1.2,10,10);
};

window.addEventListener("load",function(){
   var app = new App(document.getElementById("container"));
       app.draw();
       app.draw();
});

window.addEventListener("resize",function(){

});