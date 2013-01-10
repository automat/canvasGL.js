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

    this.numImages = 2;
    this.numImagesLoaded = 0;

    this.img0 = new CanvasGLImage();
    this.img1 = new CanvasGLImage();
    var c = this.cgl;

    c.loadImage("k512.jpg",this.img0,this,"onImageLoaded");
    c.loadImage("j512.jpg",this.img1,this,"onImageLoaded");


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
    c.noStroke();
   c.fill(255);



    var i,j;
    var rs = 80,rs2 = rs*2;
    var pa,ps,pp0,pp1,pp3,pp4;

    var verticesA,verticesB;
    var indicesA,indicesB;

    var transformedPoint = [];



    c.pushMatrix();
    {
        c.translate(rs,rs);
        c.scale(1,1);

        c.pushMatrix();
        {
            pp0 = 255*abs(sin(t*0.25));
            c.translate(0,0);
            c.image(this.img1,0,0,rs2,rs2);
            c.fill(pp0,0,0,0.75);
            c.setEllipseDetail(40);
            c.circle(rs,rs,rs);

        }
        c.popMatrix();
        c.pushMatrix();
        {
            pp0 = rs*0.5;

            c.translate(rs2+pp0,pp0);
            c.fill(stepCubed(abs(sin(t*0.25)))*150,0,0);
            c.rotate(HALF_PI*stepCubed(abs(sin(t*0.25))));
            pp0 = rs*0.25+rs*0.25*stepCubed(abs(sin(t*0.25)));

            c.triangleMesh([-pp0,-pp0,pp0,-pp0,pp0,pp0,-pp0,pp0],[0,1,3,1,2,3]);
            transformedPoint = c.getScreenCoord(pp0,0);

        }
        c.popMatrix();
        c.pushMatrix();
        {
            c.translate(rs*2+rs*0.5,rs+rs*0.5);
            c.rotate(t*0.5);
            c.fill(100+floor(155*abs(sin(t))));
            c.setEllipseDetail(3+floor(27*abs(sin(t*0.25))));
            c.ellipse(0,0,rs*0.25 + rs*0.25*abs(sin(t)),rs*0.5-rs*0.25*abs(sin(t)));
        }
        c.popMatrix();
        c.pushMatrix();
        {
            c.translate(0,rs);
            c.stroke(100,0,0);

            pa = 100;
            ps = (rs2)/(pa-1);

            verticesA = [];

            pp1 = 1+2*abs(sin(t*0.05));
            c.noStroke();
            i = -1;
            while(++i < pa)
            {
                pp0 = i/(pa)*PI-t*0.25;
                verticesA.push(i*ps,rs*0.5 + rs*0.5*sin(pp0*pp1),i*ps,rs);
            }
            i = 0;
            c.fill(10);
            c.triangleMesh(verticesA);

        }
        c.popMatrix();
        c.pushMatrix();
        {
            c.translate(rs*4+6,6);

            pp0 = abs(sin(t*0.05));
            pp3 = abs(sin(t*0.075));
            pp4 = abs(sin(t*0.0075));



            var anchor0 = [(rs*2-6)-(rs*2-6)*pp4,pp3*(rs*2-12)],
                anchor1 = [(rs*2-6)*pp4,(rs*2-12)-pp3*(rs*2-12)];

            var cntrl0 = [(rs*2-6)-(rs*2-6)*pp0,0],
                cntrl1 = [(rs*2-6)*pp0,rs*2-12];

            c.stroke(80);
            c.line(anchor0[0],anchor0[1],cntrl0[0],cntrl0[1]);
            c.line(anchor1[0],anchor1[1],cntrl1[0],cntrl1[1]);

            c.noStroke();
            c.fill(80);
            c.setEllipseDetail(10);
            c.circle(cntrl1[0],cntrl1[1],3);
            c.circle(cntrl0[0],cntrl0[1],3);

            c.stroke(255);

            c.bezier(anchor0[0],anchor0[1],cntrl0[0],cntrl0[1],
                cntrl1[0],cntrl1[1],anchor1[0],anchor1[1]);



            c.fill(255);
            pp0 = c.bezierPoint(0);
            c.circle(pp0[0],pp0[1],3);
            pp0 = c.bezierPoint(1);
            c.circle(pp0[0],pp0[1],3);

            pp1 = floor(10*abs(sin(t*0.025)));

            i = 0;
            while(++i < pp1)
            {
                pp0 = c.bezierPoint(i/pp1);
                c.fill(255);
                c.circle(pp0[0],pp0[1],3);
                c.fill(150,0,0);
                c.circle(pp0[0],pp0[1],2);

            }

        }
        c.popMatrix();
        c.pushMatrix();
        {
            c.translate(rs*6,0);

            c.noStroke();
            c.fill(100,0,0);

            pp0 = new Array(10);
            pp1 = PI / pp0.length * 0.25;
            i=0;
            while(i < pp0.length)
            {
                pp2 = i*pp1;
                pp0[i] =randomFloat(rs2);
                pp0[i+1] = randomFloat(rs2);
                i+=2;
            }



            i = 2;
            while(i < pp0.length)
            {
                c.circle(pp0[i],pp0[i+1],3,3);
                i+=2;
            }

            c.stroke(100,0,0);
            c.lines(pp0);

            c.setSplineDetail(20);
            c.stroke(255);
            c.catmullRomSpline(pp0);




        }

        c.popMatrix();

        c.pushMatrix();
        {
            c.translate(0,rs*2);

            c.stroke(30);
            c.noFill();
            c.rect(0,rs,rs*2,rs*2);

            c.stroke(100,0,0);

            pa = 5+floor(abs(sin(t*0.05))*25);
            ps = (rs*8)/(pa-1);

            verticesA = [];
            verticesB = [];

            pp0 = 4 * abs(sin(t*0.05));
            pp1 = rs*0.5-6;

            i = -1;
            while(++i < pa)
            {
                verticesA.push(i*ps,rs*0.5 + pp1*sin(pp0*i/(pa)*PI+t));
                verticesB.push(i*ps,rs*0.5 + pp1*sin((PI+pp0*i/(pa)*PI)+t));

                c.stroke(255);
                c.line(verticesA[verticesA.length-2],verticesA[verticesA.length-1],
                    verticesB[verticesB.length-2],verticesB[verticesB.length-1]);


            }

            c.stroke(100,0,0);
            c.lines(verticesA);
            c.lines(verticesB);
            c.fill(255);
            c.noStroke();
            i = 0;
            while(i < pa*2)
            {



                c.fill(0);
                c.circle(verticesA[i],verticesA[i+1],3.2);
                c.circle(verticesB[i],verticesB[i+1],3.2);
                c.fill(255);
                c.circle(verticesA[i],verticesA[i+1],3);
                c.circle(verticesB[i],verticesB[i+1],3);
                c.fill(0);
                c.circle(verticesA[i],verticesA[i+1],2.2);
                c.circle(verticesB[i],verticesB[i+1],2.2);

                i+=2;
            }
        }
        c.popMatrix();
        c.pushMatrix();
        {
            c.translate(0,rs*3);
            pp0 = abs(sin(t));
            pp1 = abs(sin(t*0.5));
            c.setEllipseDetail(40);
            c.fill(255);
            c.circle(rs,rs,rs-11,rs-11,100);
            c.fill(0);
            c.arc(rs,rs,rs*0.5+rs*0.25*pp1+10,rs*0.5+rs*0.25*pp1+10,0,(PI-PI*0.25)*pp1,30*pp1,30*pp1);
            c.fill(100,0,0);
            c.arc(rs,rs,rs*0.5+rs*0.25*pp1+10,rs*0.5+rs*0.25*pp1+10,0,pp1*-PI*0.25,30*pp1,30*pp1);


        }
        c.popMatrix();
        c.pushMatrix();
        {
            c.translate(rs*2,rs*3);


            c.stroke(30);
            c.noFill();
            c.rect(0,0,rs*2,rs*2);
            c.rect(rs*2,0,rs*2,rs*2);
            c.rect(rs*4,0,rs*2,rs*2);
            //c.setPixelPerfect(false);




            verticesB = [];

            var x,y;

            verticesA = [];

            pa = 3+floor(7*stepSquared(abs(sin(t*0.25))));
            ps = rs*2/(pa-1);

            i = -1;
            while(++i < (pa-1))
            {
                j = -1;
                while(++j < pa-1)
                {
                    c.rect(ps*i,ps*j,ps,ps);
                }
            }

            c.stroke(20);


            ps = rs*2/(pa-1);

            i = -1;
            while(++i < (pa-1)*2)
            {
                j = -1;
                while(++j < pa-1)
                {
                    c.rect(rs*2+ps*i,ps*j,ps,ps);
                }
            }

            c.noStroke();
            c.fill(40);
            i = -1;
            while(++i < pa)
            {
                x = i*ps;
                y = rs*2-(lerp(rs*2,0,i/(pa-1)));

                verticesA.push(x,y);
                c.rect(x-2, y-2,4,4);

            }
            c.stroke(40);
            c.lines(verticesA);

            i = -1;


            verticesA = [];



            i = -1;
            c.fill(80);
            while(++i < pa)
            {
                x = i*ps;
                y = rs*2-(lerp(rs*2,0,stepSmooth(i/(pa-1))));
                verticesA.push(x,y);
                c.rect(x-2, y-2,4,4);
            }
            c.stroke(80);
            c.lines(verticesA);

            verticesA = [];

            i = -1;
            c.fill(120);
            while(++i < pa)
            {
                x = i*ps;
                y = rs*2-(lerp(rs*2,0,stepSquared(i/(pa-1))));
                verticesA.push(x,y);
                c.rect(x-2, y-2,4,4);
            }
            c.stroke(120);
            c.lines(verticesA);

            verticesA = [];

            i = -1;
            c.fill(160);
            while(++i < pa)
            {
                x = i*ps;
                y = rs*2-(lerp(rs*2,0,stepInvSquared(i/(pa-1))));
                verticesA.push(x,y);
                c.rect(x-2, y-2,4,4);
            }
            c.stroke(160);
            c.lines(verticesA);

            verticesA = [];

            i = -1;
            c.fill(200);
            while(++i < pa)
            {
                x = i*ps;
                y = rs*2-(lerp(rs*2,0,stepCubed(i/(pa-1))));
                verticesA.push(x,y);
                c.rect(x-2, y-2,4,4);
            }
            c.stroke(200);
            c.lines(verticesA);

            verticesA = [];

            i = -1;
            c.fill(240);
            while(++i < pa)
            {
                x = i*ps;
                y = rs*2-(lerp(rs*2,0,stepInvCubed(i/(pa-1))));
                verticesA.push(x,y);
                c.rect(x-2, y-2,4,4);
            }
            c.stroke(240);
            c.lines(verticesA);

            c.noStroke();

            pp1 = abs(sin(t));
            pp0 = 4+6*stepCubed(pp1);
            var pp2 = abs(sin(t*0.25));
            x = (rs*2+pp0)+stepSmooth(pp2)*(rs*4-pp0*2);
            y = (rs*2-pp0)-stepCubed(pp2)*(rs*2-pp0*2);
            c.fill(stepCubed(pp1)*100,0,0);
            c.circle(x,y,pp0);
            pp2 = abs(sin(t*0.25+PI*0.05));
            x = (rs*2+pp0)+stepSmoothSquared(pp2)*(rs*4-pp0*2);
            y = (rs*2-pp0)-stepSmoothSquared(pp2)*(rs*2-pp0*2);
            c.fill(stepSquared(pp1)*100,0,0);
            c.circle(x,y,pp0);
            pp0 = 4+6*stepSmoothInvSquared(pp1);

            pp2 = abs(sin(t*0.25+PI*0.25));

            x = (rs*2+pp0)+stepSmoothInvSquared(pp2)*(rs*4-pp0*2);
            y = (rs*2-pp0)-stepSmoothInvSquared(pp2)*(rs*2-pp0*2);

            c.fill(stepSmoothInvSquared(pp1)*100,0,0);
            c.circle(x,y,pp0);

            pp2 = abs(sin(t*0.25+PI*0.5));
            pp0 = 4+6*stepSmoothInvSquared(pp1);

            x = (rs*2+pp0)+stepSmoothCubed(pp2)*(rs*4-pp0*2);
            y = (rs*2-pp0)-stepSmoothCubed(pp2)*(rs*2-pp0*2);

            c.fill(stepSmoothInvSquared(pp1)*100,0,0);
            c.circle(x,y,pp0);

    }
        c.popMatrix();

        c.pushMatrix();
        {


        }
        c.popMatrix();

        c.pushMatrix();
        {
            pp0 = 0.25+0.75*abs(sin(t*0.25));
            c.translate(0,rs*5);
            c.texture(this.img0,(sin(t*0.25)),cos(t*0.25),pp0,pp0);
            c.rect(0,0,rs2,rs2);
            c.noTexture();
        }
        c.popMatrix();


    }
    c.popMatrix();

    c.noStroke();
    c.pushMatrix();
    {
        c.fill(255*stepSmoothSquared(abs(sin(t))));
        c.translate(transformedPoint[0],transformedPoint[1]);
        c.rotate(QUARTER_PI);
        c.rect(-2.5,-2.5,5,5);
    }
    c.popMatrix();






};

