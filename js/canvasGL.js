/**
 * Created with JetBrains WebStorm.
 * User: DEEV
 * Date: 27.12.12
 * Time: 09:37
 * To change this template use File | Settings | File Templates.
 */

CanvasGLOptions = {};
CanvasGLOptions.doLog = true;
CanvasGLOptions.RESOLUTION_CIRCLE = 20;

_InternalCanvasGLOptions = {};
_InternalCanvasGLOptions.DEFAULT_WIDTH  = 300;
_InternalCanvasGLOptions.DEFAULT_HEIGHT = 300;


function CanvasGL(parentDomElementId)
{
    this.parent = document.getElementById(parentDomElementId);
    this._size = {width: _InternalCanvasGLOptions.DEFAULT_WIDTH ,
                  height:_InternalCanvasGLOptions.DEFAULT_HEIGHT};

    this._glCanvas = document.createElement('canvas');
    this._glCanvas.style.position = 'absolute';
    this._glCanvas.style.left = '0px';
    this._glCanvas.style.top = '0px';


    var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
    this.gl = null;
    for(var i = 0; i < names.length;++i)
    {
        try
        {
            this.gl = this._glCanvas.getContext(names[i]);
        } catch (e){if(CanvasGLOptions.doLog)console.log("WebGL context could not be initialized");}
        if(this.gl){if(CanvasGLOptions.doLog)console.log("WebGL context initialized: "+names[i]);break;}
    }

    this._vertexShader   = this._loadShader("attribute vec2 a_position; uniform vec2 u_resolution;void main() {vec2 zeroToOne = a_position / u_resolution;vec2 zeroToTwo = zeroToOne * 2.0;vec2 clipSpace = zeroToTwo - 1.0;gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);}",this.gl.VERTEX_SHADER);
    this._fragmentShader = this._loadShader("precision mediump float;uniform vec4 u_color;void main(){gl_FragColor = u_color;}",this.gl.FRAGMENT_SHADER);
    this._program        = this._loadProgram();

    var gl = this.gl;

    gl.useProgram(this._program);

    this._positionLocation   = gl.getAttribLocation(this._program, "a_position");
    this._resolutionLocation = gl.getUniformLocation(this._program,"u_resolution");
    this._colorLocation      = gl.getUniformLocation(this._program,"u_color");

    this.setSize(_InternalCanvasGLOptions.DEFAULT_WIDTH,
                 _InternalCanvasGLOptions.DEFAULT_HEIGHT);

    this._vertexPostionBuffer = gl.createBuffer();
    this._vertexIndexBuffer   = gl.createBuffer();
    this._vertexColorBuffer   = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER,this._vertexPostionBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this._vertexIndexBuffer);


    gl.enableVertexAttribArray(this._positionLocation);
    gl.vertexAttribPointer(this._positionLocation,2,gl.FLOAT,false,0,0);

    this._matrixStack = [];


    this._pixelPerfect = false;

    this._fill        = true;
    this._stroke      = true;
    this._fillColor   = colorf(1.0,1.0);
    this._strokeColor = colorf(1.0,1.0);

    this.parent.appendChild(this._glCanvas);

}

CanvasGL.prototype.triangleMesh = function(vertices,indices)
{
    var gl = this.gl;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);

    if(this._fill)
    {
        this._applyFill();
        gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
    }
};


CanvasGL.prototype.push = function()
{

};

CanvasGL.prototype.pop = function()
{

};

CanvasGL.prototype.translate = function(x,y)
{

};

CanvasGL.prototype.scale = function(x,y)
{

};

CanvasGL.prototype.setPixelPerfect = function(bool)
{
    this._pixelPerfect = bool;
};

CanvasGL.prototype.line = function(x0,y0,x1,y1)
{
    if(!this._stroke)return;
    var gl  = this.gl;
    var arr =  [x0,y0,x1,y1];
    arr = this._pixelPerfect ? this._flooredArray(arr) : arr;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.STATIC_DRAW);
    this._applyStroke();
    gl.drawArrays(gl.LINES,0,2);
};

CanvasGL.prototype.lines = function(vertices)
{
    if(!this._stroke)return;
    var gl  = this.gl;
    var arr = this._pixelPerfect ? this._flooredArray(vertices) : vertices;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.STATIC_DRAW);
    this._applyStroke();
    gl.drawArrays(gl.LINE_STRIP,0,arr.length*0.5);
};

CanvasGL.prototype.point = function(x,y)
{
    if(!this._fill)return;
    var gl = this.gl;
    var arr =  [x,y];
    arr = this._pixelPerfect ? this._flooredArray(arr) : arr;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.STATIC_DRAW);
    this._applyFill();
    gl.drawArrays(gl.POINTS,0,1);
};

CanvasGL.prototype.points = function(vertices)
{
    if(!this._fill)return;
    var gl  = this.gl;
    var arr = this._pixelPerfect ? this._flooredArray(vertices) : vertices;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.STATIC_DRAW);
    this._applyFill();
    gl.drawArrays(gl.POINTS,0,arr.length*0.5);
};

CanvasGL.prototype.ellipse = function(x,y,radiusX,radiusY,resolution)
{
    var gl  = this.gl;
    var res = resolution || CanvasGLOptions.RESOLUTION_CIRCLE;
    var step = Math.PI / (res*2);
    var i = 0;

    var v = new Float32Array(res*2);

    while(i < v.length)
    {
        v[i]   = x + radiusX * Math.cos(step*(i*2));
        v[i+1] = y + radiusY * Math.sin(step*(i*2));
        i+=2;
    }

    var arr = this._pixelPerfect ? this._flooredArray(v) : v;

    gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);

    if(this._fill)
    {
        this._applyFill();
        gl.drawArrays(gl.TRIANGLE_FAN,0, arr.length*0.5);
    }

};

