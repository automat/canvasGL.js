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

    /*
     this._vertexShader   = this._loadShader(
     "uniform mat4 a_matrix;" +
     "attribute vec2 a_position; " +
     "uniform vec2 u_resolution;" +
     "attribute vec2 a_texture_coord;" +
     "varying  vec2 v_texture_coord;"+
     "void main()" +
     "{" +
     "vec2 transedPos = vec2(a_matrix * vec4(a_position.xy,0,1)).xy;"+
     "vec2 zeroToOne = transedPos / u_resolution;" +
     "vec2 zeroToTwo = zeroToOne * 2.0;" +
     "vec2 clipSpace = (zeroToTwo - 1.0);" +
     "vec4 resultPos = vec4(clipSpace,0,1) * vec4(1,-1,1,1);" +
     "gl_Position = resultPos;" +
     "v_texture_coord = a_texture_coord;" +
     "}",this.gl.VERTEX_SHADER);

     this._fragmentColorShader   = this._loadShader(
     "precision mediump float;" +
     "uniform vec4 u_color;" +
     "void main()" +
     "{" +
     "gl_FragColor = u_color;" +
     "}",this.gl.FRAGMENT_SHADER);

     this._fragmentTextureShader = this._loadShader(
     "precision mediump float;" +
     "varying vec2 v_texture_coord;" +
     "uniform sampler2D u_sampler;" +
     "void main()" +
     "{" +
     "gl_FragColor = texture2D(u_sampler,vec2(v_texture_coord.s,v_texture_coord.t));" +
     "}",this.gl.FRAGMENT_SHADER);

     this._fragmentCombinedShader = this._loadShader(
     "precision mediump float;" +
     "uniform vec4 u_color;" +
     "void main()" +
     "{" +
     "gl_FragColor = u_color;" +
     "}",this.gl.FRAGMENT_SHADER);
     */


    this._vertexShader   = this._loadShader(

        "attribute vec2 a_position; " +
        //"uniform   vec4 u_vertex_color;" +
        "attribute vec2 a_texture_coord;" +
        //"varying   vec4 v_vertex_color;" +
        //"varying   vec2 v_texture_coord;" +
        "uniform   mat4 u_matrix;" +
        "uniform   vec2 u_resolution;" +

        "void main()" +
        "{" +

            "vec2 transedPos = vec2(u_matrix * vec4(a_position.xy,0,1)).xy;"+
            "vec2 zeroToOne  = transedPos / u_resolution;" +
            "vec2 zeroToTwo  = zeroToOne * 2.0;" +
            "vec2 clipSpace  = (zeroToTwo - 1.0);" +
            "gl_Position     = vec4(clipSpace,0,1) * vec4(1,-1,1,1);" +
            //"v_texture_coord = a_texture_coord;" +
            //"v_vertex_color  = u_vertex_color;" +

         "}",this.gl.VERTEX_SHADER);


    this._fragmentShader   = this._loadShader(

            "precision mediump float;" +

            "uniform float u_use_texture;" +
            "uniform sampler2D u_sampler;" +

            "uniform   vec4 u_vertex_color;" +

            //"varying vec4  v_vertex_color;" +
            //"varying vec2  v_texture_coord;" +

            "void main()" +
            "{" +

                //"vec4 texColor = texture2D(u_sampler,v_texture_coord) * u_use_texture;" +
                "vec4 vertColor = u_vertex_color;" + // * (1.0 - u_use_texture);"+
                //"gl_FragColor = texColor+vertColor;"+
                "gl_FragColor = vertColor;" +



            "}",this.gl.FRAGMENT_SHADER);



    this._program        = this._loadProgram();

    var gl = this.gl;

    gl.useProgram(this._program);

    this._locationAttribPosition     = gl.getAttribLocation( this._program, "a_position");
    this._locationUniformColor        = gl.getAttribLocation(this._program, "u_vertex_color");
    this._locationAttribTextureCoord = gl.getAttribLocation( this._program, "a_texture_coord");
    this._locationUniformSampler     = gl.getUniformLocation(this._program, "u_sampler");
    this._locationUniformUseTexture  = gl.getUniformLocation(this._program, "u_use_texture");
    this._locationUniformResolution  = gl.getUniformLocation(this._program, "u_resolution");
    this._locationTransMatrix        = gl.getUniformLocation(this._program, "u_matrix");


    this.setSize(_InternalCanvasGLOptions.DEFAULT_WIDTH,
                 _InternalCanvasGLOptions.DEFAULT_HEIGHT);

    this._bufferVertexPosition = gl.createBuffer();
    this._bufferVertexIndex    = gl.createBuffer();
    this._bufferVertexTexCoord = gl.createBuffer();
    this._bufferVertexColor    = gl.createBuffer();

    this.gl.uniform1f(this._locationUniformUseTexture,0.0);



    this._tMatrix  = this.__makeMat44();
    this._tMatrixStack = [];

    gl.uniformMatrix4fv(this._locationTransMatrix,false,new Float32Array(this._tMatrix));

    gl.bindBuffer(gl.ARRAY_BUFFER,        this._bufferVertexPosition);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this._bufferVertexIndex);

    gl.enableVertexAttribArray(this._locationAttribPosition);
    gl.vertexAttribPointer(    this._locationAttribPosition,2,gl.FLOAT,false,0,0);

    gl.enableVertexAttribArray(this._locationAttribTextureCoord);
    gl.vertexAttribPointer(    this._locationAttribTextureCoord,2,gl.FLOAT,false,0,0);

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

