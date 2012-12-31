/**
 * Created with JetBrains WebStorm.
 * User: DEEV
 * Date: 27.12.12
 * Time: 09:49
 * To change this template use File | Settings | File Templates.
 */

function TestCanvasGL(parentDomElementId)
{
    CanvasGLOptions.doLog = false;
    this.c = new CanvasGL(parentDomElementId);
    this.c.setSize(window.innerWidth,window.innerHeight);
    this.t = 0.0;

    this.tex = null;
    var t = this.tex;
    var c = this.c;

    this.texImage = new Image();
    this.texImage.onload = this.onTexturesLoaded();
    this.texImage.src = "tex00.jpg";








}

TestCanvasGL.prototype.onTexturesLoaded = function()
{
    var c = this.c;

    this.animationLoop();

};

TestCanvasGL.prototype.animationLoop = function()
{
    requestAnimationFrame(TestCanvasGL.prototype.animationLoop.bind(this));
    this.draw();

};

TestCanvasGL.prototype.draw = function()
{

    var sin   = Math.sin,
        cos   = Math.cos,
        PI    = Math.PI,
        floor = Math.floor,
        round = Math.round,
        abs   = Math.abs,
        SIZE_OF_VERTEX = 2;


    this.t+=0.05;
    var t = this.t,
        c = this.c;

    c.background(10);
    c.noStroke();
    c.noFill();

    var i,j;
    var rs = 100;
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
            c.fill(255);
            c.rect(0,0,rs*2,rs);
        }
        c.popMatrix();
        c.pushMatrix();
        {
            c.translate(rs*2,0);
            pa = 1+floor(19*abs(sin(t*0.025)));
            ps = rs*2/pa;
            i = -1;
            while(++i < pa)
            {
                c.fill(255-i/pa*255);
                c.rect(i*ps,0,ps,rs);
            }
        }
        c.popMatrix();
        c.pushMatrix();
        {
            c.translate(rs*4,0);
            c.fill(150,0,0);
            c.triangleMesh([0,0,rs,0,rs,rs,0,rs],[0,1,3,1,2,3]);
        }
        c.popMatrix();
        c.pushMatrix();
        {
            c.translate(rs*5+rs*0.5,rs*0.5);
            c.rotate(t*0.5);
            c.fill(100+floor(155*abs(sin(t))));
            c.ellipse(0,0,rs*0.25 + rs*0.25*abs(sin(t)),rs*0.5-rs*0.25*abs(sin(t)),3+floor(27*abs(sin(t*0.25))));
        }
        c.popMatrix();
        c.pushMatrix();
        {
            c.translate(0,rs);
            c.stroke(100,0,0);

            pa = 100;
            ps = (rs*4)/(pa-1);

            verticesA = [];
            verticesB = [];

            pp1 = 1+2*abs(sin(t*0.05));



            c.noStroke();
            i = -1;
            while(++i < pa)
            {
                pp0 = i/(pa)*PI-t;

                if(i < pa*0.5+2)
                {
                    verticesA.push(i*ps,rs*0.5 + rs*0.5*sin(pp0*pp1),i*ps,rs);
                    verticesB.push(i*ps,rs*0.5 + rs*0.5*sin(pp0*pp1));

                }else if((i > pa*0.5) && i % 2 == 0)
                {
                    c.fill(255);
                    c.rect(i*ps,rs,3,-(rs*0.5 - ((rs*0.5)*sin(pp0*pp1))));
                }





            }

            i = 0;


            c.fill(100,0,0);
            c.triangleMesh(verticesA);
            c.fill(255);
            c.points(verticesB);
        }
        c.popMatrix();

        c.pushMatrix();
        {
            c.translate(rs*4+6,rs+6);

            pp0 = abs(sin(t*0.25));
            pp3 = abs(sin(t*0.5));
            pp4 = abs(sin(t*0.05));

            var anchor0 = [(rs*4-6)-(rs*4-6)*pp4,pp3*(rs-12)],
                anchor1 = [(rs*4-6)*pp4,(rs-12)-pp3*(rs-12)];

            var cntrl0 = [(rs*4-6)-(rs*4-6)*pp0,0],
                cntrl1 = [(rs*4-6)*pp0,rs-12];

            c.stroke(80);
            c.line(anchor0[0],anchor0[1],cntrl0[0],cntrl0[1]);
            c.line(anchor1[0],anchor1[1],cntrl1[0],cntrl1[1]);

            c.noStroke();
            c.fill(80);
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

            pp1 = floor(30*abs(sin(t*0.025)));

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
            c.translate(0,rs*2+6);
            c.stroke(100,0,0);

            pa = 5+floor(abs(sin(t*0.05))*25);
            ps = (rs*8)/(pa-1);

            verticesA = [];
            verticesB = [];

            pp0 = 4 * abs(sin(t*0.05));
            pp1 = rs*0.5;

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

            //c.points(verticesA);
            //c.points(verticesB);

        }
        c.popMatrix();

        c.pushMatrix();
        {
            c.translate(rs,rs*4);

            pp0 = abs(sin(t));
            pp1 = abs(sin(t*0.5));

            c.fill(255);
            c.circle(rs,rs,rs-1,rs-1,100);

            c.fill(0);
            c.arc(rs,rs,rs*0.75+rs*0.25*pp1,rs*0.75+rs*0.25*pp1,0,(PI-PI*0.25)*pp1,100);
            c.fill(100,0,0);
            c.arc(rs,rs,rs*0.5+rs*0.5*pp1,rs*0.5+rs*0.5*pp1,0,pp1*-PI*0.25,100);


        }
        c.popMatrix();

    }
    c.popMatrix();





    /*

    var t = this.t;

    var c = this.c;

    c.background(0);
    c.fillf(1);
    c.rect(0,0, 200,100);
    c.fill(150,0,0);
    c.rect(0,100,100,100);

    c.fill(200,0,0);

    //0----2----4
    //|  / |  / |
    //| /  | /  |
    //1----3----5

    c.stroke(255);
    var i,j;
    var verticesA = [0,200,0,300,100,200,100,300,0,200,0,300,100,200,100,300];
    c.triangleMesh([0,200,0,300,100,200,100,300]);




    c.fill(120);
    c.circle(150,150,50);
    c.fill(60);
    c.circle(150,250,50,10);
    c.fill(30);
    c.ellipse(150,350,10,50,10);
    c.line(200,100,300,200);
    c.lines([300,100,400,200,500,100]);

    c.fill(255);

    i = -1;
    var a = 30;
    var s = 300 / (a-1);
    while(++i < a)
    {
        j = -1;
        while(++j < a)
        {
            c.point(Math.floor(500+s*i)+0.5,Math.floor(100+s*j)+0.5);
        }
    }

    c.stroke(255,0,0);
    c.fill(255);

    verticesA = [500,100,550,100,550,150,600,100];
    indices  = [0,1,2,1,3,2];


    //c.triangleMesh(verticesA,indices);

    verticesA = [];

    a = 40;
    s = 300 / (a-1);
    i = -1;
    while(++i < a)
    {
        verticesA.push(200+i*s,250+Math.sin(i/(a+1)*20+this.t)*50);
    }

    c.stroke(150,0,0);
    c.lines(verticesA);
    c.fill(255);
    c.points(verticesA);

    indices = [];
    var verticesB = [];

    a = 100;
    s = 300 / (a-1);
    i = -1;
    while(++i < a)
    {
        verticesA.push(200+i*s,350+Math.sin(i/(a+1)*5-this.t*2)*50);

        verticesB.push(200+i*s,350+Math.sin(i/(a+1)*5-this.t*2)*50,200+i*s,400);

    }





    c.fill(100,0,0);
    c.triangleMesh(verticesB);
    c.fill(255);
    c.points(verticesA);


    verticesA = [];

    a = 5 + 100 * Math.abs(Math.sin(t*0.05));
    s = Math.PI / (a-1);
    i = -1;

    var R, r,k;



    r = 11.5;
    k = 2+Math.floor(10*Math.abs(Math.sin(t*0.5)));
    R = k*r;


    var e, f, g,h;
    var x,y;

    while(++i < a)
    {


        x = 350+(R + r)*Math.cos(s*i*2+t)-(r*Math.cos(((R+r)/r)*(s*i*2+t)));
        y = 550+(R + r)*Math.sin(s*i*2+t)-(r*Math.sin(((R+r)/r)*(s*i*2+t)));

        verticesA.push(x,y);
    }

    c.lines(verticesA);
    c.points(verticesA);


    c.stroke(255);

    var ox = 0,oy = 0, sxy = 2;
    var anchor0x = ox+150,anchor0y = oy,
        contrl0x = ox,contrl0y = oy,
        anchor1x = ox+150,anchor1y = oy+200+100*Math.abs(Math.cos(t)),
        contrl1x = ox,contrl1y = oy+200+100*Math.abs(Math.sin(t));



    c.setBezierDetail(140);


    c.pushMatrix();
    c.translate(510,410);

    c.bezier(anchor0x,anchor0y,contrl0x,contrl0y,anchor1x,anchor1y,contrl1x,contrl1y);

    c.stroke(255,102,0);
    c.line(anchor0x,anchor0y,contrl0x,contrl0y);
    c.line(anchor1x,anchor1y,contrl1x,contrl1y);
    c.popMatrix();
    */






};

