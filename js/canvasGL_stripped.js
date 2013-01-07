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

/** ------------------------------------------------------------------------------------------------------------------
 *
 * @param parentDomElementId
 * @constructor
 *
 * CanvasGL class
 *
 * ---------------------------------------------------------------------------------------------------------------- */

function CanvasGL(parentDomElementId)
{
    this.parent = document.getElementById(parentDomElementId);
    this._size = {width: _InternalCanvasGLOptions.DEFAULT_WIDTH ,
        height:_InternalCanvasGLOptions.DEFAULT_HEIGHT};

    this._glCanvas = document.createElement('canvas');
    this._glCanvas.style.position = 'absolute';
    this._glCanvas.style.left = '0px';
    this._glCanvas.style.top = '0px';

    //Init webgl

    this._implementation = null;
    var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
    this.gl = null;
    for(var i = 0; i < names.length;++i)
    {
        try
        {
            this.gl = this._glCanvas.getContext(names[i],{ antialias: true});
        } catch (e){if(CanvasGLOptions.doLog)console.log("WebGL context could not be initialized");}
        if(this.gl){this._implementation = names[i];break;}
    }


    // Setup and load vertex shader

    this._vertexShader = this._loadShader(

            "uniform   mat4 a_matrix;" +
            "attribute vec2 a_position; " +
            "uniform   vec2 u_resolution;" +
            "attribute vec2 a_texture_coord;" +
            "varying   vec2 v_texture_coord;" +

            "void main()" +
            "{" +
                "vec2 transedPos = vec2(a_matrix * vec4(a_position.xy,0,1)).xy;" +
                "vec2 zeroToOne = transedPos / u_resolution;" +
                "vec2 zeroToTwo = zeroToOne * 2.0;" +
                "vec2 clipSpace = (zeroToTwo - 1.0);" +
                "vec4 resultPos = vec4(clipSpace,0,1) * vec4(1,-1,1,1);" +
                "gl_Position = resultPos;" +
                "v_texture_coord = a_texture_coord;" +
            "}",

            this.gl.VERTEX_SHADER);


    // Setup and load fragment shader

    this._fragmentColorShader = this._loadShader(

            "precision mediump float;" +

            "uniform vec4      u_color;" +
            "uniform float     u_use_texture;" +
            "uniform sampler2D u_image;" +
            "varying vec2      v_texture_coord;" +
            "uniform float     u_alpha;" +

            "void main()" +
            "{" +
                "vec4 texColor  = texture2D(u_image,v_texture_coord) * u_use_texture;" +
                "vec4 vertColor = u_color * (1.0 - u_use_texture);" +
                "vec4 resColor  = vec4((vertColor+texColor).xyz,u_alpha);" +
                "gl_FragColor = resColor;" +
            "}",

            this.gl.FRAGMENT_SHADER);


    // Load and init program & set size to default

    this._program        = this._loadProgram();
    var gl = this.gl;gl.useProgram(this._program);

    this.setSize(_InternalCanvasGLOptions.DEFAULT_WIDTH,
                 _InternalCanvasGLOptions.DEFAULT_HEIGHT);


    // Save attribute and uniform locations from shader

    this._locationAttribPosition     = gl.getAttribLocation( this._program, "a_position");
    this._locationTransMatrix        = gl.getUniformLocation(this._program, "a_matrix");
    this._locationAttribTextureCoord = gl.getAttribLocation( this._program, "a_texture_coord");
    this._locationUniformResolution  = gl.getUniformLocation(this._program, "u_resolution");
    this._locationUniformColor       = gl.getUniformLocation(this._program, "u_color");
    this._locationUniformUseTexture  = gl.getUniformLocation(this._program, "u_use_texture");
    this._locationUniformImage       = gl.getUniformLocation(this._program, "u_image");
    this._locationUniformAlpha       = gl.getUniformLocation(this._program, "u_alpha");


    // Create Buffers

    this._buffer               = gl.createBuffer();
    this._bufferVertexPosition = gl.createBuffer();
    this._bufferVertexIndex    = gl.createBuffer();
    this._bufferVertexTexCoord = gl.createBuffer();
    this._bufferVertexColor    = gl.createBuffer();

    // Create default blank texture and texture coords / use color and set alpha to 1.0

    this._blankTexture = gl.createTexture();
    this._textureCoords = [0.0,0.0,1.0,0.0,1.0,1.0,0.0,1.0,1.0,0.0,1.0,1.0];

    gl.bindTexture(gl.TEXTURE_2D,this._blankTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([1,1,1,1]));

    gl.uniform1f(this._locationUniformUseTexture,0.0);
    gl.uniform1f(this._locationUniformAlpha,1.0);

    // bind defaults

    gl.bindBuffer(gl.ARRAY_BUFFER,        this._bufferVertexPosition);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this._bufferVertexIndex);

    gl.enableVertexAttribArray(this._locationAttribPosition);
    gl.vertexAttribPointer(    this._locationAttribPosition,2,gl.FLOAT,false,0,0);

    gl.enableVertexAttribArray(this._locationAttribTextureCoord);
    gl.vertexAttribPointer(    this._locationAttribTextureCoord,2,gl.FLOAT,false,0,0);


    // Create matrix stack and apply to shader

    this._tMatrix  = this.__makeMat44();
    this._tMatrixStack = [];

    gl.uniformMatrix4fv(this._locationTransMatrix,false,new Float32Array(this._tMatrix));


    // Enable gl flags

    gl.enable(gl.BLEND);


    // Create canvas for canvas textures

    this._gl2dCanvas = document.createElement('canvas');
    this._gl2d = this._gl2dCanvas.getContext('2d');


    // Set draw modes

    this._ellipseMode = CanvasGL.CENTER;
    this._rectMode    = CanvasGL.CORNER;
    this._fill        = true;
    this._stroke      = true;
    this._fillColor   = colorf(1.0,1.0);
    this._strokeColor = colorf(1.0,1.0);


    // Init temp values

    this._bezierAnchor0x = this._bezierAnchor0y = null;
    this._bezierAnchor1x = this._bezierAnchor1y = null;
    this._bezierContrl0x = this._bezierContrl0y = null;
    this._bezierContrl1x = this._bezierContrl1y = null;


    // Attach canvases to parent DOM element

    this.parent.appendChild(this._gl2dCanvas);
    this.parent.appendChild(this._glCanvas);
}

