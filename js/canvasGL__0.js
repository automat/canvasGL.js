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
_InternalCanvasGLOptions.BEZIER_DETAIL  = 20;

_InternalCanvasGLConstants = {};

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
            this.gl = this._glCanvas.getContext(names[i],{ antialias: true});
        } catch (e){if(CanvasGLOptions.doLog)console.log("WebGL context could not be initialized");}
        if(this.gl){if(CanvasGLOptions.doLog)console.log("WebGL context initialized: "+names[i]);break;}
    }

   // this._vertexShader   = this._loadShader("attribute vec2 a_position; uniform vec2 u_resolution;void main() {vec2 zeroToOne = a_position / u_resolution;vec2 zeroToTwo = zeroToOne * 2.0;vec2 clipSpace = zeroToTwo - 1.0;gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);}",this.gl.VERTEX_SHADER);
    this._vertexShader   = this._loadShader("uniform mat4 uMVMatrix; uniform mat4 uPMatrix;attribute vec2 a_position; uniform vec2 u_resolution;void main() {vec2 zeroToOne = a_position / u_resolution;vec2 zeroToTwo = zeroToOne * 2.0;vec2 clipSpace = zeroToTwo - 1.0;gl_Position = uPMatrix * uMVMatrix * vec4(clipSpace * vec2(1, -1), 0, 1);}",this.gl.VERTEX_SHADER);
    this._fragmentColorShader = this._loadShader("precision mediump float;uniform vec4 u_color;void main(){gl_FragColor = u_color;}",this.gl.FRAGMENT_SHADER);
    this._program        = this._loadProgram();

    var gl = this.gl;

    gl.useProgram(this._program);

    this._locationAttribPosition   = gl.getAttribLocation(this._program, "a_position");
    this._locationUniformResolution = gl.getUniformLocation(this._program,"u_resolution");
    this._locationUniformColor      = gl.getUniformLocation(this._program,"u_color");

    this.setSize(_InternalCanvasGLOptions.DEFAULT_WIDTH,
                 _InternalCanvasGLOptions.DEFAULT_HEIGHT);

    this._bufferVertexPosition = gl.createBuffer();
    this._bufferVertexIndex   = gl.createBuffer();
    this._bufferVertexTexCoord= gl.createBuffer();
    this._bufferVertexColor   = gl.createBuffer();

    this._pUniform  = gl.getUniformLocation(this._program,"uPMatrix");
    this._mvUniform = gl.getUniformLocation(this._program,"uMVMatrix");
    this._mvMatrix = _makeMat44();

    gl.uniformMatrix4fv(this._pUniform,false, new Float32Array(_makeMat44()));
    gl.uniformMatrix4fv(this._mvUniform,false,new Float32Array(this._mvMatrix));



    gl.bindBuffer(gl.ARRAY_BUFFER,this._bufferVertexPosition);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this._bufferVertexIndex);


    gl.enableVertexAttribArray(this._locationAttribPosition);
    gl.vertexAttribPointer(this._locationAttribPosition,2,gl.FLOAT,false,0,0);

    this._matrixStack = [];

    this._pixelPerfect = false;

    this._fill        = true;
    this._stroke      = true;
    this._fillColor   = colorf(1.0,1.0);
    this._strokeColor = colorf(1.0,1.0);

    this.parent.appendChild(this._glCanvas);

}

CanvasGL.prototype._setMvMatrixUniform = function()
{
    this.gl.uniformMatrix4fv(this._mvUniform,false,new Float32Array(this._mvMatrix));
};

CanvasGL.prototype._loadIdentity = function()
{
    _mat44Identity(this._mvMatrix);
};

CanvasGL.prototype._multMatrix = function(m)
{
    this._mvMatrix = _makeMat44Mult(this._mvMatrix,m);


};

CanvasGL.prototype.push = function()
{

};

CanvasGL.prototype.pop = function()
{

};

CanvasGL.prototype.translate = function(x,y)
{
    this._multMatrix(_makeMat44Translate(x,y));
};

CanvasGL.prototype.scale = function(x,y)
{

};

CanvasGL.prototype.rotate = function()
{

};



CanvasGL.prototype.triangleMesh = function(vertices,indices)
{
    var gl = this.gl;
    var ind = new Uint16Array(indices || this._indicesLinearCW(vertices));

    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,ind,gl.STATIC_DRAW);

    if(this._fill)
    {
        this._applyFill();
        gl.drawElements(gl.TRIANGLES,ind.length,gl.UNSIGNED_SHORT,0);
    }
};






