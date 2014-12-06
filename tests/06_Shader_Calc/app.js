var CanvasGL = require('../../src/CanvasGL');

function App(element){
    CanvasGL.call(this,element);

    this.size(window.innerWidth,window.innerHeight);

    var self = this;
    window.addEventListener('resize',function(){
        self.size(window.innerWidth,window.innerHeight);
    });
}

App.prototype = Object.create(CanvasGL.prototype);

App.prototype.setup = function(){
    // Init stuff goes here
    var ctx = this.getContext();

    var vert =  "void main(){ " +
                    "gl_Position = vec4(1.0,1.0,1.0,1.0); " +
                "}",

        frag =  "precision mediump float; " +
                "void main(){ " +
                    "gl_FragColor = vec4(1.0,1.0,1.0,1.0); " +
                "}";

    this._program = new CanvasGL.Program(ctx,vert,frag);

    var format = new CanvasGL.TextureFormat();
        format.minFilter = CanvasGL.TextureFormat.NEAREST;
        format.magFilter = CanvasGL.TextureFormat.NEAREST;
        format.wrapMode  = CanvasGL.TextureFormat.CLAMP_TO_EDGE;

    this._framebuffer = new CanvasGL.Framebuffer(ctx,128,4,format);


};

App.prototype.draw = function(){

    var time   = this.secondsElapsed();
    var width  = this.width(),
        height = this.height();
    var c =  this.getContext();

    // Draw stuff goes here

    c.background(0.15,0,0.15);

    c.translate(width * 0.5, height * 0.5);

    c.setModeEllipse(c.kCenter);
    c.circleDetail(20);

    c.fill3f(0.65,0,0.75);
    c.circle(0,0,50 + (Math.sin(time) * 0.5 + 0.5) * 50);

    var framebuffer = this._framebuffer,
        program     = this._program;

    var gl = c.getContext3d();

    c.useProgram(program);
    framebuffer.bind();



    framebuffer.unbind();
    c.restoreDefaultProgram();

};


window.addEventListener("load",function(){
    var app = new App(document.getElementById("container"));
});
