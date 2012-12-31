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


    this._vertexShader   = this._loadShader(
                                            "uniform mat4 transformMatrix;" +
                                            "attribute vec2 a_position; " +
                                            "uniform vec2 u_resolution;" +
                                            "void main()" +
                                            "{" +
                                                "vec2 transedPos = vec2(transformMatrix * vec4(a_position.xy,0,1)).xy;"+
                                                "vec2 zeroToOne = transedPos / u_resolution;" +
                                                "vec2 zeroToTwo = zeroToOne * 2.0;" +
                                                "vec2 clipSpace = (zeroToTwo - 1.0);" +
                                                "vec4 resultPos = vec4(clipSpace,0,1) * vec4(1,-1,1,1);" +
                                                "gl_Position = resultPos;" +
                                            "}",this.gl.VERTEX_SHADER);

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
    this._vertexTexCoordBuffer= gl.createBuffer();
    this._vertexColorBuffer   = gl.createBuffer();


    this._tmUniform = gl.getUniformLocation(this._program,"transformMatrix");
    this._tMatrix  = this.__makeMat44();
    this._tMatrixStack = [];

    gl.uniformMatrix4fv(this._tmUniform,false,new Float32Array(this._tMatrix));

    gl.bindBuffer(gl.ARRAY_BUFFER,this._vertexPostionBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this._vertexIndexBuffer);

    gl.enableVertexAttribArray(this._positionLocation);
    gl.vertexAttribPointer(this._positionLocation,2,gl.FLOAT,false,0,0);

    //gl.enable(gl.BLEND);
    //gl.blendFunc(gl.SRC_ALPHA, gl.ONE);



    this._pixelPerfect = false;


    this._ellipseMode = CanvasGL.CENTER;
    this._rectMode    = CanvasGL.CORNER;
    this._fill        = true;
    this._stroke      = true;
    this._fillColor   = colorf(1.0,1.0);
    this._strokeColor = colorf(1.0,1.0);

    this.parent.appendChild(this._glCanvas);
}

CanvasGL.CENTER = "CENTER";
CanvasGL.CORNER = "CORNER";

CanvasGL.prototype.setLineWidth = function(value)
{
    this.gl.lineWidth = value;
};

CanvasGL.prototype.setBezierDetail = function(detail)
{
    _InternalCanvasGLOptions.BEZIER_DETAIL = detail;
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

CanvasGL.prototype.line = function(x0,y0,x1,y1)
{
    if(!this._stroke)return;
    var gl  = this.gl;
    var arr =  [x0,y0,x1,y1];
    arr = this._pixelPerfect ? this._flooredArray(arr) : arr;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.DYNAMIC_DRAW);
    this._applyStroke();
    this._setMvMatrixUniform();
    gl.drawArrays(gl.LINES,0,2);
};

CanvasGL.prototype.lines = function(vertices)
{
    if(!this._stroke)return;
    var gl  = this.gl;
    var arr = this._pixelPerfect ? this._flooredArray(vertices) : vertices;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.DYNAMIC_DRAW);
    this._applyStroke();
    this._setMvMatrixUniform();
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
    this._setMvMatrixUniform();
    gl.drawArrays(gl.POINTS,0,1);
};

CanvasGL.prototype.points = function(vertices)
{
    if(!this._fill)return;
    var gl  = this.gl;
    var arr = this._pixelPerfect ? this._flooredArray(vertices) : vertices;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.DYNAMIC_DRAW);
    this._applyFill();
    this._setMvMatrixUniform();
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
        this._setMvMatrixUniform();
        gl.drawArrays(gl.TRIANGLE_FAN,0, arr.length*0.5);
    }

};

