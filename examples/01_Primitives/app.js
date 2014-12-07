var CanvasGL = require('../../index.js');


function App(element){
    CanvasGL.call(this,element);

    this.size(400,400);
}

App.prototype = Object.create(CanvasGL.prototype);
App.prototype.constructor = App;


App.prototype.draw = function(){
    var ctx = this.getContext();
    ctx.background(1,0,0);

    var s = this.secondsElapsed();
    var intrpl = 0.5 + Math.sin(s) * 0.5;

    var gl = ctx._gl;
    var program = ctx._program;

    ctx.pointSize(6.0);

    //var buffer = gl.createBuffer();
    //gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    //gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,1,1,1]),gl.STATIC_DRAW);
    //ctx.setMatrixUniform();
    //program.vertexAttribPointer('aVertexPosition',2,gl.FLOAT,false,0,0);
    //program.vertexAttribPointer('aVertexColor',4,gl.FLOAT,false,0,8);
    //program.disableVertexAttribArray('aTexcoord');
    //gl.drawArrays(gl.POINTS,0,1);
    //program.enableVertexAttribArray('aTexcoord');
    //gl.deleteBuffer(buffer);

    //ctx.pushMatrix();
    //ctx.fill(1,1,1,1);
    //ctx.translate(this.width() * 0.5,this.height() * 0.5);
    //ctx.rotate(i * Math.PI * 2.0);
    //ctx.point(100,0);
    //ctx.popMatrix();

    //ctx.pushMatrix();
    //ctx.rotate(s);
    //ctx.fill(1,1,1,1);
    //ctx.points([100,0,0,0,100,100,50,50],[1,1,1,1,1,0,1,1]);
    //ctx.popMatrix();

    //ctx.pushMatrix();
    //ctx.fill(1,1,1,1);
    //ctx.circleDetail(10 + (intrpl * 10));
    //ctx.circleMode(CanvasGL.CENTER);
    //ctx.circle(100,100,100);
    //ctx.circleMode(CanvasGL.CORNER);
    //ctx.circle(100,100,100);
    //ctx.popMatrix();

    ctx.pushMatrix();
    ctx.stroke(1,1,1,1);
    ctx.strokeWeight(10);
    ctx.translate(100,100);
    ctx.strokeCap(CanvasGL.ROUND);
   // ctx._polyline([0,0,100,0,100 + Math.sin(s) * 50,100,0,100],null,true);
    ctx.lines([[0,0,100,0,100,100],[100,150,200,150]],null,false);
    ctx.strokeWeight(20);
    ctx.line(100,100,0,100);
    //ctx.line(0,0,100,0);
    //ctx._polyline([0,0,100,0,100,100,0,100],null,false);
    ctx.popMatrix();
};

window.addEventListener('load',function(){
    var app = new App(document.getElementById('container'));
});