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
    c.fill(255);


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
            pp0 = 10;
            pp1 = 10;
            pp3 = 30;




            c.setFontWeight('normal');
            c.setFontSize(20);

            i = -1;


            while(++i < pp0)
            {
                j = -1;
                while(++j < pp1)
                {
                    c.pushMatrix();
                    c.translate(i*(pp3+pp3*0.25),j*(pp3+pp3*0.25));

                    c.rotate(t);
                    c.image(this.img,0,0,pp3,pp3);

                    c.setFontSize(abs(sin(t)*20));
                    var s = i+","+j;
                    c.fill(255,0,0);
                    c.text(s,0 , 0);
                    c.popMatrix();
                }
            }

            /*
            c.translate(0,0);
            c.image(this.img,0,0,rs2,rs2);

            c.setFontWeight("bold");
            c.translate(rs2,0);
            */

            /*
            c.fill(randomInteger(255),randomInteger(255),randomInteger(255));
            c.setFontSize(4+455*abs(sin(t*0.15)));
            c.text(randomInteger(1000000),0,0);
            */



        }
        c.popMatrix();

    }
    c.popMatrix();





};

