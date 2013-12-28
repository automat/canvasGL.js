function App(element){
    CanvasGL.call(this,element);
    this.setSize(window.innerWidth,window.innerHeight);

    var self = this;
    window.addEventListener('resize',function(){
        self.setSize(window.innerWidth,window.innerHeight);
    });

}

App.prototype = Object.create(CanvasGL.prototype);

App.prototype.draw = function(){
    var c = this;
    var time   = c.getSecondsElapsed();
    var PI_4 = Math.PI * 0.25;
    var width  = c.getWidth(),
        height = c.getHeight();



    c.backgroundfv(0.15,0,0.15);
    c.setDetailCircle(20);

    c.translate(width * 0.5, height * 0.5);
    c.rotate(time);


    c.noStroke();
    c.fill3f(1,0,1);


    var i = -1;
    var l = Math.floor((Math.sin(time*0.0025) * 0.5 + 0.5) * 3000);
    var s = Math.PI * 2 / l;
    var si;
    var r = 300;
    var ri;

    var strokeColor = [1,1,1,1,
                       0.35,0,0.75,0];



    while(++i < l){
        si = s * i;
        ri = Math.sin(si * 32 ) * r;
        c.pushMatrix();
        c.translate(ri * 0.5 + Math.cos(si) * ri ,
                    ri * 0.5 + Math.sin(si) * ri);
        //c.rect(0,0,10,10);
        c.rotate(time + si );
        c.setLineWidth((Math.sin(si * 128) * 0.5 + 0.5) * 50);
        //c.circle(0,0,(Math.sin(si * 128) * 0.5 + 0.5) * 25);
        c.strokefv(strokeColor);
        c.line(0,0,100,0);
        c.noStroke();
        c.popMatrix();
    }

};

window.addEventListener("load",function(){
   var app = new App(document.getElementById("container"));
});
