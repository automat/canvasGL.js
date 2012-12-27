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

    var c = this.c;

    c.background(0);
    c.fillf(1);
    c.rect(0,0, 200,100);
    c.fill(255,0,0);
    c.rect(0,100,100,100);
    c.fill(120);
    c.circle(150,150,50);
    c.fill(60);
    c.circle(150,250,50,10);
    c.fill(30);
    c.ellipse(150,350,10,50,10);
    c.line(200,100,300,200);
    c.lines([300,100,400,200,500,100]);

    c.fill(255);
    var i,j;
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

    var verticesA = [500,100,550,100,550,150,600,100];
    var indices  = [0,1,2,1,3,2];


    c.triangleMesh(verticesA,indices);

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

    var verticesB = [];

    a = 100;
    s = 300 / (a-1);
    i = -1;
    while(++i < a)
    {
        verticesA.push(200+i*s,350+Math.sin(i/(a+1)*5-this.t*2)*50);
        verticesB.push(200+i*s,350+Math.sin(i/(a+1)*5-this.t*2)*50);
        verticesB.push(200+i*s,400);
    }

    c.fill(255);
    c.lines(verticesB);
    c.points(verticesA);

    verticesA = [];

    a = 400;
    s = Math.PI / (a-1);
    i = -1;
    while(++i < a)
    {
        verticesA.push(350+150*Math.sin(i*0.25+this.t*0.25)*Math.cos(i*2*s+this.t*0.25),550+150*Math.sin(i*0.25+this.t*0.25)*Math.sin(i*2*s+this.t*0.25));
    }

    c.lines(verticesA);
    c.points(verticesA);






};