/*---------------------------------------------------------------------------------------------------------*/

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

    this.gl.uniform2f(this._locationUniformResolution,this.width, this.height);
    this.gl.viewport(0,0,this.width,this.height);

};

/*---------------------------------------------------------------------------------------------------------*/

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

/*---------------------------------------------------------------------------------------------------------*/

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

/*---------------------------------------------------------------------------------------------------------*/

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

/*---------------------------------------------------------------------------------------------------------*/

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

CanvasGL.prototype.circle = function(x,y,radius,resolution)
{
    this.ellipse(x,y,radius,radius,resolution);
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

/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.quad = function(x0,y0,x1,y1,x2,y2,x3,y3)
{
    var gl = this.gl;
    var arr;
    if(this._fill)
    {
        arr = [x0,y0,x1,y1,x3,y3,x1,y1,x2,y2,x3,y3];
        arr = this._pixelPerfect ? this._flooredArray(arr) : arr;
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.DYNAMIC_DRAW);
        this._applyFill();
        this._setMvMatrixUniform();
        gl.drawArrays(gl.TRIANGLES,0,6);
    }

    if(this._stroke)
    {
        arr = [x0,y0,x1,y1,x2,y2,x3,y3];
        arr = this._pixelPerfect ? this._flooredArray(arr) : arr;
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.DYNAMIC_DRAW);
        this._applyStroke();
        this._setMvMatrixUniform();
        gl.drawArrays(gl.LINE_LOOP,0,4);
    }

};

CanvasGL.prototype.rect = function(x,y,width,height)
{
    var xw = x+width,yh = y+height;
    this.quad(x,y,xw,y,xw,yh,x,yh);
};

/*---------------------------------------------------------------------------------------------------------*/

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

/*---------------------------------------------------------------------------------------------------------*/

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

/*---------------------------------------------------------------------------------------------------------*/




CanvasGLImage = function()
{
    this._t     = null;
    this._glID  = null;
    this.width  = null;
    this.height = null;
};

CanvasGLImage.prototype._set = function(t)
{
    this._t = t;
    this.width  = t.image.width;
    this.height = t.image.height;
};

CanvasGL.prototype.texture = function(tex)
{

    var gl = this.gl;







};

CanvasGL.prototype.loadImage = function(path,target,obj,callback)
{
    var gl = this.gl;
    var tex = gl.createTexture();
    tex.image = new Image();

    tex.image.onload = function()
    {
        var img = tex.image;

        if(!img){console.log("Texture image is null.");return;}

        var imgwidth  = img.width,
            imgheight = img.height;

        if((imgwidth&(imgwidth-1))!=0){console.log("Texture image width is not power of 2.");return;}
        else if((imgheight&(imgheight-1))!=0){console.log("Texture image width is not power of 2.");return;}

        gl.bindTexture(gl.TEXTURE_2D,tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);

        target._set(tex);
        callback.apply(obj);
    };
    tex.image.src = path;
};

CanvasGL.prototype._applyTexture = function()
{

};

CanvasGL.prototype._applyTextureCoord = function()
{

};

