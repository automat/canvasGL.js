/**
 * User: Henryk Wollik
 * Date: 27.12.12
 * Time: 09:37
 */

CanvasGLOptions = {};
CanvasGLOptions.doLog = true;

_CGLConstants = {};
_CGLConstants.WIDTH_DEFAULT  = 300;
_CGLConstants.HEIGHT_DEFAULT = 300;
_CGLConstants.BEZIER_DETAIL_DEFAULT = 30;
_CGLConstants.BEZIER_DETAIL_MAX     = 50;
_CGLConstants.ELLIPSE_DETAIL_DEFAULT= 10;
_CGLConstants.ELLIPSE_DETAIL_MAX    = 50;
_CGLConstants.SPLINE_DETAIL_DEFAULT = 10;
_CGLConstants.SPLINE_DETAIL_MAX     = 50;

/** ------------------------------------------------------------------------------------------------------------------
 *
 * CanvasGL class
 *
 * ---------------------------------------------------------------------------------------------------------------- */

function CanvasGL(parentDomElementId)
{
    this.parent = document.getElementById(parentDomElementId);
    this._size = {width: _CGLConstants.WIDTH_DEFAULT ,
                  height:_CGLConstants.HEIGHT_DEFAULT};

    this._glCanvas = document.createElement('canvas');
    this._glCanvas.style.position = 'absolute';
    this._glCanvas.style.left = '0px';
    this._glCanvas.style.top = '0px';

    //Init webgl

    this._usedBrowser = null;
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
            "attribute vec4 a_vertex_color;"+
            "varying   vec4 v_vertex_color;" +

            "void main()" +
            "{" +
            "vec2 transedPos = vec2(a_matrix * vec4(a_position.xy,0,1)).xy;" +
            "vec2 zeroToOne = transedPos / u_resolution;" +
            "vec2 zeroToTwo = zeroToOne * 2.0;" +
            "vec2 clipSpace = (zeroToTwo - 1.0);" +
            "gl_Position = vec4(clipSpace.x,-clipSpace.y,0,1);" +
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
            "varying   vec4 v_vertex_color;" +

            "void main()" +
            "{" +
            "vec4 texColor  = texture2D(u_image,v_texture_coord) * u_use_texture;" +
            "vec4 vertColor = u_color * (1.0 - u_use_texture);" +
            //"gl_FragColor = vec4((vertColor+texColor).xyz,u_alpha);" +
            "gl_FragColor = vertColor+texColor;;" +
            "}",

        this.gl.FRAGMENT_SHADER);


    // Load and init program & set size to default

    this._program        = this._loadProgram();
    var gl = this.gl;gl.useProgram(this._program);

    this.setSize(_CGLConstants.WIDTH_DEFAULT,_CGLConstants.HEIGHT_DEFAULT);


    // Save attribute and uniform locations from shader

    this._locationAttribPosition     = gl.getAttribLocation( this._program, "a_position");
    this._locationTransMatrix        = gl.getUniformLocation(this._program, "a_matrix");
    this._locationAttribTextureCoord = gl.getAttribLocation( this._program, "a_texture_coord");
    this._locationUniformResolution  = gl.getUniformLocation(this._program, "u_resolution");
    this._locationUniformColor       = gl.getUniformLocation(this._program, "u_color");
    this._locationUniformUseTexture  = gl.getUniformLocation(this._program, "u_use_texture");
    this._locationUniformImage       = gl.getUniformLocation(this._program, "u_image");
    this._locationUniformAlpha       = gl.getUniformLocation(this._program, "u_alpha");
    this._locationAttribVertexColor  = gl.getAttribLocation( this._program, "a_vertex_color");


    // Create Buffers

    this._vbo = gl.createBuffer();
    this._ibo = gl.createBuffer();

    // Create temp arrays

    this._tempQuadTexCoords         = new Float32Array([0.0,0.0,1.0,0.0,0.0,1.0,1.0,0.0,1.0,1.0,0.0,1.0]);

    this._tempQuadFillVertices      = new Float32Array(12);
    this._tempQuadStrokeVertices    = new Float32Array(8);
    this._tempTriangleVertices      = new Float32Array(3);
    this._tempLineVertices          = new Float32Array(4);
    this._tempPointVertices         = new Float32Array(2);
    this._tempBufferCircleVertices  = new Float32Array(_CGLConstants.ELLIPSE_DETAIL_MAX*2);
    this._tempBufferBezierVertices  = new Float32Array(_CGLConstants.BEZIER_DETAIL_MAX*2);
    this._tempBufferArcVertices     = new Float32Array(_CGLConstants.ELLIPSE_DETAIL_MAX*4);
    this._tempBufferSplineVertices  = new Float32Array(_CGLConstants.SPLINE_DETAIL_MAX*4);
    this._tempBufferVertexColor     = new Float32Array(4);

    this._tempSplineVertices = [];

    this._currEllipseDetail = _CGLConstants.ELLIPSE_DETAIL_DEFAULT;
    this._currBezierDetail  = _CGLConstants.BEZIER_DETAIL_DEFAULT;
    this._currSplineDetail  = _CGLConstants.SPLINE_DETAIL_DEFAULT;


    // Create default blank texture and texture coords / use color and set alpha to 1.0

    this._blankTexture = gl.createTexture();
    this._textureCoords = [0.0,0.0,1.0,0.0,1.0,1.0,0.0,1.0];

    gl.bindTexture(gl.TEXTURE_2D,this._blankTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([1,1,1,1]));

    gl.uniform1f(this._locationUniformUseTexture,0.0);
    gl.uniform1f(this._locationUniformAlpha,1.0);

    // bind defaults

    gl.bindBuffer(gl.ARRAY_BUFFER,        this._vbo);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this._ibo);

    gl.enableVertexAttribArray(this._locationAttribPosition);
    gl.vertexAttribPointer(    this._locationAttribPosition,2,gl.FLOAT,false,0,0);

    gl.enableVertexAttribArray(this._locationAttribTextureCoord);
    gl.vertexAttribPointer(    this._locationAttribTextureCoord,2,gl.FLOAT,false,0,0);

    //gl.enableVertexAttribArray(this._locationAttribVertexColor);
    //gl.vertexAttribPointer(    this._locationAttribVertexColor,4,gl.FLOAT,false,0,0);


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
    this._texture     = false;
    this._textureCurr = null;
    this._c2dTexture  = this._c2dPrepareTexture();

    this._fontProperties = {style:'',
                            weight:'normal',
                            size:20,
                            family:'Arial',
                            baseLine: 'bottom',
                            align: 'left',
                            lineHeight:'1',
                            spacing:'1'};


    // Init temp values

    this._bezierAnchor0x = this._bezierAnchor0y = null;
    this._bezierAnchor1x = this._bezierAnchor1y = null;
    this._bezierContrl0x = this._bezierContrl0y = null;
    this._bezierContrl1x = this._bezierContrl1y = null;


    // Attach canvases to parent DOM element

    //this.parent.appendChild(this._gl2dCanvas);
    this.parent.appendChild(this._glCanvas);
}