CanvasGL.prototype.circle = function(x,y,radius,resolution)
{
    this.ellipse(x,y,radius,radius,resolution);
};

CanvasGL.prototype.rect = function(x,y,width,height)
{
    var gl = this.gl;
    var xw = x+width,yh = y+height;
    var arr = [x,y,xw,y,x,yh,x,yh,xw,y,xw,yh];

    arr = this._pixelPerfect ? this._flooredArray(arr) : arr;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([x,y,xw,y,x,yh,x,yh,xw,y,xw,yh]),gl.STATIC_DRAW);

    if(this._fill)
    {
        this._applyFill();
        gl.drawArrays(gl.TRIANGLES,0,6);
    }
};
CanvasGL.prototype.noFill = function()
{
    this._fill = false;
};

CanvasGL.prototype.noStroke = function()
{
    this._stroke = false;
};

CanvasGL.prototype._applyStroke =function()
{
    var c = this._strokeColor;
    this.gl.uniform4f(this._colorLocation,c[0],c[1],c[2],c[3]);
};

CanvasGL.prototype._applyFill = function()
{
    var c = this._fillColor;
    this.gl.uniform4f(this._colorLocation,c[0],c[1],c[2],c[3]);
};

CanvasGL.prototype.stroke = function()
{
    this._strokeColor = colori.apply(this,arguments);
    this._stroke = true;
};

CanvasGL.prototype.fill = function()
{
    this._fillColor = colori.apply(this,arguments);
    this._fill = true;
};

CanvasGL.prototype.strokef = function()
{
    this._strokeColor = colorf.apply(this,arguments);
    this._stroke = true;
};

CanvasGL.prototype.fillf = function()
{
    this._fillColor = colorf.apply(this,arguments);
    this._fill = true;
};

CanvasGL.prototype.background = function()
{
    var gl = this.gl;
    var c  = colorf.apply(this,arguments);
    gl.clearColor(c[0],c[1],c[2],c[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
};

CanvasGL.prototype.setSize = function(width,height)
{
    this._size.width  = width;
    this._size.height = height;

    this._glCanvas.style.width = this._size.width + 'px';
    this._glCanvas.style.height = this._size.height + 'px';

    var styleWidth  = parseInt(this._glCanvas.style.width);
    var styleHeight = parseInt(this._glCanvas.style.height);

    this._glCanvas.width  = styleWidth;
    this._glCanvas.height = styleHeight;

    this.width = this._size.width;
    this.height = this._size.height;

    this.gl.uniform2f(this._resolutionLocation,this.width, this.height);
    this.gl.viewport(0,0,this.width,this.height);

};

CanvasGL.prototype._flooredArray = function(array)
{
    var a = new Array(array);
    var i = -1;
    while(++i < a.length)
    {
        a[i] = Math.floor(a[i]);
    }
    return a;
};

CanvasGL.prototype._loadShaderFromScript = function(shaderScriptId)
{
    var gl = this.gl;

    var script = document.getElementById(shaderScriptId),
        type   = script.type == "x-shader/x-vertex" ? gl.VERTEX_SHADER : script.type == "x-shader/x-fragment" ? gl.FRAGMENT_SHADER : null,
        source = script.text;

    return this._loadShader(source,type);
};

CanvasGL.prototype._loadShader = function(source,type)
{
    var gl = this.gl;
    var shader = gl.createShader(type);

    gl.shaderSource(shader,source);
    gl.compileShader(shader);

    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))
    {
        if(CanvasGLOptions.doLog)console.log("Could not compile shader.");
        gl.deleteShader(shader);
        shader = null;
    }

    return shader;
};

CanvasGL.prototype._loadProgram = function()
{
    var gl = this.gl;
    var program = gl.createProgram();
    gl.attachShader(program,this._vertexShader);
    gl.attachShader(program,this._fragmentShader);
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))
    {
        if(CanvasGLOptions.doLog)console.log("Could not link program.");
        gl.deleteProgram(program);
        program = null;
    }

    return program;
};

CanvasGL.prototype.saveToPNG = function()
{
    var canvas = window.open(this._glCanvas.toDataURL('image/png'));
};


function colori()
{
    var c = new Float32Array(4);

    c[3] = 1.0;

    switch (arguments.length)
    {
        case 0:
            c[0] = c[1] = c[2]  = 0.0;
            break;
        case 1:
            c[0] = c[1] = c[2]  = arguments[0]/255;
            break;
        case 2:
            c[0] = c[1] = c[2]  = arguments[0]/255;
            c[3] = arguments[1];
            break;
        case 3:
            c[0] = arguments[0]/255;
            c[1] = arguments[1]/255;
            c[2] = arguments[2]/255;
            break;
        case 4:
            c[0] = arguments[0]/255;
            c[1] = arguments[1]/255;
            c[2] = arguments[2]/255;
            c[3] = arguments[3]/255;
            break;
    }

    return c;
}



function colorf()
{
    var c = new Float32Array(4);

    c[3] = 1.0;

    switch (arguments.length)
    {
        case 0:
            c[0] = c[1] = c[2]  = 0.0;
            break;
        case 1:
            c[0] = c[1] = c[2]  = arguments[0];
            break;
        case 2:
            c[0] = c[1] = c[2]  = arguments[0];
            c[3] = arguments[1];
            break;
        case 3:
            c[0] = arguments[0];
            c[1] = arguments[1];
            c[2] = arguments[2];
            break;
        case 4:
            c[0] = arguments[0];
            c[1] = arguments[1];
            c[2] = arguments[2];
            c[3] = arguments[3];
            break;
    }

    return c;
}