/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.image = function(img,x,y,width,height)
{
    var xw = x+width,yh = y+height;

    var gl = this.gl;

    var vertices = [x,y,xw,y,xw,yh,x,yh];
    var texCoords = [0,0,1,0,1,1,0,0];
    var indices   = [0,1,2,0,3,2];


    gl.bindBuffer(gl.ARRAY_BUFFER,this._bufferVertexPosition);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(this._locationAttribPosition,2,gl.FLOAT,false,0,0);

    /*

    gl.bindBuffer(gl.ARRAY_BUFFER,this._bufferVertexTexCoord);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(texCoords),gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(this._locationAttribTextureCoord,2,gl.FLOAT,false,0,0);
     */


    //gl.activeTexture(gl.TEXTURE0);
    //gl.bindTexture(gl.TEXTURE_2D,img._t);
    //gl.uniform1i(this._locationUniformSampler,0);


    //gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this._bufferVertexPosition);
    this._setMvMatrixUniform();
    gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);

    gl.bindTexture(gl.TEXTURE_2D,null);

    gl.bindBuffer(gl.ARRAY_BUFFER,this._bufferVertexPosition);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this._bufferVertexIndex);

    this._applyFill();
    this._applyStroke();

};

/*---------------------------------------------------------------------------------------------------------*/

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

/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.background = function()
{
    var gl = this.gl;
    var c  = colori.apply(this,arguments);
    gl.clearColor(c[0],c[1],c[2],c[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this._loadIdentity();
};

/*---------------------------------------------------------------------------------------------------------*/

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

/*---------------------------------------------------------------------------------------------------------*/

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

/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype._setMvMatrixUniform = function()
{
    this.gl.uniformMatrix4fv(this._locationTransMatrix,false,new Float32Array(this._tMatrix));
};

CanvasGL.prototype._loadIdentity = function()
{
    this.__mat44Identity(this._tMatrix);
};

/*---------------------------------------------------------------------------------------------------------*/

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

/*---------------------------------------------------------------------------------------------------------*/

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

/*---------------------------------------------------------------------------------------------------------*/

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

CanvasGL.prototype.__mat44MultPre = function(m0,m1)
{
    var m = this.__makeMat44();

    var m000 = m0[ 0],m001 = m0[ 1],m002 = m0[ 2],m003 = m0[ 3],
        m004 = m0[ 4],m005 = m0[ 5],m006 = m0[ 6],m007 = m0[ 7],
        m008 = m0[ 8],m009 = m0[ 9],m010 = m0[10],m011 = m0[11],
        m012 = m0[12],m013 = m0[13],m014 = m0[14],m015 = m0[15];

    var m100 = m1[ 0],m101 = m1[ 1],m102 = m1[ 2],m103 = m1[ 3],
        m104 = m1[ 4],m105 = m1[ 5],m106 = m1[ 6],m107 = m1[ 7],
        m108 = m1[ 8],m109 = m1[ 9],m110 = m1[10],m111 = m1[11],
        m112 = m1[12],m113 = m1[13],m114 = m1[14],m115 = m1[15];

    m[ 0] = m000*m100 + m001*m104 + m002*m108 + m003*m112;
    m[ 1] = m000*m101 + m001*m105 + m002*m109 + m003*m113;
    m[ 2] = m000*m102 + m001*m106 + m002*m110 + m003*m114;
    m[ 3] = m000*m103 + m001*m107 + m002*m111 + m003*m115;

    m[ 4] = m004*m100 + m005*m104 + m006*m108 + m007*m112;
    m[ 5] = m004*m101 + m005*m105 + m006*m109 + m007*m113;
    m[ 6] = m004*m102 + m005*m106 + m006*m110 + m007*m114;
    m[ 7] = m004*m103 + m005*m107 + m006*m111 + m007*m115;

    m[ 8] = m008*m100 + m009*m104 + m010*m108 + m011*m112;
    m[ 9] = m008*m101 + m009*m105 + m010*m109 + m011*m113;
    m[10] = m008*m102 + m009*m106 + m010*m110 + m011*m114;
    m[11] = m008*m103 + m009*m107 + m010*m111 + m011*m115;

    m[12] = m012*m100 + m013*m104 + m014*m108 + m015*m112;
    m[13] = m012*m101 + m013*m105 + m014*m109 + m015*m113;
    m[14] = m012*m102 + m013*m106 + m014*m110 + m015*m114;
    m[15] = m012*m103 + m013*m107 + m014*m111 + m015*m115;

    return m;
};

CanvasGL.prototype.__mat44MultPost = function(mat0,mat1)
{
    return this.__mat44MultPre(mat1,mat0);
};

/*---------------------------------------------------------------------------------------------------------*/


CanvasGL.prototype.setPixelPerfect = function(bool)
{
    this._pixelPerfect = bool;
};

CanvasGL.prototype.saveToPNG = function()
{
    var canvas = window.open(this._glCanvas.toDataURL('image/png'));
};

/*---------------------------------------------------------------------------------------------------------*/

function colori()
{
    var c = colorf(arguments);

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

/*---------------------------------------------------------------------------------------------------------*/