/*---------------------------------------------------------------------------------------------------------*/
// Overall settings
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
// Drawing settings
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

CanvasGL.prototype.setEllipseDetail = function(a)
{
    var md = _CGLConstants.BEZIER_DETAIL_MAX;
    this._currEllipseDetail = a > md ? md : a;
};

CanvasGL.prototype.setBezierDetail = function(a)
{
    var md = _CGLConstants.BEZIER_DETAIL_MAX;
    this._currBezierDetail = a > md ? md : a;

};

CanvasGL.prototype.setSplineDetail = function(a)
{
    var md = _CGLConstants.SPLINE_DETAIL_MAX;
    this._currSplineDetail = a  > md ? md : a;
};

/*---------------------------------------------------------------------------------------------------------*/
// Shape fill/stroke/texture
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


// Texture

CanvasGL.prototype._applyTexture = function()
{
    var gl = this.gl;
    gl.uniform1f(this._locationUniformUseTexture,1.0);
    gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);
    gl.uniform1f(this._locationUniformImage,0);
};

CanvasGL.prototype._disableTexture = function()
{
    var gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this._blankTexture);
    gl.vertexAttribPointer(    this._locationAttribTextureCoord,2,gl.FLOAT,false,0,0);
};

CanvasGL.prototype.texture = function(img,offsetX,offsetY,width,height)
{
    var quadTexCoords = this._tempQuadTexCoords;
    var gl = this.gl;
    if(offsetX  )
    {
        offsetY = offsetY || 0;
        width  = 1/width  || 1;
        height = 1/height || 1;

        quadTexCoords[0]=offsetX; //0
        quadTexCoords[1]=offsetY;

        quadTexCoords[2]=offsetX+width; //1
        quadTexCoords[3]=offsetY;

        quadTexCoords[4]=offsetX; //3
        quadTexCoords[5]=offsetY+height;

        quadTexCoords[6]=offsetX+width; //1
        quadTexCoords[7]=offsetY;

        quadTexCoords[8]=offsetX+width; //2
        quadTexCoords[9]=offsetY+height;

        quadTexCoords[10]=offsetX; //3
        quadTexCoords[11]=offsetY+height;

        gl.bindTexture(gl.TEXTURE_2D,img._t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.bindTexture(gl.TEXTURE_2D,this._blankTexture);
        this._setCurrTexture(img._t);
        return;
    }

    quadTexCoords[0]=0.0; //0
    quadTexCoords[1]=0.0;

    quadTexCoords[2]=1.0; //1
    quadTexCoords[3]=0.0;

    quadTexCoords[4]=0.0; //3
    quadTexCoords[5]=1.0;

    quadTexCoords[6]=1.0; //1
    quadTexCoords[7]=0.0;

    quadTexCoords[8]=1.0; //2
    quadTexCoords[9]=1.0;

    quadTexCoords[10]=0.0; //3
    quadTexCoords[11]=1.0;




    this._setCurrTexture(img._t);
};

CanvasGL.prototype._setCurrTexture = function(tex)
{
    this._textureCurr = tex;
    this._texture = true;
};

CanvasGL.prototype.noTexture = function()
{
    this._disableTexture();
    this._texture = false;
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
    this.setRectMode(CanvasGL.CORNER);
};

/*---------------------------------------------------------------------------------------------------------*/
// Drawing primitives
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.quad = function(x0,y0,x1,y1,x2,y2,x3,y3)
{
    if(!this._fill && !this._stroke && !this._texture)return;

    var gl = this.gl;
    var vbo = this._vbo;
    var vertices = this._tempQuadFillVertices;

    this._setMvMatrixUniform();
    gl.bindBuffer(gl.ARRAY_BUFFER,vbo);

    vertices[ 0] = x0;
    vertices[ 1] = y0;
    vertices[ 2] = x1;
    vertices[ 3] = y1;
    vertices[ 4] = x3;
    vertices[ 5] = y3;
    vertices[ 6] = x1;
    vertices[ 7] = y1;
    vertices[ 8] = x2;
    vertices[ 9] = y2;
    vertices[10] = x3;
    vertices[11] = y3;

    if(this._fill && !this._texture)
    {

        gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);
        this._applyFill();
        gl.drawArrays(gl.TRIANGLES,0,6);
    }

    if(this._texture)
    {

        gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
        gl.bufferData(gl.ARRAY_BUFFER,vertices.byteLength + this._tempQuadTexCoords.byteLength,gl.DYNAMIC_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER,0,vertices);
        gl.bufferSubData(gl.ARRAY_BUFFER,vertices.byteLength,this._tempQuadTexCoords);

        gl.enableVertexAttribArray(this._locationAttribPosition);
        gl.vertexAttribPointer(    this._locationAttribPosition,2,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(this._locationAttribTextureCoord);
        gl.vertexAttribPointer(    this._locationAttribTextureCoord,2,gl.FLOAT,false,0,vertices.byteLength);

        this._applyTexture();
        gl.drawArrays(gl.TRIANGLES,0,6);
    }

    if(this._stroke)
    {
        vertices = this._tempQuadStrokeVertices;
        vertices[ 0] = x0;
        vertices[ 1] = y0;
        vertices[ 2] = x1;
        vertices[ 3] = y1;
        vertices[ 4] = x2;
        vertices[ 5] = y2;
        vertices[ 6] = x3;
        vertices[ 7] = y3;

        gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);
        this._applyStroke();
        gl.drawArrays(gl.LINE_LOOP,0,4);
    }
};