CanvasGL.prototype.arc = function(centerX,centerY,radiusX,radiusY,startAngle,stopAngle,resolution)
{
    var gl  = this.gl;
    var res = resolution || CanvasGLOptions.RESOLUTION_CIRCLE;
    var step = (stopAngle - startAngle)/(res-2);
    var i = 0;

    var indices = [];
    var v = new Float32Array(res*2);

    while(i < v.length)
    {
        v[i]   = centerX + radiusX * Math.cos(startAngle+step*(i));
        v[i+1] = centerY+ radiusY * Math.sin(startAngle+step*(i));
        v[i+2]   = centerX;
        v[i+3] = centerY;
        i+=4;
    }

    var arr = this._pixelPerfect ? this._flooredArray(v) : v;

    gl.bufferData(gl.ARRAY_BUFFER,arr,gl.DYNAMIC_DRAW);

    if(this._fill)
    {
        this._applyFill();
        this._setMvMatrixUniform();
        gl.drawArrays(gl.TRIANGLE_STRIP,0, arr.length/2);
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
        this._setMvMatrixUniform();
        gl.drawArrays(gl.TRIANGLES,0,6);
    }

    if(this._stroke)
    {
        this._applyStroke();
        this._setMvMatrixUniform();
        gl.drawArrays(gl.LINE_LOOP,0,4);
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
        this._setMvMatrixUniform();
        gl.drawArrays(gl.TRIANGLES,0,3);
    }
};



