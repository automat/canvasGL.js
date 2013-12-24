
function TestCanvasGL(parentDomElementId)
{
    var w = window.innerWidth,
        h = window.innerHeight;

    this.cgl = new CanvasGL(parentDomElementId,w,h);
    this.t = 0.0;

    this.numImages = 3;
    this.numImagesLoaded = 0;

    this.img0 = new CanvasGLImage();
    this.img1 = new CanvasGLImage();
    this.img2 = new CanvasGLImage();
    var c = this.cgl;

    this.img0Data = null;

    this.sn = new SimplexNoise();

    this.nh = 16;
    this.nd = 21;
    this.rs = this.cgl.width/(this.nh*2);
    this.nv = round(this.cgl.height/(this.rs*2));

    this.dl =null;
    this.dcl = new Array(this.nd*2);
    this._resetDL();



    window.addEventListener("resize", this.onWindowResize.bind(this), false);

    c.loadImage("images/l512.jpg",this.img0,this,"onImageLoaded");
    c.loadImage("images/m512.jpg",this.img1,this,"onImageLoaded");
    c.loadImage("images/c512.jpg",this.img2,this,"onImageLoaded");
}


TestCanvasGL.prototype.onWindowResize = function()
{
    var w = window.innerWidth,
        h = window.innerHeight;
    this.rs = this.cgl.width/(this.nh*2);
    this.nv = round(this.cgl.height/(this.rs*2));
    this._resetDL();
    this.cgl.setSize(w,h);
};

TestCanvasGL.prototype._resetDL = function()
{
    this.dl = new Array(this.nh*this.nv*2);

    var dl = this.dl;

    var i = 0, j, k,l;


    while(i<this.dcl.length)
    {
        j = randomInteger(this.nh) * this.rs*2;
        k = randomInteger(this.nv) * this.rs*2;

        this.dcl[i ] = j;
        this.dcl[i+1]= k;

        i+=2;


    }





};

TestCanvasGL.prototype.onImageLoaded = function()
{
    this.numImagesLoaded++;
    if(this.numImagesLoaded == this.numImages)this.onImagesLoadedComplete();
};