CanvasGL.prototype.rect = function(x,y,width,height)
{
    var rm = this._rectMode;
    var xw = x+width,yh = y+height;
    this.quad(x,y,xw,y,xw,yh,x,yh);

};

CanvasGL.prototype.ellipse = function(x,y,radiusX,radiusY,resolution)
{
    if(!this._fill && !this._stroke)return;

    var cm = this._ellipseMode;

    var cx = cm == 0 ? x : x + radiusX;
    var cy = cm == 0 ? y : y + radiusY;

    var gl  = this.gl;
    var res = this._currEllipseDetail;
    var step = Math.PI / res;
    var i = 0;
    var s;
    var v =this._tempBufferCircleVertices;
    var vlen = res * 2;
    while(i < vlen)
    {
        s      = step * i;
        v[i]   = cx + radiusX * Math.cos(s);
        v[i+1] = cy + radiusY * Math.sin(s);
        i+=2;
    }

    gl.bufferData(gl.ARRAY_BUFFER,v,gl.DYNAMIC_DRAW);
    this._setMvMatrixUniform();

    if(this._fill && !this._texture)
    {
        this._applyFill();
        gl.drawArrays(gl.TRIANGLE_FAN,0, vlen*0.5);
    }

    if(this._stroke)
    {
        this._applyStroke();
        gl.drawArrays(gl.LINE_LOOP,0,vlen*0.5);
    }


};