/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.CENTER = 0;
CanvasGL.CORNER = 1;

CanvasGL.prototype.setEllipseMode = function(mode)
{
    this._ellipseMode = mode;
};

CanvasGL.prototype.setRectMode = function(mode)
{
    this._rectMode = mode;
};

/*---------------------------------------------------------------------------------------------------------*/

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


CanvasGL.prototype._applyFill = function()
{
    var gl = this.gl;
    var cf = this._fillColor;
    gl.uniform1f(this._locationUniformUseTexture,0.0);
    gl.uniform4f(this._locationUniformColor,cf[0],cf[1],cf[2],cf[3]);
    gl.uniform1f(this._locationUniformAlpha,cf[3]);
    gl.bindTexture(gl.TEXTURE_2D,this._blankTexture);
};

CanvasGL.prototype.fill = function()
{
    this._fillColor = colori.apply(this,arguments);
    this._fill = true;
};

CanvasGL.prototype.noFill = function()
{
    this._fill = false;
};


// Stroke

CanvasGL.prototype._applyStroke =function()
{
    var gl = this.gl;
    var cf = this._strokeColor;
    gl.uniform1f(this._locationUniformUseTexture,0.0);
    gl.uniform4f(this._locationUniformColor,cf[0],cf[1],cf[2],cf[3]);
    gl.uniform1f(this._locationUniformAlpha,cf[3]);
    gl.bindTexture(gl.TEXTURE_2D,this._blankTexture);
};

CanvasGL.prototype.stroke = function()
{
    this._strokeColor = colori.apply(this,arguments);
    this._stroke = true;
};

CanvasGL.prototype.noStroke = function()
{
    this._stroke = false;
};


// Blending

