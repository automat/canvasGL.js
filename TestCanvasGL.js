/**
 * Created with JetBrains WebStorm.
 * User: DEEV
 * Date: 27.12.12
 * Time: 09:49
 * To change this template use File | Settings | File Templates.
 */

function TestCanvasGL(parentDomElementId)
{
    //CanvasGLOptions.doLog = false;
    this.cgl = new CanvasGL(parentDomElementId);
    this.cgl.setSize(window.innerWidth,window.innerHeight);
    this.t = 0.0;

    this.numImages = 1;
    this.numImagesLoaded = 0;

    this.img = new CanvasGLImage();
    var c = this.cgl;

    c.loadImage("tex512.jpg",this.img,this,"onImageLoaded");


}

TestCanvasGL.prototype.onImageLoaded = function()
{
    this.numImagesLoaded++;
    if(this.numImagesLoaded == this.numImages)this.onImagesLoadedComplete();
};

TestCanvasGL.prototype.onImagesLoadedComplete = function()
{
    this.animationLoop();
};

TestCanvasGL.prototype.animationLoop = function()
{
    requestAnimationFrame(TestCanvasGL.prototype.animationLoop.bind(this));
    this.draw();

};

TestCanvasGL.prototype.draw = function()
{

    this.t+=0.05;
    var t = this.t,
        c = this.cgl;

    c.background(10);
    c.noStroke();
    c.noFill();


    var i,j;
    var rs = 80,rs2 = rs*2;
    var pa,ps,pp0,pp1,pp3,pp4;

    var verticesA,verticesB;
    var indicesA,indicesB;


    c.pushMatrix();
    {
        c.translate(rs,rs);
        c.scale(1,1);

        c.pushMatrix();
        {
            c.translate(0,0);
            c.image(this.img,0,0,rs2,rs2);

            c.translate(rs2,0);
            c.texture(this.img);


        }
        c.popMatrix();

    }
    c.popMatrix();





};