CanvasGL.prototype.circle = function(x,y,radius,resolution)
{
    this.ellipse(x,y,radius,radius,resolution);
};

CanvasGL.prototype.arc = function(centerX,centerY,radiusX,radiusY,startAngle,stopAngle,innerRadiusX,innerRadiusY)
{
    var gl  = this.gl;
    var res = this._currEllipseDetail ;
    var step = (stopAngle - startAngle)/(res*2-2);
    var i = 0;

    var indices = [];
    var v = this._tempBufferArcVertices;
    var vlen = res*4;

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
        gl.drawArrays(gl.TRIANGLE_STRIP,0,vlen*0.5);
    }

    if(this._stroke)
    {
        var vo = new Float32Array(res*2);
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
    var v   = this._tempLineVertices;
    v[0] = x0;
    v[1] = y0;
    v[2] = x1;
    v[3] = y1;
    gl.bufferData(gl.ARRAY_BUFFER,v,gl.DYNAMIC_DRAW);
    this._applyStroke();
    this._setMvMatrixUniform();
    gl.drawArrays(gl.LINES,0,2);
};

CanvasGL.prototype.bezier = function(x0,y0,x1,y1,x2,y2,x3,y3)
{
    var d = this._currBezierDetail;

    this._bezierAnchor0x = x0;
    this._bezierAnchor0y = y0;
    this._bezierAnchor1x = x2;
    this._bezierAnchor1y = y2;
    this._bezierContrl0x = x1;
    this._bezierContrl0y = y1;
    this._bezierContrl1x = x3;
    this._bezierContrl1y = y3;

    var i = 0;
    var t,nt,nt3,nt2,t3,t2;

    var vertices =this._tempBufferBezierVertices;

    while(i < d)
    {
        t   = i / (d-2);
        nt  = 1 - t;
        nt3 = nt*nt*nt;
        nt2 = nt*nt;
        t3  = t*t*t;
        t2  = t*t;

        vertices[i]  = nt3*x0+3*nt2*t*x1+3*nt*t2*x2+t3*x3;
        vertices[i+1]= nt3*y0+3*nt2*t*y1+3*nt*t2*y2+t3*y3;

        i+=2;

    }

    var gl = this.gl;

    gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);
    this._applyStroke();
    this._setMvMatrixUniform();
    gl.drawArrays(gl.LINE_STRIP,0,d*0.5);
};