CanvasGL.prototype.line = function(x0,y0,x1,y1)
{
    if(!this._stroke)return;
    var gl  = this.gl;
    var arr =  [x0,y0,x1,y1];
    arr = this._pixelPerfect ? this._flooredArray(arr) : arr;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.DYNAMIC_DRAW);
    this._applyStroke();
    gl.drawArrays(gl.LINES,0,2);
};

CanvasGL.prototype.lines = function(vertices)
{
    if(!this._stroke)return;
    var gl  = this.gl;
    var arr = this._pixelPerfect ? this._flooredArray(vertices) : vertices;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.DYNAMIC_DRAW);
    this._applyStroke();
    gl.drawArrays(gl.LINE_STRIP,0,arr.length*0.5);
};

CanvasGL.prototype.point = function(x,y)
{
    if(!this._fill)return;
    var gl = this.gl;
    var arr =  [x,y];
    arr = this._pixelPerfect ? this._flooredArray(arr) : arr;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.DYNAMIC_DRAW);
    this._applyFill();
    gl.drawArrays(gl.POINTS,0,1);
};

CanvasGL.prototype.points = function(vertices)
{
    if(!this._fill)return;
    var gl  = this.gl;
    var arr = this._pixelPerfect ? this._flooredArray(vertices) : vertices;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.DYNAMIC_DRAW);
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

    gl.bufferData(gl.ARRAY_BUFFER,arr,gl.DYNAMIC_DRAW);

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

CanvasGL.prototype.quad = function(x0,y0,x1,y1,x2,y2,x3,y3)
{
    var gl = this.gl;
    var arr = [x0,y0,x1,y1,x3,y3,x1,y1,x2,y2,x3,y3];
    arr = this._pixelPerfect ? this._flooredArray(arr) : arr;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.DYNAMIC_DRAW);

    if(this._fill)
    {
        this._applyFill();
        gl.drawArrays(gl.TRIANGLES,0,6);
    }
};

CanvasGL.prototype.triangle = function(x0,y0,x1,y1,x2,y2)
{
    var gl = this.gl;
    var arr = [x0,y0,x1,y1,x2,y2];
    arr = this._pixelPerfect ? this._flooredArray(arr) : arr;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.DYNAMIC_DRAW);

    if(this._fill)
    {
        this._applyFill();
        gl.drawArrays(gl.TRIANGLES,0,3);
    }
};

CanvasGL.prototype.setBezierDetail = function(detail)
{
    _InternalCanvasGLOptions.BEZIER_DETAIL = detail;
};

CanvasGL.prototype.bezier = function(x0,y0,x1,y1,x2,y2,x3,y3)
{
    var d = _InternalCanvasGLOptions.BEZIER_DETAIL;

    var i = -1;
    var t,nt,nt3,nt2,t3,t2;

    var vertices = new Array(d);

    while(++i < d)
    {
        t   = i / (d-1);
        nt  = 1 - t;
        nt3 = Math.pow(nt,3);
        nt2 = Math.pow(nt,2);
        t3  = Math.pow(t,3);
        t2  = Math.pow(t,2);

        vertices.push(nt3*x0+3*nt2*t*x1+3*nt*t2*x2+t3*x3,
                      nt3*y0+3*nt2*t*y1+3*nt*t2*y2+t3*y3);

    }

    this.lines(vertices);
};

CanvasGL.prototype.bezierPoint = function(a,b,c,d,t)
{

};

CanvasGL.prototype.loadImage = function(path,callback)
{
    var image = new Image();
    image.onload = function(){callback();};
    image.src = path;

    return image;
};

CanvasGL.prototype.texture = function(img)
{
    var gl = this.gl;
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);

};

CanvasGL.prototype.image = function(img,x,y,width,height)
{

};

CanvasGL.prototype.rect = function(x,y,width,height)
{
    var xw = x+width,yh = y+height;
    this.quad(x,y,xw,y,xw,yh,x,yh);
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
    this.gl.uniform4f(this._locationUniformColor,c[0],c[1],c[2],c[3]);
};

