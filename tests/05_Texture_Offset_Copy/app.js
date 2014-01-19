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
    // Init stuff goes here
    var ctx = this.getContext();
    var ssaaf = this.getSSAAFactor();

    this._fboOff       = new CanvasGL.Framebuffer(ctx,20 * ssaaf,20 * ssaaf);
    this._fboOffPixels = new Uint8Array(this._fboOff.getWidth() * this._fboOff.getHeight() * 4);
    this._updateFboOff();
};

App.prototype._updateFboOff = function(){
    var c = this.getContext();
    var fbo = this._fboOff,
        fboWidth  = fbo.getWidth(),
        fboHeight = fbo.getHeight();
    var time = this.getSecondsElapsed();
    var ssaaf = this.getSSAAFactor();

    fbo.bind();
    c.pushMatrix();
    c.loadIdentity();
    c.backgroundfv(1,1,1,0);

    c.setModeCircle(CanvasGL.CORNER);

    c.setDetailCircle(20);
    c.noStroke();
    c.fill3f(Math.sin(time*10) * 0.5 + 0.5,0,0);
    c.circle(0,0,fboWidth * 0.25,fboHeight * 0.25);
    fbo.readPixels(0,0,fboWidth,fboHeight,CanvasGL.RGBA,CanvasGL.UNSIGNED_BYTE,this._fboOffPixels);
    fbo.unbind();
    c.popMatrix();

};

App.prototype.draw = function(){
    // Draw stuff goes here
    this._updateFboOff();

    var time   = this.getSecondsElapsed();
    var width  = this.getWidth(),
        height = this.getHeight();

    var c =  this.getContext();
    c.bindDefaultFramebuffer();

    c.backgroundfv(0.15,0,0.15);

    c.translate(width * 0.5, height * 0.5);

    c.setModeEllipse(c.kCenter);
    c.setDetailCircle(20);

    c.fill3f(0.65,0,0.75);
    c.circle(0,0,50 + (Math.sin(time) * 0.5 + 0.5) * 50);
    c.rect(0,200,200,100)

    var fboOffPixels = this._fboOffPixels;
    var fboOff       = this._fboOff,
        fboOffWidth  = fboOff.getWidth(),
        fboOffHeight = fboOff.getHeight();

    var fbo = c.getCurrFramebuffer();

    var numX = 20,
        numY = 20;


    var i,j;
    i = -1;
    while(++i < numX){
        j = -1;
        while(++j < numY){
            fbo.writePixels(i*fboOffWidth,j*fboOffHeight,fboOffWidth,fboOffHeight,CanvasGL.RGBA,CanvasGL.UNSIGNED_BYTE,fboOffPixels);
        }
    }

    //fboTex.writePixels(0,0,fboOffWidth,fboOffHeight,CanvasGL.RGBA,CanvasGL.UNSIGNED_BYTE,fboOffPixels);
  //  fboTex.writePixels(300,300,fboOffWidth,fboOffHeight,CanvasGL.RGBA,CanvasGL.UNSIGNED_BYTE,fboOffPixels);


    var fboOff = this._fboOff;
    c.drawFbo(fboOff,fboOff.getWidth() * 0.5, fboOff.getHeight() * 0.5);
};


window.addEventListener("load",function(){
    var app = new App(document.getElementById("container"));
});