CanvasGL.prototype.bezierPoint = function(d)
{

    var nt  = 1 - d;
    var nt3 = nt * nt * nt;
    var nt2 = nt * nt;
    var t3  = d * d * d;
    var t2  = d * d;

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

CanvasGL.prototype.catmullRomSpline = function(points)
{
    var tightness = 0.5;

    var d = this._currSplineDetail;

    var t,t2,t3;

    var i = 0,j;
    var vertices = [];
    var pl = points.length;
    var index;

    while(i < pl-1)
    {
        j = 0;
        while(j < d)
        {
            t = j/d;

            index = i;

            vertices.push(this._catmullrom(points[Math.max(index,i-2)],
                                           points[index],
                                           points[Math.min(index+2,pl-2)],
                                           points[Math.min(index+4,pl-2)],
                                           t));

            index = i+1;

            vertices.push(this._catmullrom(points[Math.max(1,index-2)],
                                           points[index],
                points[Math.min(index+2,pl-1)],
                points[Math.min(index+4,pl-1)],
                t));

            j+=0.1;
        }







        i+=2;
    }



    var gl = this.gl;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
    this._applyStroke();
    this._setMvMatrixUniform();
    gl.drawArrays(gl.LINE_STRIP,0,vertices.length*0.5);







};

CanvasGL.prototype.beginSpline =  function()
{
    this._tempSplineVertices = [];
};

CanvasGL.prototype.endSpline =  function()
{
    this.catmullRomSpline(this._tempSplineVertices);
};

CanvasGL.prototype.splineVertex = function(x,y)
{
    this._tempSplineVertices.push(x,y)
}



CanvasGL.prototype._catmullrom = function(x0,x1,x2,x3,u)
{
    var u3 = u * u * u;

    var u2 = u * u;

    var f1 = -0.5 * u3 + u2 - 0.5 * u;

    var f2 =  1.5 * u3 - 2.5 * u2 + 1.0;

    var f3 = -1.5 * u3 + 2.0 * u2 + 0.5 * u;

    var f4 =  0.5 * u3 - 0.5 * u2;

    return x0 * f1 + x1 * f2 + x2 * f3 + x3 * f4;

};

/*
CanvasGL.prototype.catmullRomSplinePatch = function(x1,y1,x3,y3,x0,y0,x2,y2)
{
    var h00,h10,h01,h11, t,t2,t3;

    var d = this._currSplineDetail;

    var i = 0;
    var vertices =this._tempBufferSplineVertices;

    while(i < d)
    {
        t  = i / (d-2);
        t2 = t * t;
        t3 = t * t * t;

        h00 =  2*t3-3*t2+1;
        h10 = -2*t3+3*t2;
        h01 =  t3-2*t2+t;
        h11 =  t3-t2;

        //vertices[i]  = x0*h00 + x3*h10 + x1*h01 + x2*h11;
        //vertices[i+1]= y0*h00 + y3*h10 + y1*h01 + y2*h11;

        vertices[i]  = 0.25*((2*x1)+(-x0+x2)*t+(2*x0-5*x1+4*x2-x3)*t2+(-x0+3*x1-3*x2+x3)*t3);
        vertices[i+1]= 0.25*((2*y1)+(-y0+y2)*t+(2*y0-5*y1+4*y2-y3)*t2+(-y0+3*y1-3*y2+y3)*t3);

        i+=2;
    }

    var gl = this.gl;

    gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);
    this._applyStroke();
    this._setMvMatrixUniform();
    gl.drawArrays(gl.LINE_STRIP,0,d*0.5);



};
*/

CanvasGL.prototype.triangleMesh = function(vertices,indices)
{
    if(!this._fill)return;

    var gl = this.gl;
    var ind = new Uint16Array(indices || this._indicesLinearCW(vertices));

    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,ind,gl.DYNAMIC_DRAW);

    if(this._fill)
    {
        this._applyFill();
        this._setMvMatrixUniform();
        gl.drawElements(gl.TRIANGLES,ind.length,gl.UNSIGNED_SHORT,0);
    }
};

