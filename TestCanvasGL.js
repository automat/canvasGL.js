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



    this.animationLoop();
}

TestCanvasGL.prototype.animationLoop = function()
{
    requestAnimationFrame(TestCanvasGL.prototype.animationLoop.bind(this));
    this.draw();

};

TestCanvasGL.prototype.draw = function()
{

    this.t+=0.05;

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

    var ox = 510,oy = 410, sxy = 2;
    var anchor0x = ox+150,anchor0y = oy,
        contrl0x = ox,contrl0y = oy,
        anchor1x = ox+150,anchor1y = oy+200+100*Math.abs(Math.cos(t)),
        contrl1x = ox,contrl1y = oy+200+100*Math.abs(Math.sin(t));



    c.setBezierDetail(140);
    c.bezier(anchor0x,anchor0y,contrl0x,contrl0y,anchor1x,anchor1y,contrl1x,contrl1y);

    c.stroke(255,102,0);
    c.line(anchor0x,anchor0y,contrl0x,contrl0y);
    c.line(anchor1x,anchor1y,contrl1x,contrl1y);






};