CanvasGL.prototype.background = function()
{
    var gl = this.gl;
    var c  = colori.apply(this,arguments);
    gl.clearColor(c[0],c[1],c[2],c[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    //Reset transformation matrix to identity matrix
    this._loadIdentity();
};

/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.quad = function(x0,y0,x1,y1,x2,y2,x3,y3)
{
    if(!this._fill && !this._stroke)return;

    var gl = this.gl;
    var arr;

    this._setMvMatrixUniform();
    gl.bindBuffer(gl.ARRAY_BUFFER,this._bufferVertexPosition);

    if(this._fill)
    {
        arr = [x0,y0,x1,y1,x3,y3,x1,y1,x2,y2,x3,y3];
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.DYNAMIC_DRAW);
        this._applyFill();
        gl.drawArrays(gl.TRIANGLES,0,6);
    }

    if(this._stroke)
    {
        arr = [x0,y0,x1,y1,x2,y2,x3,y3];
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.DYNAMIC_DRAW);
        this._applyStroke();
        gl.drawArrays(gl.LINE_LOOP,0,4);
    }
};

CanvasGL.prototype.rect = function(x,y,width,height)
{
    var rm = this._rectMode;
    var xw = x+width,yh = y+height;
    if(rm == 1)
    this.quad(x,y,xw,y,xw,yh,x,yh);
    else if(rm == 0)
    var cx = x - xw*0.5, cy = y - yh*0.5;
    this.quad(cx,cy,xw,cy,xw,yh,cx,yh);
};

CanvasGL.prototype.ellipse = function(x,y,radiusX,radiusY,resolution)
{
    if(!this._fill && !this._stroke)return;

    var cm = this._ellipseMode;

    var cx = cm == 0 ? x : x + radiusX;
    var cy = cm == 0 ? y : y + radiusY;

    var gl  = this.gl;
    var res = resolution || CanvasGLOptions.RESOLUTION_CIRCLE;
    var step = Math.PI / res;
    var i = 0;
    var s;
    var v = new Float32Array(res*2);

    while(i < v.length)
    {
        s      = step * i;
        v[i]   = cx + radiusX * Math.cos(s);
        v[i+1] = cy + radiusY * Math.sin(s);
        i+=2;
    }

    gl.bufferData(gl.ARRAY_BUFFER,v,gl.DYNAMIC_DRAW);
    this._setMvMatrixUniform();

    if(this._fill)
    {
        this._applyFill();
        gl.drawArrays(gl.TRIANGLE_FAN,0, v.length*0.5);
    }

    if(this._stroke)
    {
        this._applyStroke();
        gl.drawArrays(gl.LINE_LOOP,0,v.length*0.5);
    }
};

CanvasGL.prototype.circle = function(x,y,radius,resolution)
{
    this.ellipse(x,y,radius,radius,resolution);
};

CanvasGL.prototype.arc = function(centerX,centerY,radiusX,radiusY,startAngle,stopAngle,innerRadiusX,innerRadiusY,resolution)
{
    var gl  = this.gl;
    resolution = resolution || CanvasGLOptions.RESOLUTION_CIRCLE;
    var step = (stopAngle - startAngle)/(resolution*2-2);
    var i = 0;

    var indices = [];
    var v = new Float32Array(resolution*4);

    innerRadiusX = innerRadiusX || 0;
    innerRadiusY = innerRadiusY || 0;

    var s,coss,sins;

    while(i < v.length)
    {
        s    = startAngle + step * i;
        coss = Math.cos(s);
        sins = Math.sin(s);

        v[i]   = centerX + radiusX * coss;
        v[i+1] = centerY + radiusY * sins;
        v[i+2] = centerX + innerRadiusX * coss;
        v[i+3] = centerY + innerRadiusY * sins;
        i+=4;
    }

    this._setMvMatrixUniform();

    if(this._fill)
    {
        gl.bufferData(gl.ARRAY_BUFFER,v,gl.DYNAMIC_DRAW);
        this._applyFill();
        gl.drawArrays(gl.TRIANGLE_STRIP,0, v.length*0.5);
    }

    if(this._stroke)
    {
        var vo = new Float32Array(resolution*2);
        i = 0;
        while(i < vo.length)
        {
            vo[i] = v[i*2];
            vo[i+1] = v[i*2+1];
            i+=2;
        }
        gl.bufferData(gl.ARRAY_BUFFER,vo,gl.DYNAMIC_DRAW);
        this._applyStroke();
        gl.drawArrays(gl.LINE_STRIP,0,vo.length*0.5);
    }
};

CanvasGL.prototype.line = function(x0,y0,x1,y1)
{
    if(!this._stroke)return;

    var gl  = this.gl;
    var arr =  [x0,y0,x1,y1];
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.DYNAMIC_DRAW);
    this._applyStroke();
    this._setMvMatrixUniform();
    gl.drawArrays(gl.LINES,0,2);
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