CanvasGL.prototype.triangle = function(x0,y0,x1,y1,x2,y2)
{
    if(!this._fill && !this._stroke)return;

    var gl = this.gl;
    var v  = this._tempTriangleVertices;
    v[0] = x0;
    v[1] = y0;
    v[2] = x1;
    v[3] = y1;
    v[4] = x2;
    v[5] = y2;
    gl.bufferData(gl.ARRAY_BUFFER,v,gl.DYNAMIC_DRAW);
    this._setMvMatrixUniform();
    if(this._fill)
    {
        this._applyFill();
        gl.drawArrays(gl.TRIANGLES,0,3);
    }

    if(this._stroke)
    {
        this._applyStroke();
        gl.drawArrays(gl.LINE_LOOP,0,3);
    }
};

CanvasGL.prototype.point = function(x,y)
{
    if(!this._fill)return;
    var gl = this.gl;
    var v  = this._tempPointVertices;
    v[0] = x;
    v[1] = y;
    gl.bufferData(gl.ARRAY_BUFFER,v,gl.DYNAMIC_DRAW);
    this._applyFill();
    this._setMvMatrixUniform();
    gl.drawArrays(gl.POINTS,0,1);
};

CanvasGL.prototype.lines = function(vertices)
{
    if(!this._stroke)return;
    var gl  = this.gl;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
    this._applyStroke();
    this._setMvMatrixUniform();
    gl.drawArrays(gl.LINE_STRIP,0,vertices.length*0.5);
};

CanvasGL.prototype.points = function(vertices)
{
    if(!this._fill)return;
    var gl  = this.gl;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
    this._applyFill();
    this._setMvMatrixUniform();
    gl.drawArrays(gl.POINTS,0,vertices.length*0.5);
};


/*---------------------------------------------------------------------------------------------------------*/
// Image & Texture
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
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);


        target._set(tex);
        obj[callbackString]();
    };
    tex.image.src = path;
};

CanvasGL.prototype.image = function(image, x, y, width, height)
{
    var rm = this._rectMode;
    var w = width || image.width, h = height || image.height;
    var xx = x || 0 + (rm == 1 ? 0.0 : - w*0.5), yy = y || 0 + (rm == 1 ? 0.0 : - h*0.5);
    var xw = xx+w,yh = yy+h;

    this.texture(image);
    this.rect(xx,yy,w,h);
    this.noTexture();

};

/*---------------------------------------------------------------------------------------------------------*/
// Shader loading
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
// Internal Matrix apply
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
// Public Matrix transformations
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
// Drawing matrix stack manipulation
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
// Private matrix
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
// Helper
/*---------------------------------------------------------------------------------------------------------*/

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

CanvasGL.prototype._np2 = function(n)
{
    n--;
    n |= n>>1;
    n |= n>>2;
    n |= n>>4;
    n |= n>>8;
    n |= n>>16;
    n++;
    return n;
};

CanvasGL.prototype._pp2 = function(n)
{
    var n2 = n>>1;
    return n2>0 ? this._np2(n2) : this._np2(n);
};