TestCanvasGL.prototype.onImagesLoadedComplete = function()
{
    this.img0Data = this.cgl.getImagePixel(this.img0);

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

    c.background(8,0.5);//0.01);

    var i,j;

    var nh = this.nh,
        nv = this.nv;

    var rs = this.rs,rs2 = rs* 2,rs3 = rs* 3,rs4 = rs* 4,rs05 =rs*0.5, rs025 = rs* 0.25;

    var dcl = this.dcl;


    /*
    i = 0;
    while(i<dcl.length)
    {
        dcl[i]+= 2*sin(t*0.00025+i);
        dcl[i+1]+= 2*sin(t*0.00025+i);
        i+=2;
    }
    */


    var pa,ps;
    var pp0,pp1,pp2,pp3,pp4,pp5,pp6,pp7,pp8,pp9,pp10,pp11,pp12,pp13,pp14,pp15,pp16;
    var sint = sin(t),sint05 = sin(t*0.5),sint025 = sin(t*0.25);
    var asint = abs(sint), asint05 = abs(sint05),asint025 = abs(sint025);

    if(saw(t*0.25)>0.98)
        this._resetDL();


   // this._resetDL();



    var verticesA,verticesB;
    var indicesA,indicesB;

    var transformedPoint = [];

    var img0 = this.img0, img1 = this.img1, img2 = this.img2;

    var numSamples  = 8,
        sampleStep  = PI / numSamples;







    c.pushMatrix();
    {
        c.translate(0,0);
        c.scale(1,1);




        c.pushMatrix();
        {
            c.noFill();
            c.noStroke();
            c.translate(dcl[0]+rs,dcl[1]+rs);
            c.rotate(asint025*TWO_PI*2);
            c.setLineWidth(3+floor(asint025*15));
            c.setDetailEllipse(3+floor(asint025*27));
            c.strokeArrF([1.0,0.0,0.0,1.0,
                          0.0,0.0,1.0,1.0]);

            c.circle(0,0,rs025 + rs025*asint025);
            c.stroke(255);
            c.setLineWidth(1);
            c.circle(0,0,rs05  - rs05*asint025);

        }
        c.popMatrix();

        c.pushMatrix();
        {
            c.translate(dcl[2]+rs,dcl[3]+rs);
            c.rotate(QUARTER_PI+abs(sin(t*0.05))*4*PI);
            c.setModeRect(CanvasGL.CENTER);
            c.setLineWidth(3+floor(asint025*15));

            c.stroke(255);
            c.fillArrF([1.0,0.0,0.0,1.0,
                        0.0,0.0,1.0,1.0,
                        0.0,0.0,1.0,1.0,
                        1.0,0.0,1.0,1.0]);

            c.rect(0,0,rs,rs);
            c.setModeRect(CanvasGL.CORNER);
            c.setLineWidth(1);

        }
        c.popMatrix();

        c.pushMatrix();
        {
            c.translate(dcl[4],dcl[5]);
            c.setDetailEllipse(8);
            c.fill(255);
            c.setLineWidth(2);
            c.strokeArrF([1.0,0.0,0.0,1.0,
                          0.0,0.0,1.0,1.0]);
            c.arc(rs,rs,rs-20,rs-20,0,PI-(PI-QUARTER_PI)*asint025,20-10*asint025,20-10*asint025);

        }
        c.popMatrix();

        c.pushMatrix();
        {

            c.translate(dcl[6]+10,dcl[7]+10);

            pp8 = rs2;
            pp0 = 15;
            pp1 = (pp8-20) / pp0;
            pp2 = new Array(pp0*2);
            pp4 = floor(1+abs(sin(t*0.25)*19));
            pp5 = (pp8-20)/(pp4+1);

            j = 0;

            while(j<pp4)
            {
                i = 0;

                pp9 = j / pp4;
                pp7 = t*(1-pp9)*(-5);
                while(i<pp2.length)
                {
                    pp3 = i / pp0;
                    pp6 = i * 0.5;


                    pp2[i  ] = pp6*pp1;

                    pp2[i+1] = (pp8-20)-(j*pp5+pp5)-sin(pp7 + (pp3*(j+1))+(QUARTER_PI*pp9))*pp5*(0.25 + 0.5*(1-pp9));
                    i+=2;
                }

                c.setLineWidth(floor(2*(1-pp9))+1);
                c.strokeArrF([1.0,(1-pp9),(1-pp9),1.0,
                              0.0,0.0,1.0,1.0]);
                c.line(pp2);
                ++j;

            }

            c.noStroke();


        }
        c.popMatrix();



        c.pushMatrix();
        {
            c.translate(dcl[8],dcl[9]);
            c.texture(img2);
            c.setUVOffset(cos(t*0.25),sin(t*0.25),1,1);
            c.setUVQuad(1-asint05,1-asint05,1.0,0.0,0.0,1.0,asint025,asint025);
            c.setTextureWrap(CanvasGL.REPEAT);
            c.rect(0,0,rs2,rs2);
            c.noTexture();
            c.resetUVQuad();

        }
        c.popMatrix();

        c.pushMatrix();
        {
            c.translate(dcl[10]+rs,dcl[11]+rs);
            c.blend(CanvasGL.SRC_COLOR,CanvasGL.ONE_MINUS_SRC_COLOR);
            pp0 = 0+rs*0.75*stepSmooth(asint05);
            pp1 = rs*stepSmoothCubed(abs(sint025));
            c.rotate(TWO_PI*4*stepSmoothCubed(abs(sint025)));
            c.noStroke();
            c.fill(255,0,0,0.5);
            c.setDetailEllipse(20);
            c.circle(-pp1*0.25,pp1*0.25,pp0);
            c.fill(0,0,255,0.5);
            c.circle(+pp1*0.25,pp1*0.25,pp0);
            c.fill(0,255,0,0.5);
            c.circle(0,-pp1*0.25,pp0);
            c.resetBlend();

        }
        c.popMatrix();

        c.pushMatrix();
        {
            c.translate(dcl[12],dcl[13]);
            pp0 = abs(sin(t*0.05));
            pp3 = abs(sin(t*0.075));
            pp4 = abs(sin(t*0.075));
            c.setLineWidth(1);



            var anchor0 = [(rs2-6)-(rs2-6)*pp4,pp3*(rs2-12)],
                anchor1 = [(rs2-6)*pp4,(rs2-12)-pp3*(rs2-12)];

            var cntrl0 = [(rs2-6)-(rs2-6)*pp0,0],
                cntrl1 = [(rs2-6)*pp0,rs2-12];

            c.stroke(80);
            c.beginBatch();
            c.line(anchor0[0],anchor0[1],cntrl0[0],cntrl0[1]);
            c.line(anchor1[0],anchor1[1],cntrl1[0],cntrl1[1]);
            c.noStroke();
            c.fill(80);
            c.setDetailEllipse(10);
            c.circle(cntrl1[0],cntrl1[1],3);
            c.circle(cntrl0[0],cntrl0[1],3);


            c.setLineWidth(2);
            c.strokeArrF([1.0,0.0,0.0,1.0,
                0.0,0.0,1.0,1.0]);
            c.setDetailBezier(20);

            c.bezier(anchor0[0],anchor0[1],cntrl0[0], cntrl0[1],
                     cntrl1[0],  cntrl1[1],anchor1[0],anchor1[1]);


            c.noStroke();

            c.fill4f(1.0,0.0,0.0,1.0);
            pp0 = c.bezierPoint(0);
            c.circle(pp0[0],pp0[1],3);
            c.fill4f(0.0,0.0,1.0,1.0);
            pp0 = c.bezierPoint(1);
            c.circle(pp0[0],pp0[1],3);


            pp1 = floor(10*abs(sin(t*0.025)));

            i = 0;
            while(++i < pp1)
            {
                pp0 = c.bezierPoint(i/pp1);
                c.fill(255);
                c.circle(pp0[0],pp0[1],2);

            }
            c.drawBatch();
            c.endBatch();
        }
        c.popMatrix();




        c.pushMatrix();
        {
            c.setModeRect(CanvasGL.CORNER);
            c.noStroke();
            c.translate(dcl[14],dcl[15]);
            c.blend(CanvasGL.SRC_COLOR,CanvasGL.ONE_MINUS_SRC_COLOR);
            c.fill(255,0,255);
            c.pushMatrix();
            c.translate(rs,rs);
            c.rect(-rs+20,-rs+20,rs2-40,rs2-40);
            c.popMatrix();

            c.resetUVOffset();
            c.image(this.img1,0,0,rs2,rs2);
            c.resetBlend()
        }
        c.popMatrix();

        c.pushMatrix();
        {
            c.translate(dcl[16]+rs,dcl[17]+rs);
            c.scale(0.5+0.5*abs(sin(t*0.025)),0.5+0.5*abs(sin(t*0.025)));
            c.rotate(sin(t*0.025)*TWO_PI);

            pp0 = 80;
            pp1 = new Array(pp0*2+2);
            pp2 = [0,0];
            pp3 = rs;

            pp1[0] = pp2[0];
            pp1[1] = pp2[1];

            pp4 = TWO_PI / (pp1.length-2);

            pp5 = new Array((pp1.length/2)*3);

            pp7  = 1+floor(6*abs(sin(t*0.75)));
            pp8  = 0.1+abs(sin(t*2)*50);
            pp9  = 1+floor(40*abs(1-sin(t)));
            pp10 = -sin(t*2)*50;

            pp11 = new Array(pp1.length*2);

            pp11[0] = 1.0;
            pp11[1] = 1.0;
            pp11[2] = 1.0;
            pp11[3] = 1.0;




            i = 2;
            while(i< pp1.length)
            {
                pp3 = pow(abs(pow(abs(cos((pp7*(pp4*i))*0.25)),pp9) + pow(abs(sin((pp7*(pp4*i))*0.25)),pp10)),-(1/pp8));


                pp1[i]   = rs*0.5*pp3 * cos(pp4*i);
                pp1[i+1] = rs*0.5*pp3 * sin(pp4*i);


                j = (i-2)*0.5;
                pp6 = j * 3;
                pp5[pp6]   = 0;
                pp5[pp6+1] = j;
                pp5[pp6+2] = j+1;

                pp12 = j * 4;

                pp13 = j/pp1.length/2;

                pp11[pp12]   = (1-pp13);
                pp11[pp12+1] = 0;
                pp11[pp12+2] = pp13;
                pp11[pp12+3] = 1.0;


                i+=2;
            }

            pp5[pp5.length-3] = 0;
            pp5[pp5.length-2] = pp1.length/2-1;
            pp5[pp5.length-1] = 1;

            pp11[pp11.length-4] = 1;
            pp11[pp11.length-3] = 0;
            pp11[pp11.length-2] = 0;
            pp11[pp11.length-1] = 1.0;

            c.drawElements(pp1,pp5,pp11);






        }
        c.popMatrix();

        c.pushMatrix();
        {
            c.translate(dcl[18],dcl[19]);

            pp0 = [15,rs2-15,30,15,rs,rs,rs2-30,15,rs2-15,rs2-15];
            pp1 = stepSquared(abs(sin(t)));

            c.setDetailCurve(20);
            c.setLineWidth(20);
            c.strokeArrF([pp1,0.0,0.0,1.0,
                          0.0,0.0,1-pp1,1.0]);
            c.setDetailCurve(20);
            c.curve(pp0);
            c.noStroke();
            c.fill(255);

            i = 0;
            while(i < pp0.length)
            {
                c.circle(pp0[i],pp0[i+1],2);
                i+=2;
            }
        }
        c.popMatrix();

        c.pushMatrix();
        {
            c.translate(dcl[20],dcl[21]);

            pp0 = new Array(6);

            i = 0;
            while(i<pp0.length)
            {
                pp0[i]   = randomFloat(15,rs2-15);
                pp0[i+1] = randomFloat(15,rs2-15);
                i+=2;
            }

            c.strokeArrF([1,0.1,0.1,1.0,
                          1.0,1.0,1,0.0]);
            c.setLineWidth(30);
            c.setDetailCurve(30);
            c.curve(pp0);

            c.noStroke();
            c.noStroke();
            c.fill(255);



        }
        c.popMatrix();


        c.pushMatrix();
        {
            c.translate(dcl[22]+10,dcl[23]+10);
            c.setLineWidth(1);
            c.stroke(35);

            pp8 = rs2-20;

            pa = 2+floor(abs(sin(t*0.25))*8);
            ps =pp8/(pa-1);

            c.stroke(20);


            ps =pp8/(pa-1);


            pp0 = [];
            pp1 = [];
            pp4 = [];
            pp5 = [];
            pp6 = [];
            pp7 = [];

            c.noStroke();
            i = -1;
            while(++i < pa)
            {
                pp3 = i/(pa-1);
                x = i*ps;

                y =pp8-stepSmooth(pp3)*pp8;
                pp1.push(x,y);
                y =pp8-stepSmoothSquared(pp3)*pp8;
                pp4.push(x,y);
                y =pp8-stepSmoothInvSquared(pp3)*pp8;
                pp5.push(x,y);
                y =pp8-stepSmoothCubed(pp3)*pp8;
                pp6.push(x,y);
                y =pp8-stepSmoothInvCubed(pp3)*pp8;
                pp7.push(x,y);

            }



            c.strokeArrF([1.0,0.0,0.0,1.0,
                          0.0,0.0,1.0,1.0]);

            c.setLineWidth(2);
            //c.beginBatch();



            c.line(pp1);
            c.line(pp4);
            c.line(pp5);
            c.line(pp6);
            c.line(pp7);
            //c.drawBatch();
            c.translate(0,pp8);
            c.scale(1,-1);
            c.line(pp1);
            c.line(pp4);
            c.line(pp5);
            c.line(pp6);
            c.line(pp7);
            //c.drawBatch();
            //c.endBatch();

        }
        c.popMatrix();








        c.pushMatrix();
        {
            pp5 = 20+10*(sin(t));
            c.translate(dcl[24]+pp5,dcl[25]);
            c.noStroke();

            c.setDetailEllipse(12);
            pp1 = 30;
            pp0 = (rs2-pp5*2)/(pp1-1);
            pp2 = new Array(pp1);

            i = 0;

            //c.beginBatch();
            while(i<pp2.length)
            {
                pp4 = stepSmooth(1-abs((-pp1*0.5 + i)/pp1));
                pp6 = rs+sin(t*4+i/pp1*PI)*(rs-pp5*0.5)*0.5;
                pp7 = pp4 * pp5;
                c.fill(0,0.5);
                c.circle(i*pp0+1,pp6+1,pp7+1);
                c.fill(255*pp4,0,255-255*pp4);
                c.circle(i*pp0,pp6,pp7);
                i++;
            }
            //c.drawBatch();
            //c.endBatch();





        }

        c.popMatrix();






        c.pushMatrix();
        {

            c.translate(dcl[26],dcl[27]);
            c.noStroke();
            c.fill(100,0,0);
            c.setDetailEllipse(20);
            i = -1;
            pa  = 2+ floor(10*stepSmooth(asint025));
            pp0 = rs2/ (pa);
            c.setDetailEllipse(10);
            while(++i < pa)
            {
                j = -1;
                while(++j < pa)
                {
                    pp1 = this.sn.noise(i+ t*0.125,j-t*0.125);
                    c.fill((i/pa)*255,0,j/pa*255);
                    c.circle(i*pp0+pp0*0.5,j*pp0+pp0*0.5,pp0*0.5*pp1);
                }
            }

        }
        c.popMatrix();




        c.pushMatrix();
        {
            c.translate(dcl[28]+rs,dcl[29]+rs);
            c.rotate(TWO_PI*sin(t*0.1));

            c.setDetailEllipse(3+(floor(abs(sin(t*0.05))*7)));
            c.noStroke();
            c.stroke(255);
            c.texture(img2);
            c.tint(0.8);
            c.circle(0,0,rs);
            c.noTexture();

        }
        c.popMatrix();

        c.pushMatrix();
        {
            c.translate(dcl[30]+rs,dcl[31]+rs);
            c.rotate(TWO_PI*sin(t*0.1));

            c.setDetailEllipse(3+(floor(abs(sin(t*0.05))*7)));
            c.noStroke();


            c.setLineWidth(2);
            c.stroke(255);
            c.texture(img0);
            c.setUVOffset(cos(t*0.25),sin(t*0.25),abs(sin(t*0.05)),abs(sin(t*0.05)));
            c.setTextureWrap(CanvasGL.REPEAT);
            c.tint(0.8);
            c.ellipse(0,0,rs,rs*abs(sin(t)));
            c.noTexture();
            c.resetUVOffset();

        }
        c.popMatrix();



        c.pushMatrix();
        {
            c.translate(dcl[32],dcl[33]);

            pa = this.img0Data.length;

            pp0 = this.img0.width;
            pp1 = this.img0.height;
            pp3 = this.img0Data;

            c.blend(CanvasGL.SRC_COLOR,CanvasGL.ONE_MINUS_SRC_COLOR);

            var s = 40;

            var is = Math.floor(pp0/(s));

            var nn  = stepSmoothCubed(asint05);
            pp5 = [];
            pp6 = [];


            c.setModeRect(CanvasGL.CENTER);
            c.translate(rs,rs);
            c.rotate(nn*PI);


            pp7 = stepSmoothCubed(abs(sin(t*0.125)));
            c.noStroke();

            i = 0;

            nn  = stepSmoothCubed(abs(sin(t*0.5)));
            pp6 = [rs  ,rs];

            while(i < pp0)
            {
                j = 0;
                while(j < pp1)
                {

                    pp2 = (i+j*pp0)*4;

                    pp4 = [pp3[pp2],pp3[pp2+1],pp3[pp2+2],pp3[pp2+3]];

                    pp5 = [i/(pp0)*rs2,j/(pp1)*rs2];
                    pp8 = floor(pp4[0]*(1-pp7)+(255-pp4[0])*pp7);


                    c.fill(pp8,0,pp8,1);
                    c.rect(pp5[0] * (1-nn) + pp6[0] * nn - rs,pp5[1] * (1-nn) + pp6[1] * nn -rs,
                        is*(nn*4),is*(nn*4));


                    j+=s;

                }

                i+=s;
            }

            c.blend(CanvasGL.SRC_ALPHA,CanvasGL.ONE_MINUS_SRC_ALPHA);

        }
        c.popMatrix();

        c.pushMatrix();
        {

            c.translate(dcl[34],dcl[35]);
            c.setDetailEllipse(10);

            c.strokeArrF([1.0,0.0,0.0,1.0,
                0.0,0.0,1.0,1.0]);
            c.setDetailBezier(40);

            pp1 = (rs2-20)*abs(sin(t*0.025))+10;


            c.bezier(pp1,rs2-20,20,-rs*0.5+20,rs2-20,-rs*0.5+20,10+(rs2-10)-pp1,rs2-20);

            pp3 = 10;
            //pp0 = new Array(pp3);

            c.setModeRect(CanvasGL.CENTER);
            i = 0;



            while(i<pp3)
            {
                pp4 = i/(pp3-1);
                pp5 = (0.5+saw(t*0.025+(0.5-pp4))*0.5);
                pp6 = c.bezierPoint(pp5);

                pp7 = c.bezierTangentAngle(pp5) + HALF_PI;
                pp11=sin(t*0.5+pp4*8);
                pp8 =10* pp11;
                pp9 =pp6[0]+pp8*cos(pp7);
                pp10=pp6[1]+pp8*sin(pp7);

                c.stroke(255,0.125);
                c.line(pp6[0],pp6[1],pp9,pp10);
                c.noStroke();
                c.fill(255);
                c.circle(pp9,pp10,2);


                i++;

            }

            c.noStroke();


        }
        c.popMatrix();

        c.pushMatrix();
        {

            c.translate(dcl[36]+rs,dcl[37]+rs);







            pp3 = 50;
            pp0 = new Array(pp3*2);

            c.setModeRect(CanvasGL.CENTER);
            i = 0;

            pp7 = 2*abs(sin(t*0.05));

            pp5 = 2 * PI/ (pp3-1);

            while(i<pp3)
            {
                pp4 = i/(pp3);
                pp6 = pp5 * i;
                pp0[i  ] = (rs-10)*cos(pp7 * pp6) * sin(pp6);
                pp0[i+1] = (rs-10)*cos(pp7 * pp6) * cos(pp6);



                i+=2;

            }

            c.strokeArrF([1.0,0.0,1.0,1.0,
                           1.0,0.0,0.0,1.0]);
            c.setLineWidth(10);

            c.line(pp0);
            c.setLineWidth(1);
            c.stroke(255);
            c.line(pp0);

            c.noStroke();



        }
        c.popMatrix();

        c.pushMatrix();
        {
            c.translate(dcl[38]+rs,dcl[39]+rs);

            c.setModeRect(CanvasGL.CENTER);
            c.noStroke();
            c.fill(255);
            c.setDetailCorner(6);
            pp0 = abs(sin(t*0.5))*(rs-10);

            c.fill4f(abs(sin(t)),0.0,abs(sin(t)),1.0);

            c.setLineWidth(4);
            c.stroke4f(1-abs(sin(t)),0.0,0.0,1.0);
            c.rotate(PI*sin(t));

            c.roundRect(0,0,rs2-20,rs2-20,pp0);

        }
        c.popMatrix();

        c.pushMatrix();
        {
            c.translate(dcl[40],dcl[41]);

            pp4 = 20;
            pp0 = new Array(pp4*pp4*2);
            pp3 = (rs2) / (pp4-1);
            pp5 = new Array((pp0.length/2-2)*3);
            pp7 = pp4 - 1;
            pp9 = new Array(pp4*pp4*4);



            i = 0;
            while(i<pp4)
            {
                j = 0;
                while(j<pp4)
                {
                    pp1        = (i+j*pp4)*2;
                    pp0[pp1  ] = j*pp3;
                    pp0[pp1+1] = i*pp3;

                    pp2        = (i+j*pp4)*4;

                    pp6 = 1+stepSmoothCubed(abs(sin(t*0.25)));

                    var x  = -pp6*0.5+(j/pp4)*pp6,
                        y  = -pp6*0.5+(i/pp4)*pp6;

                    pp9[pp2 ]  = (this.sn.noise(cos(x+t),sin(y+t*0.25))+this.sn.noise(sin(x),sin(y)));
                    pp9[pp2+1 ]  = pp9[pp2 ];
                    pp9[pp2+2 ]  = pp9[pp2 ];
                    pp9[pp2+3 ]  = pp9[pp2 ];
                    pp6 = (i+j*pp7)*6;

                    pp8 = i+j*pp4;

                    if(i < pp4-1 && j < pp4-1)
                    {
                        pp5[pp6]   = pp5[pp6+3] = pp8;
                        pp5[pp6+1] = pp8 + 1;
                        pp5[pp6+2] = pp5[pp6+1] + pp4;
                        pp5[pp6+4] = pp8 + pp4;
                        pp5[pp6+5] = pp5[pp6+1] + pp4;
                    }


                    ++j;
                }
                ++i;
            }

            c.drawElements(pp0,pp5,pp9);
        }
        c.popMatrix();




        c.pushMatrix();
        {


            c.stroke(40);
            c.fill(0,0.25);
            c.setLineWidth(1.0);
            c.setModeRect(CanvasGL.CORNER);

            //c.fill(0,0.25);
            //c.rect(0,0, c.width, c.height);


            pp0 = rs/(10);
            pp1 = pp0 * 2 ;
            pp11 = rs + pp1;

            rs2 = floor(rs2);

            c.translate(rs2+0.5,floor(c.height*0.5-rs)+0.5);


            pp3 = [rs,pp1,
                   rs-pp1,0,
                   pp1,0,
                   0,pp1,
                   0,rs2-pp1,
                   pp1,rs2,
                   rs-pp1,rs2,
                   rs,rs2-pp1];

           pp2 = rs+pp1;

            c.stroke(40);
            c.noStroke();
            c.fill(0,0.75);



           // c.rect(0,0,rs2*5,rs2);

            c.setLineWidth(1);
            c.fill(0,0.5);
            c.noStroke();

            c.rect(0,0,rs,rs2);
            c.rect(pp0,pp0,rs - pp1 ,rs2-pp1);

            c.rect(rs+pp1,0,rs,rs2);
            c.rect(pp1+rs+pp0,pp0,rs - pp1 ,rs2-pp1);

            c.rect(pp2,0,rs,rs2);
            c.rect(pp2+pp0,pp0,rs - pp1 ,rs2-pp1);

            c.rect(pp2*2,0,rs,rs2);
            c.rect(pp2*2+pp0,pp0,rs - pp1 ,rs2-pp1);
            c.rect(pp2*3,0,rs,rs2);
            c.rect(pp2*3+pp0,pp0,rs - pp1 ,rs2-pp1);
            c.rect(pp2*4,0,rs,rs2);
            c.rect(pp2*4+pp0,pp0,rs - pp1 ,rs2-pp1);
            c.rect(pp2*5,0,rs,rs2);
            c.rect(pp2*5+pp0,pp0,rs - pp1 ,rs2-pp1);

            c.rect(pp2*6,0,rs,rs2);
            c.rect(pp2*6+pp0,pp0,rs - pp1 ,rs2-pp1);

            c.rect(pp2*7,0,rs,rs2);
            c.rect(pp2*7+pp0,pp0,rs - pp1 ,rs2-pp1);

            c.rect(pp2*7.25+pp0,0,rs*0.5,rs);
            c.rect(pp2*7.25+pp0*2,pp0,rs*0.5 - pp1 ,rs-pp1);
            c.rect(pp2*7.75+pp0*2,0,rs*0.5,rs);
            c.rect(pp2*7.75+pp0*3,pp0,rs*0.5 - pp1 ,rs-pp1);

           pp4 = [pp2+rs,rs2,
                  pp2+rs,pp1,
                  pp2+rs-pp1,0,
                  pp2+pp1,0,
                  pp2,pp1,
                  pp2,rs2,
                  pp2,rs,
                  pp2+rs,rs];

            pp2 = floor((pp11)*2);

            pp5 = [pp2,rs2,
                   pp2,0,
                   pp2,pp1,
                   pp2+pp1,0,
                   pp2+rs-pp1,0,
                   pp2+rs,pp1,
                   pp2+rs,rs2];

            pp2 = floor((pp11)*3);

            pp6 = [pp2,0,
                   pp2+rs*0.5,rs2,
                   pp2+rs,0];

            pp2 = floor((pp11)*4);

            pp7 = [pp2+rs,rs2,
                pp2+rs,pp1,
                pp2+rs-pp1,0,
                pp2+pp1,0,
                pp2,pp1,
                pp2,rs2,
                pp2,rs,
                pp2+rs,rs];

            pp2 = floor((pp11)*5);

            pp8 = [pp2+rs,pp1,
                pp2+rs-pp1,0,
                pp2+pp1,0,
                pp2,pp1,
                pp2,rs-pp1,
                pp2+pp1,rs,
                pp2+rs-pp1,rs,
                pp2+rs,rs+pp1,
                pp2+rs,rs2-pp1,
                pp2+rs-pp1,rs2,

                pp2+pp1,rs2,
                pp2,rs2-pp1


                ];

            pp2 = floor((pp11)*6);



            pp9 = [pp2+rs,pp1,
                    pp2+rs-pp1,0,
                    pp2+pp1,0,
                    pp2,pp1,
                pp2,rs2-pp1,
                pp2+pp1,rs2,
                pp2+rs-pp1,rs2,
                pp2+rs,rs2-pp1,
                pp2+rs,rs,
                pp2+rs*0.75,rs


            ];

            pp2 = floor((pp11)*7);

            pp10 = [
                pp2,0,
                pp2,rs2-pp1,
                pp2+pp1,rs2,
                pp2+rs-pp1,rs2,
                pp2+rs,rs2-pp1


            ];

            pp2 = floor(rs2*4.5);
            pp1*=0.75;

            pp14 = [
                pp2-pp1,rs-pp1,
                pp2,rs,
                pp2-pp1+rs*0.5-pp1,rs,
                pp2-pp1+rs*0.5,rs-pp1,
                pp2-pp1+rs*0.5,0
                   ];


            pp15 = [
                pp2+rs,pp1,
                pp2+rs-pp1,0,
                pp2+rs*0.5+pp1,0,
                pp2+rs*0.5,pp1,
                pp2+rs*0.5,rs*0.5-pp1,
                pp2+rs*0.5+pp1,rs*0.5,
                pp2+rs-pp1,rs*0.5,
                pp2+rs,rs*0.5+pp1,
                pp2+rs,rs-pp1,
                pp2+rs-pp1,rs,
                pp2+rs*0.5+pp1,rs,
                pp2+rs*0.5,rs-pp1



            ];



            c.setLineWidth(1);
            c.stroke(255);
            c.line(pp3);
            c.line(pp4);
            c.line(pp5);
            c.line(pp6);
            c.line(pp7);
            c.line(pp8);
            c.stroke(150);
            c.setLineWidth(1);
            c.line(pp9);
            c.line(pp10);

            c.line(pp14);
            c.line(pp15);





            c.noStroke();
            c.fill(255);

            pp13 = 2;

            i = 0;
            while(i < pp3.length)
            {
                c.circle(pp3[i],pp3[i+1],pp13);
                i+=2;
            }



            i = 0;
            while(i < pp4.length)
            {
                c.circle(pp4[i],pp4[i+1],pp13);
                i+=2;
            }

            i = 0;
            while(i < pp5.length)
            {
                c.circle(pp5[i],pp5[i+1],pp13);
                i+=2;
            }

            i = 0;
            while(i < pp6.length)
            {
                c.circle(pp6[i],pp6[i+1],pp13);
                i+=2;
            }

            i = 0;
            while(i < pp7.length)
            {
                c.circle(pp7[i],pp7[i+1],pp13);
                i+=2;
            }

            i = 0;
            while(i < pp8.length)
            {
                c.circle(pp8[i],pp8[i+1],pp13);
                i+=2;
            }

            c.fill(140,0,115);
            i = 0;
            while(i < pp9.length)
            {
                //c.circle(pp9[i],pp9[i+1],pp13);
                i+=2;
            }

            i = 0;
            while(i < pp10.length)
            {
                //c.circle(pp10[i],pp10[i+1],pp13);
                i+=2;
            }

            i = 0;
            while(i < pp14.length)
            {
                //c.circle(pp14[i],pp14[i+1],pp13);
                i+=2;
            }

            i = 0;
            while(i < pp15.length)
            {
                //c.circle(pp15[i],pp15[i+1],pp13);
                i+=2;
            }




        }
        c.popMatrix();




   }
    c.popMatrix();





};