/*---------------------------------------------------------------------------------------------------------*/

// Texture helper class

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

//Load image return CanvasGLImage

CanvasGL.prototype.loadImage = function(path,target,obj,callbackString)
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
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);

        target._set(tex);
        obj[callbackString]();
    };
    tex.image.src = path;
};

CanvasGL.prototype.image = function(image)
{
    var gl = this.gl;

    var x = 0.0, y = 0.0;
    var w = image.width, h = image.height;
    var xw = x+w,yh = y+h;

    var vertices  = new Float32Array([x,y,xw,y,x,yh,xw,y,xw,yh,x,yh]);
    var texCoords = new Float32Array([0.0,0.0,
                                      1.0,0.0,
                                      0.0,1.0,
                                      1.0,0.0,
                                      1.0,1.0,
                                      0.0,1.0]);

    this._setMvMatrixUniform();
    gl.uniform1f(this._locationUniformUseTexture,1.0);

    gl.bindBuffer(gl.ARRAY_BUFFER,this._bufferVertexPosition);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,this._bufferVertexTexCoord);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(texCoords),gl.DYNAMIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D,image._t);
    gl.uniform1f(this._locationUniformImage,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
    gl.bindTexture(gl.TEXTURE_2D, this._blankTexture);
};

/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.loadCustomShader = function(shaderScript)
{

};

CanvasGL.prototype.loadShaderFromScript = function(shaderScriptId)
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

/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype._setMvMatrixUniform = function()
{
    this.gl.uniformMatrix4fv(this._locationTransMatrix,false,new Float32Array(this._tMatrix));
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

// Internal Matrix 4x4 class for all transformations

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

// Floors every input vertex

CanvasGL.prototype.setPixelPerfect = function(bool)
{
    this._pixelPerfect = bool;
};

CanvasGL.prototype.saveToPNG = function()
{
    var canvas = window.open(this._glCanvas.toDataURL('image/png'));
};

/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype._c2dGetBlankWhiteTexture = function()
{


    this._c2dSetSize(16,16);
    this._c2dBackground(0);
    var tex = this.gl.createTexture();
    tex.image = this._gl2dCanvas;
    return tex;

};

CanvasGL.prototype._c2dSetSize = function(width,height)
{
    var gl2dC = this._gl2dCanvas;

    gl2dC.style.width  = width + 'px';
    gl2dC.style.height = height + 'px';

    gl2dC.width  = parseInt(gl2dC.style.width);
    gl2dC.height = parseInt(gl2dC.style.height);

};

CanvasGL.prototype._c2dBackground = function()
{
    var gl2d = this._gl2d;
    this._c2dNoStroke();
    this._c2dFill(255,0,0);
    this._c2dRect(0,0,this._gl2dCanvas.width,this._gl2dCanvas.height);
    this._c2dApplyFill();
};

CanvasGL.prototype._c2dRect = function(x,y,width,height)
{
    var gl2d = this._gl2d;
    gl2d.fillRect(Math.round(x) - 0.5, Math.round(y) - 0.5, width, height);
    gl2d.strokeRect(Math.round(x), Math.round(y), width, height);
};

CanvasGL.prototype._c2dNoFill = function()
{
    this._gl2d.fillStyle ='rgba(0,0,0,0)';
};

CanvasGL.prototype._c2dNoStroke = function()
{
    this._gl2d.strokeStyle='rgba(0,0,0,0)';
};

CanvasGL.prototype._c2dFill = function()
{
    this._gl2d.fillStyle = colori(arguments);
};

CanvasGL.prototype._c2dApplyFill = function()
{
    this._gl2d.fill();
};

/*---------------------------------------------------------------------------------------------------------*/

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
            c[3] = arguments[3];
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

function alpha(color)
{
    return color[3];
}

function lerpColor(col0,col1,a)
{
  return [(col0[0]*a)+(col1[0]*(1-a)),
          (col0[1]*a)+(col1[1]*(1-a)),
          (col0[2]*a)+(col1[2]*(1-a)),
          (col0[3]*a)+(col1[3]*(1-a))];
}

/*---------------------------------------------------------------------------------------------------------*/