CanvasGL.prototype.bezier = function(x0,y0,x1,y1,x2,y2,x3,y3)
{
    var d = _InternalCanvasGLOptions.BEZIER_DETAIL;

    this._bezierAnchor0x = x0;
    this._bezierAnchor0y = y0;
    this._bezierAnchor1x = x2;
    this._bezierAnchor1y = y2;
    this._bezierContrl0x = x1;
    this._bezierContrl0y = y1;
    this._bezierContrl1x = x3;
    this._bezierContrl1y = y3;


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

CanvasGL.prototype.bezierPoint = function(d)
{

    var nt  = 1 - d;
    var nt3 = Math.pow(nt,3);
    var nt2 = Math.pow(nt,2);
    var t3  = Math.pow(d,3);
    var t2  = Math.pow(d,2);

    var x0 = this._bezierAnchor0x;
    var y0 = this._bezierAnchor0y;
    var x2 = this._bezierAnchor1x;
    var y2 = this._bezierAnchor1y;
    var x1 = this._bezierContrl0x;
    var y1 = this._bezierContrl0y;
    var x3 = this._bezierContrl1x;
    var y3 = this._bezierContrl1y;

    return [nt3*x0+3*nt2*d*x1+3*nt*t2*x2+t3*x3,
            nt3*y0+3*nt2*d*y1+3*nt*t2*y2+t3*y3];

};

CanvasGL.prototype.loadImage = function(path,callback)
{
    var image = new Image();
    //image.onload = function(){callback.bind(this);};
    image.src = path;

    return image;
};

CanvasGL.prototype.loadTexture = function(img)
{
    console.log(img);
    /*
    var gl = this.gl;
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.bindTexture(gl.TEXTURE_2D, null);
    */

    return null;



};

CanvasGL.prototype.texture = function(tex)
{

    var gl = this.gl;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,tex);

    console.log(tex);


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
    var c  = colori.apply(this,arguments);
    gl.clearColor(c[0],c[1],c[2],c[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this._loadIdentity();
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

CanvasGL.prototype._setMvMatrixUniform = function()
{
    this.gl.uniformMatrix4fv(this._tmUniform,false,new Float32Array(this._tMatrix));
};

CanvasGL.prototype._loadIdentity = function()
{
    this.__mat44Identity(this._tMatrix);
};

CanvasGL.prototype.translate = function(x,y)
{
    this._tMatrix = this.__mat44MultPost(this._tMatrix,this.__makeMat44Translate(x,y));
};

CanvasGL.prototype.scale = function(x,y)
{
    this._tMatrix = this.__mat44MultPost(this._tMatrix,this.__makeMat44Scale(x,y));
};

CanvasGL.prototype.rotate = function(a)
{
    this._tMatrix = this.__mat44MultPost(this._tMatrix,this.__makeMat44RotationZ(a));
};

CanvasGL.prototype.pushMatrix = function()
{
    this._tMatrixStack.push(this.__makeMat44Copy(this._tMatrix));
};

CanvasGL.prototype.popMatrix = function()
{
    var stack = this._tMatrixStack;

    if(stack.length == 0)
    {
        throw "Invalid pop!";
    }

    this._tMatrix = stack.pop();

    return this._tMatrix;

};

// SX  0  0  0
//  0 SY  0  0
//  0  0 SZ  0
// TX TY TZ  1

CanvasGL.prototype.__makeMat44 = function()
{
    return [ 1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1 ];
};

CanvasGL.prototype.__mat44Identity = function(m)
{
    m[ 0] = 1; m[ 1] = m[ 2] = m[ 3] = 0;
    m[ 5] = 1; m[ 4] = m[ 6] = m[ 7] = 0;
    m[10] = 1; m[ 8] = m[ 9] = m[11] = 0;
    m[15] = 1; m[12] = m[13] = m[14] = 0;

    return m;
};

CanvasGL.prototype.__makeMat44Scale = function(x,y)
{
    var  m = this.__makeMat44();

    m[0] = x;
    m[5] = y;

    return m;

};

CanvasGL.prototype.__makeMat44Translate = function(x,y)
{
    var m = this.__makeMat44();

    m[12] = x;
    m[13] = y;

    return m;
};

CanvasGL.prototype.__makeMat44RotationZ = function(a)
{
    var m = this.__makeMat44();

    var sin = Math.sin(a),
        cos = Math.cos(a);

    m[0] = cos;
    m[1] = sin;
    m[4] = -sin;
    m[5] = cos;

    return m;
};

CanvasGL.prototype.__makeMat44Copy = function(m)
{
    var d = this.__makeMat44();

    d[ 0] = m[ 0];d[ 1] = m[ 1];d[ 2] = m[ 2];d[ 3] = m[ 3];
    d[ 4] = m[ 4];d[ 5] = m[ 5];d[ 6] = m[ 6];d[ 7] = m[ 7];
    d[ 8] = m[ 8];d[ 9] = m[ 9];d[10] = m[10];d[11] = m[11];
    d[12] = m[12];d[13] = m[13];d[14] = m[14];d[15] = m[15];

    return d;
};

CanvasGL.prototype.__mat44MultPre = function(mat0,mat1)
{
    var m = this.__makeMat44();

    var m1 = mat0[ 0],m2 = mat0[ 1],m3 = mat0[ 2],m4 = mat0[ 3],
        m5 = mat0[ 4],m6 = mat0[ 5],m7 = mat0[ 6],m8 = mat0[ 7],
        m9 = mat0[ 8],m10 = mat0[ 9],m11 = mat0[10],m12 = mat0[11],
        m13 = mat0[12],m14 = mat0[13],m15 = mat0[14],m16 = mat0[15];

    var mA = mat1[ 0],mB = mat1[ 1],mC = mat1[ 2],mD = mat1[ 3],
        mE = mat1[ 4],mF = mat1[ 5],mG = mat1[ 6],mH = mat1[ 7],
        mI = mat1[ 8],mJ = mat1[ 9],mK = mat1[10],mL = mat1[11],
        mM = mat1[12],mN = mat1[13],mO = mat1[14],mP = mat1[15];

    m[ 0] = m1*mA + m2*mE + m3*mI + m4*mM;
    m[ 1] = m1*mB + m2*mF + m3*mJ + m4*mN;
    m[ 2] = m1*mC + m2*mG + m3*mK + m4*mO;
    m[ 3] = m1*mD + m2*mH + m3*mL + m4*mP;

    m[ 4] = m5*mA + m6*mE + m7*mI + m8*mM;
    m[ 5] = m5*mB + m6*mF + m7*mJ + m8*mN;
    m[ 6] = m5*mC + m6*mG + m7*mK + m8*mO;
    m[ 7] = m5*mD + m6*mH + m7*mL + m8*mP;

    m[ 8] = m9*mA + m10*mE + m11*mI + m12*mM;
    m[ 9] = m9*mB + m10*mF + m11*mJ + m12*mN;
    m[10] = m9*mC + m10*mG + m11*mK + m12*mO;
    m[11] = m9*mD + m10*mH + m11*mL + m12*mP;

    m[12] = m13*mA + m14*mE + m15*mI + m16*mM;
    m[13] = m13*mB + m14*mF + m15*mJ + m16*mN;
    m[14] = m13*mC + m14*mG + m15*mK + m16*mO;
    m[15] = m13*mD + m14*mH + m15*mL + m16*mP;

    return m;
};

CanvasGL.prototype.__mat44MultPost = function(mat0,mat1)
{
    return this.__mat44MultPre(mat1,mat0);
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
        this._setMvMatrixUniform();
        gl.drawElements(gl.TRIANGLES,ind.length,gl.UNSIGNED_SHORT,0);
    }
};

CanvasGL.prototype.setPixelPerfect = function(bool)
{
    this._pixelPerfect = bool;
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