CanvasGL.prototype._nnp2 = function(n)
{
    if((n&(n-1))==0)return n;
    var nn = this._np2(n);
    var pn = this._pp2(n);
    return (nn-n)>Math.abs(n-pn) ? pn : nn;

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
// Text
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.FontRenderer = {DOM:"DOM",Canvas:"Canvas"};

CanvasGL.prototype.setFontRenderer = function(renderer)
{

};

CanvasGL.prototype.setFontWeight = function(weight)
{
    this._fontProperties.weight = weight;
    this._c2dApplyFontStyle();
};

CanvasGL.prototype.setFontSize = function(size)
{
    this._fontProperties.size = size;
    this._c2dApplyFontStyle();
};

CanvasGL.prototype.setFontFamily = function(family)
{
    this._fontProperties.family = family;
    this._c2dApplyFontStyle();
};

CanvasGL.prototype.setTextBaseLine = function (textBaseLine)
{
    this._fontProperties.baseLine = textBaseLine;
    this._c2dApplyFontStyle();
};

CanvasGL.prototype.setTextAlign = function (textAlign)
{
    this._fontProperties.textAlign = textAlign;
    this._c2dApplyFontStyle();
};

CanvasGL.prototype.setTextLineHeight = function(lineHeight)
{
    this._fontProperties.lineHeight = lineHeight;
    this._c2dApplyFontStyle();
};

CanvasGL.prototype.textWidth = function(string)
{
    return this._gl2d.measureText(string).width;
};

CanvasGL.prototype.textHeight = function()
{
    return this._fontProperties.size;
};


CanvasGL.prototype.text = function(string,x,y)
{


    var gl  = this.gl;
    var c2d = this._gl2d;
    var fc  = this._fillColor;

    var mt = c2d.measureText(string);
    var tw = Math.floor(mt.width+mt.width*0.5),
        th = Math.floor(this._fontProperties.size)-1;

    var cw = this._np2(tw),
        ch = this._np2(th);

    this._c2dSetSize(cw,ch);


    c2d.save();
    c2d.setTransform(1,0,0,1,0,0);

    c2d.clearRect(0,0,this._gl2dCanvas.width,this._gl2dCanvas.height);
    c2d.fillStyle = "rgba("+Math.floor(fc[0]*255)+","+Math.floor(fc[1]*255)+","+Math.floor(fc[2]*255)+","+fc[3]+")";
    c2d.strokeStyle='rgba(0,0,0,1)';
    this._c2dApplyFontStyle();
    c2d.textBaseline = 'top';
    c2d.fillText(string,0,-th*0.18);
    //c2d.strokeText(string,0,-th*0.18);
    //c2d.fillRect(0,0,this._gl2dCanvas.width,this._gl2dCanvas.height);
    c2d.restore();




    this._setCurrTexture(this._c2dGetTexture());
    this.rect(x,y,cw,ch);



};

/*---------------------------------------------------------------------------------------------------------*/
// Canvas2d for textures
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype._c2dSetFontProperties = function (fontProperties)
{
    for (var p in fontProperties)
    {
        this._fontProperties[p] = fontProperties[p];
    }

    this._c2dApplyFontStyle();
};

CanvasGL.prototype._c2dApplyFontStyle = function()
{
    var gl2d = this._gl2d;
    var fprp = this._fontProperties;

    gl2d.textBaseline = fprp.baseLine;
    gl2d.textAlign    = fprp.textAlign;
    gl2d.lineHeight   = fprp.lineHeight;

    this._gl2d.font = this._fontProperties.weight + " " +
                      this._fontProperties.size + "px " +
                      this._fontProperties.family;

};

CanvasGL.prototype._c2dGetTexture = function()
{
    var gl  = this.gl;

    gl.bindTexture(gl.TEXTURE_2D,this._c2dTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._gl2dCanvas);

    return this._c2dTexture;
};

CanvasGL.prototype._c2dPrepareTexture = function()
{
    var gl  = this.gl;
    var c2d = this._gl2d;
    this._c2dSetSize(2,2);

    var tex = this.gl.createTexture();
    tex.image = this._gl2dCanvas;
    gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, tex.image);
    return tex;
};

CanvasGL.prototype._c2dSetSize = function(width,height)
{
    var gl2dC = this._gl2dCanvas;
    gl2dC.style.width  = width + 'px';
    gl2dC.style.height = height + 'px';
    gl2dC.width  = parseInt(gl2dC.style.width) ;
    gl2dC.height = parseInt(gl2dC.style.height) ;
};

CanvasGL.prototype._c2dBackground = function()
{
    var gl2d = this._gl2d;
    this._c2dNoStroke();
    this._gl2d.fillStyle = "rgba(255,255,255,1)";
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