CanvasGL.prototype._applyFill = function()
{
    var c = this._fillColor;
    this.gl.uniform4f(this._locationUniformColor,c[0],c[1],c[2],c[3]);
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

    this.gl.uniform2f(this._locationUniformResolution,this.width, this.height);
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

CanvasGL.prototype._indexSortedVertices = function(vertices,indices)
{


};

CanvasGL.prototype._indicesLinearCW = function(vertices)
{
    var a = new Array((vertices.length/2-2)*3);
    var i = 0;
    while(i < a.length)
    {
        if(i%2==0){a[i]=i/3;a[i+1]=i/3+2;a[i+2]=i/3+1;}
        else{a[i]=a[i-2];a[i+1]=a[i-2]+1;a[i+2]=a[i-1];}
        i+=3;
    }

    return a;
};

CanvasGL.prototype._indicesLinearCCW = function(vertices)
{
    var a = new Array((vertices.length/2-2)*3);
    var i = 0;
    while(i < a.length)
    {
        if(i%2==0){a[i]=i/3;a[i+1]=i/3+1;a[i+2]=i/3+2;}
        else{a[i]=a[i-1];a[i+1]=a[i-2];a[i+2]=a[i-1]+1;}
        i+=3;
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
    gl.attachShader(program,this._fragmentColorShader);
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))
    {
        if(CanvasGLOptions.doLog)console.log("Could not link program.");
        gl.deleteProgram(program);
        program = null;
    }

    return program;
};

CanvasGL.prototype.setPixelPerfect = function(bool)
{
    this._pixelPerfect = bool;
};

CanvasGL.prototype.saveToPNG = function()
{
    var canvas = window.open(this._glCanvas.toDataURL('image/png'));
};

//  0  1  2  3
//  4  5  6  7
//  8  9 10 11
// 12 13 14 15

function _makeMat44()
{
    return [ 1, 0, 0, 0,
             0, 1, 0, 0,
             0, 0, 1, 0,
             0, 0, 0, 1 ];
}

function _makeMat44Translate(x,y)
{
    return _mat44Translate(_makeMat44(),x,y);
}

function _makeMat44Scale(x,y)
{
    return _mat44Scale(_makeMat44(),x,y);
}

function _makeMat44Mult(m0,m1)
{
    return _mat44Mult(_makeMat44(),m0,m1);
}

function _mat44Mult(m,m0,m1)
{
    var d = m;

    var a00 = m0[ 0], a01 = m0[ 1], a02 = m0[ 2], a03 = m0[3];
    var a10 = m0[ 4], a11 = m0[ 5], a12 = m0[ 6], a13 = m0[7];
    var a20 = m0[ 8], a21 = m0[ 9], a22 = m0[10], a23 = m0[11];
    var a30 = m0[12], a31 = m0[13], a32 = m0[14], a33 = m0[15];

    var b0  = m1[0], b1 = m1[1], b2 = m1[2], b3 = m1[3];
    d[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    d[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    d[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    d[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = m1[4];
    b1 = m1[5];
    b2 = m1[6];
    b3 = m1[7];
    d[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    d[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    d[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    d[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = m1[8];
    b1 = m1[9];
    b2 = m1[10];
    b3 = m1[11];
    d[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    d[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    d[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    d[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = m1[12];
    b1 = m1[13];
    b2 = m1[14];
    b3 = m1[15];
    d[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    d[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    d[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    d[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    return d;
}

function _mat44Translate(m,x,y)
{
    m[12] = m[ 0] * x + m[ 4] * y + m[12];
    m[13] = m[ 1] * x + m[ 5] * y + m[13];
    m[14] = m[ 2] * x + m[ 6] * y + m[14];
    m[15] = m[ 3] * x + m[ 7] * y + m[15];

    return m;
}


function _mat44Scale(m,x,y)
{
    m[0] *= x;
    m[1] *= x;
    m[2] *= x;
    m[3] *= x;
    m[4] *= y;
    m[5] *= y;
    m[6] *= y;
    m[7] *= y;
    m[8]  = 0;
    m[9]  = 0;
    m[10] = 0;
    m[11] = 0;

    return m;
}

function _mat44Identity(m)
{
   m[ 0] = 1; m[ 1] = m[ 2] = m[ 3] = 0;
   m[ 5] = 1; m[ 4] = m[ 6] = m[ 7] = 0;
   m[10] = 1; m[ 8] = m[ 9] = m[11] = 0;
   m[15] = 1; m[12] = m[13] = m[14] = 0;

    return m;
}



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


