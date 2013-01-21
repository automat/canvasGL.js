/**
 * User: Henryk Wollik
 * Date: 27.12.12
 * Time: 09:37
 */




CGL = {};
CGL.SIZE_OF_VERTEX = 2;

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

    this._usedBrowser    = null;
    this._implementation = null;
    var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
    this.gl = null;
    for(var i = 0; i < names.length;++i)
    {
        try
        {
            this.gl = this._glCanvas.getContext(names[i],{ antialias: true});
        } catch (e){console.log("WebGL context could not be initialized");}
        if(this.gl){this._implementation = names[i];break;}
    }


    // Setup and load vertex shader

    this._vertexShader = this._loadShader(

            "uniform   mat3 a_matrix;" +
            "attribute vec2 a_position; " +
            "uniform   vec2 u_resolution;" +
            "attribute vec2 a_texture_coord;" +
            "varying   vec2 v_texture_coord;" +
            "attribute vec4 a_vertex_color;"+
            "varying   vec4 v_vertex_color;" +

            "void main()" +
            "{" +
                "vec2 clipSpace  = vec2(a_matrix * vec3(a_position.xy,1)).xy / u_resolution * 2.0 - 1.0;" +
                "gl_Position     = vec4(clipSpace.x,-clipSpace.y,0,1);" +
                "v_texture_coord = a_texture_coord;" +
                "v_vertex_color  = a_vertex_color;" +
            "}",

        this.gl.VERTEX_SHADER);


    // Setup and load fragment shader

    this._fragmentColorShader = this._loadShader(

            "precision mediump float;" +
            "uniform vec4      u_color;" +
            "uniform float     u_use_texture;" +
            "uniform float     u_use_vertex_color;" +
            "uniform sampler2D u_image;" +
            "uniform float     u_alpha;" +
            "varying vec2      v_texture_coord;" +
            "varying vec4      v_vertex_color;" +

            "void main()" +
            "{" +
                "vec4 texColor  = texture2D(u_image,v_texture_coord);" +
                //"vec4 vertColor = u_color * (1.0 - u_use_texture);" +
                //"gl_FragColor   = v_vertex_color*(1.0-u_use_texture)+texColor;" +
                //"gl_FragColor   = v_vertex_color*(1.0-u_use_texture)+texColor;" +
                "gl_FragColor = v_vertex_color * (1.0 - u_use_texture) + texColor * u_use_texture;"+
            "}",

        this.gl.FRAGMENT_SHADER);


    // Load and init program & set size to default

    this._program        = this._loadProgram();
    var gl = this.gl;gl.useProgram(this._program);

    this.setSize(_CGLConstants.WIDTH_DEFAULT,_CGLConstants.HEIGHT_DEFAULT);


    // Save attribute and uniform locations from shader

    this._locationAttribPosition        = gl.getAttribLocation( this._program, "a_position");
    this._locationTransMatrix           = gl.getUniformLocation(this._program, "a_matrix");
    this._locationAttribTextureCoord    = gl.getAttribLocation( this._program, "a_texture_coord");
    this._locationAttribVertexColor     = gl.getAttribLocation( this._program, "a_vertex_color");
    this._locationUniformResolution     = gl.getUniformLocation(this._program, "u_resolution");
    this._locationUniformColor          = gl.getUniformLocation(this._program, "u_color");
    this._locationUniformImage          = gl.getUniformLocation(this._program, "u_image");
    this._locationUniformAlpha          = gl.getUniformLocation(this._program, "u_alpha");
    this._locationUniformUseTexture     = gl.getUniformLocation(this._program, "u_use_texture");
    this._locationUniformUseVertexColor = gl.getUniformLocation(this._program, "u_use_vertex_color");


    // Create Buffers

    this._vbo = gl.createBuffer();
    this._ibo = gl.createBuffer();
    this._cbo = gl.createBuffer();


    // Create default blank texture and texture coords / use color and set alpha to 1.0

    this._blankTexture = gl.createTexture();
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

    gl.enableVertexAttribArray(this._locationAttribVertexColor);
    //gl.vertexAttribPointer(    this._locationAttribVertexColor,4,gl.FLOAT,false,0,0);


    // Create matrix stack and apply to shader

    this._transMatrix  = this.__makeMat33();
    this._tempMatrix   = this.__makeMat33();
    this._transMatrixStack = [];

    gl.uniformMatrix3fv(this._locationTransMatrix,false,new Float32Array(this._transMatrix));


    // Enable gl flags

    gl.enable(gl.BLEND);


    // Create canvas for canvas textures

    this._gl2dCanvas = document.createElement('canvas');
    this._gl2d = this._gl2dCanvas.getContext('2d');

    // Set draw modes

    this._isPixelPerfect = false;

    this._ellipseMode = CanvasGL.CENTER;
    this._rectMode    = CanvasGL.CORNER;
    this._textureWrap = CanvasGL.CLAMP;
    this._fill        = true;
    this._stroke      = true;
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


    // Init temp values & arrays

    this._tempBezierPoints = new Array(8);

    this._tempQuadTexCoords         = new Float32Array([ 0.0, 0.0,
                                                         0.0, 1.0,
                                                         1.0, 1.0,
                                                         1.0, 0.0 ]);

    this._tempQuadTexCoords6        = new Float32Array([0.0,0.0,
                                                        1.0,0.0,
                                                        0.0,1.0,
                                                        1.0,0.0,
                                                        1.0,1.0,
                                                        0.0,1.0]);

    this._tempBufferQuadVertices12  = new Float32Array(12);


    this._tempBufferQuadVertices          = new Float32Array(8);
    this._tempBufferTriangleVertices      = new Float32Array(6);
    this._tempBufferLineVertices          = new Float32Array(4);
    this._tempBufferPointVertices         = new Float32Array(2);
    this._tempBufferCircleVertices        = new Float32Array(_CGLConstants.ELLIPSE_DETAIL_MAX*2);
    this._tempBufferBezierVertices        = new Float32Array(_CGLConstants.BEZIER_DETAIL_MAX*2);
    this._tempBufferArcVertices           = new Float32Array(_CGLConstants.ELLIPSE_DETAIL_MAX*4);
    this._tempBufferSplineVertices        = new Float32Array(_CGLConstants.SPLINE_DETAIL_MAX*4);
    this._tempBufferVertexColor           = new Float32Array(4);


    this._tempBufferQuadColors            = new Float32Array(this._color1fArr(1.0,4*4));
    this._tempBufferTriangleColors        = new Float32Array(this._color1fArr(1.0,3*4));
    this._tempBufferLineColors            = new Float32Array(this._color1fArr(1.0,2*4));
    this._tempBufferPointColor            = new Float32Array(this._color1fArr(1.0,4));
    this._tempBufferCircleColors          = null;

    this._tempBlankQuadColors = new Float32Array([1.0,1.0,1.0,1.0,
                                                  1.0,1.0,1.0,1.0,
                                                  1.0,1.0,1.0,1.0,
                                                  1.0,1.0,1.0,1.0]);

    this._tempBlankQuadColors6 = new Float32Array([1.0,1.0,1.0,1.0,
                                                   1.0,1.0,1.0,1.0,
                                                   1.0,1.0,1.0,1.0,
                                                   1.0,1.0,1.0,1.0,
                                                   1.0,1.0,1.0,1.0,
                                                   1.0,1.0,1.0,1.0]);

    this._tempFillColor4   = colorf(1.0,1.0);
    this._tempStrokeColor4 = colorf(1.0,1.0);
    this._tempColorArr = [];
    this._fillColor    = this._tempFillColor4;
    this._strokeColor  = this._tempStrokeColor4;


    this._usePerVertexColoring = false;

    this._tempScreenCoords = new Array(2);
    this._tempSplineVertices = [];

    this._currEllipseDetail = _CGLConstants.ELLIPSE_DETAIL_DEFAULT;
    this._currBezierDetail  = _CGLConstants.BEZIER_DETAIL_DEFAULT;
    this._currSplineDetail  = _CGLConstants.SPLINE_DETAIL_DEFAULT;

    this._currBlendSrc  = gl.SRC_ALPHA;
    this._currBlendDest = gl.ONE_MINUS_SRC_ALPHA;

    // Immidiate mode wrapper (Insprired by Memo Akten)

    this._imDEFAULT_RESERVE_AMOUNT= 500;


    this._tempShapeVertices = new _CGLInternal.PoolArray(100);

    // Attach canvas to parent DOM element

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
CanvasGL.WRAP   = 2;
CanvasGL.CLAMP  = 3;

CanvasGL.SRC_ALPHA           = 770;
CanvasGL.ONE_MINUS_SRC_ALPHA = 771;
CanvasGL.SRC_COLOR = 768;
CanvasGL.ONE_MINUS_SRC_COLOR = 769;

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

CanvasGL.prototype.setTextureWrap = function(mode)
{
    this._textureWrap = mode;
};

CanvasGL.prototype.setBlendFunc = function(src,dest)
{
    this._currBlendSrc = src;
    this._currBlendDest = dest;
};

CanvasGL.prototype.setPixelPerfect = function(b)
{
    this._isPixelPerfect = b;
};

CanvasGL.prototype.getPixelPerfect = function()
{
    return this._isPixelPerfect;
};

CanvasGL.prototype.getEllipseDetail = function()
{
    return this._currEllipseDetail;
};

CanvasGL.prototype.getBezierDetail = function()
{
    return this._currBezierDetail;
};

CanvasGL.prototype.getSplineDetail = function()
{
    return this._currSplineDetail;
};

/*---------------------------------------------------------------------------------------------------------*/
// Shape fill/stroke/texture
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype._applyFill = function()
{

    var gl = this.gl;
    var cf = this._fillColor;
    gl.uniform4f(this._locationUniformColor,cf[0],cf[1],cf[2],cf[3]);
    gl.uniform1f(this._locationUniformAlpha,cf[3]);

};

CanvasGL.prototype.fill = function()
{

    var f = this._fillColor = this._tempFillColor4;

    f[3] = 1.0;

    switch (arguments.length)
    {
        case 0:
            f[0] = f[1] = f[2]  = 0.0;
            break;
        case 1:
            f[0] = f[1] = f[2]  = arguments[0]/255;
            break;
        case 2:
            f[0] = f[1] = f[2]  = arguments[0]/255;
            f[3] = arguments[1];
            break;
        case 3:
            f[0] = arguments[0]/255;
            f[1] = arguments[1]/255;
            f[2] = arguments[2]/255;
            break;
        case 4:
            f[0] = arguments[0]/255;
            f[1] = arguments[1]/255;
            f[2] = arguments[2]/255;
            f[3] = arguments[3];
            break;
    }

    this._perVertexColoring(false);
    this._fill = true;
};

CanvasGL.prototype.fill1i = function(k)
{
    var f = this._fillColor = this._tempFillColor4;
    f[0] = f[1] = f[2] = k/255;f[3] = 1.0;
    this._perVertexColoring(false);
    this._fill = true;
};

CanvasGL.prototype.fill2i = function(k,a)
{
    var f = this._fillColor = this._tempFillColor4;
    f[0] = f[1] = f[2] = k/255;f[3] = a;
    this._perVertexColoring(false);
    this._fill = true;
};

CanvasGL.prototype.fill3i = function(r,g,b)
{
    var f = this._fillColor = this._tempFillColor4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = 1.0;
    this._perVertexColoring(false);
    this._fill = true;
};

CanvasGL.prototype.fill4i = function(r,g,b,a)
{
    var f = this._fillColor = this._tempFillColor4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = a;
    this._perVertexColoring(false);
    this._fill = true;
};

CanvasGL.prototype.fill1f = function(k)
{
    var f = this._fillColor = this._tempFillColor4;
    f[0] = f[1] = f[2] = k;f[3] = 1.0;
    this._perVertexColoring(false);
    this._fill = true;
};

CanvasGL.prototype.fill2f = function(k,a)
{
    var f = this._fillColor = this._tempFillColor4;
    f[0] = f[1] = f[2] = k;f[3] = a;
    this._perVertexColoring(false);
    this._fill = true;
};

CanvasGL.prototype.fill3f = function(r,g,b)
{
    var f = this._fillColor = this._tempFillColor4;;
    f[0] = r;f[1] = g; f[2] = b;f[3] = 1.0;
    this._perVertexColoring(false);
    this._fill = true;
};

CanvasGL.prototype.fill4f = function(r,g,b,a)
{
    var f = this._fillColor = this._tempFillColor4;;
    f[0] = r;f[1] = g; f[2] = b;f[3] = a;
    this._perVertexColoring(false);
    this._fill = true;
};

CanvasGL.prototype.fillArr =  function(a)
{
    this._fillColor = a;
    this._perVertexColoring(true);
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
    gl.uniform4f(this._locationUniformColor,cf[0],cf[1],cf[2],cf[3]);
    gl.uniform1f(this._locationUniformAlpha,cf[3]);
};

CanvasGL.prototype.stroke = function()
{
    var f = this._strokeColor = this._tempStrokeColor4;

    f[3] = 1.0;

    switch (arguments.length)
    {
        case 0:
            f[0] = f[1] = f[2]  = 0.0;
            break;
        case 1:
            f[0] = f[1] = f[2]  = arguments[0]/255;
            break;
        case 2:
            f[0] = f[1] = f[2]  = arguments[0]/255;
            f[3] = arguments[1];
            break;
        case 3:
            f[0] = arguments[0]/255;
            f[1] = arguments[1]/255;
            f[2] = arguments[2]/255;
            break;
        case 4:
            f[0] = arguments[0]/255;
            f[1] = arguments[1]/255;
            f[2] = arguments[2]/255;
            f[3] = arguments[3];
            break;
    }

    this._perVertexColoring(false);
    this._stroke = true;
};

CanvasGL.prototype.stroke1i = function(k)
{
    var f = this._strokeColor = this._tempStrokeColor4;
    f[0] = f[1] = f[2] = k/255;f[3] = 1.0;
    this._perVertexColoring(false);
    this._stroke = true;
};

CanvasGL.prototype.stroke2i = function(k,a)
{
    var f = this._strokeColor = this._tempStrokeColor4;
    f[0] = f[1] = f[2] = k/255;f[3] = a;
    this._perVertexColoring(false);
    this._stroke = true;
};

CanvasGL.prototype.stroke3i = function(r,g,b)
{
    var f = this._strokeColor = this._tempStrokeColor4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = 1.0;
    this._perVertexColoring(false);
    this._stroke = true;
};

CanvasGL.prototype.stroke4i = function(r,g,b,a)
{
    var f = this._strokeColor = this._tempStrokeColor4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = a;
    this._perVertexColoring(false);
    this._stroke = true;
};

CanvasGL.prototype.stroke1f = function(k)
{
    var f = this._strokeColor = this._tempStrokeColor4;
    f[0] = f[1] = f[2] = k;f[3] = 1.0;
    this._perVertexColoring(false);
    this._stroke = true;
};

CanvasGL.prototype.stroke2f = function(k,a)
{
    var f = this._strokeColor = this._tempStrokeColor4;
    f[0] = f[1] = f[2] = k;f[3] = a;
    this._perVertexColoring(false);
    this._stroke = true;
};

CanvasGL.prototype.stroke3f = function(r,g,b)
{
    var f = this._strokeColor = this._tempStrokeColor4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = 1.0;
    this._perVertexColoring(false);
    this._stroke = true;
};

CanvasGL.prototype.stroke4f = function(r,g,b,a)
{
    var f = this._strokeColor = this._tempStrokeColor4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = a;
    this._perVertexColoring(false);
    this._stroke = true;
};

CanvasGL.prototype.strokeArr = function(a)
{
    this._strokeColor = a;
    this._perVertexColoring(true);
    this._stroke = true;
};

CanvasGL.prototype.noStroke = function()
{
    this._stroke = false;
};

CanvasGL.prototype._applyColorToColorBuffer = function(color,buffer,mode)
{
    var i = 0;

    if(color.length == 4)
    {
        while(i < buffer.length)
        {
            buffer[i]  =color[0];
            buffer[i+1]=color[1];
            buffer[i+2]=color[2];
            buffer[i+3]=color[3];
            i+=4;
        }
    }
    else
    {
        if(color.length != buffer.length)
        {
            console.log("Color array length not equal to number of vertices.");
            return buffer;
        }

        while(i < buffer.length)
        {
            buffer[i]   = color[i];
            buffer[i+1] = color[i+1];
            buffer[i+2] = color[i+2];
            buffer[i+3] = color[i+3];
            i+=4;
        }
    }
    return buffer;
};

CanvasGL.prototype._color1fArr = function(k,length)
{
    var a = new Array(length);
    var i = -1;
    while(++i < length){a[i]=k;}
    return a;
};

CanvasGL.prototype._perVertexColoring = function(b)
{
    this.gl.uniform1f(this._locationUniformUseVertexColor,b ? 1.0 : 0.0);
    this._usePerVertexColoring = b;
};

CanvasGL.prototype._lerpedColor = function(col0,col1,steps)
{
    var a = new Array(steps*4);
    var alen = a.length;
    var i = 0,index,normlerp;

    while(i< alen)
    {
        index = i;
        normlerp = index*4 / alen;
        a[index] =(col0[0]*(normlerp))+(col1[0]*(1-normlerp));

        index = i+1;
        normlerp = index*4 / alen;
        a[index] =(col0[1]*(normlerp))+(col1[1]*(1-normlerp));

        index = i+2;
        normlerp = index*4 / alen;
        a[index] =(col0[2]*(normlerp))+(col1[2]*(1-normlerp));

        index = i+3;
        normlerp = index*4 / alen;
        a[index] =(col0[3]*(normlerp))+(col1[3]*(1-normlerp));

        i+=4;
    }

    return a;

};

CanvasGL.prototype._fillBuffer = function(vertexArray,colorArray)
{
    var gl  = this.gl;
    var glArrayBuffer = gl.ARRAY_BUFFER,
        glDynamicDraw = gl.DYNAMIC_DRAW,
        glFloat       = gl.FLOAT;

    var vblen = vertexArray.byteLength,
        cblen = colorArray.byteLength;

    gl.bufferData(glArrayBuffer,vblen + cblen,glDynamicDraw);
    gl.bufferSubData(glArrayBuffer,0,vertexArray);
    gl.bufferSubData(glArrayBuffer,vblen,colorArray);
    gl.vertexAttribPointer(this._locationAttribPosition,2,glFloat,false,0,0);
    gl.vertexAttribPointer(this._locationAttribVertexColor,4,glFloat,false,0,vblen);
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
    gl.uniform1f(this._locationUniformUseTexture,0.0);
};

CanvasGL.prototype.texture = function(img,offsetX,offsetY,width,height)
{
    var tc = this._tempQuadTexCoords;
    var gl = this.gl;
    if(offsetX  )
    {
        offsetY = offsetY || 0;
        width  = 1/width  || 1;
        height = 1/height || 1;

        tc[0]=offsetX; //0
        tc[1]=offsetY;

        tc[2]=offsetX+width; //1
        tc[3]=offsetY;

        tc[4]=offsetX; //3
        tc[5]=offsetY+height;

        tc[6]=offsetX+width; //1
        tc[7]=offsetY;

        tc[8]=offsetX+width; //2
        tc[9]=offsetY+height;

        tc[10]=offsetX; //3
        tc[11]=offsetY+height;

        gl.bindTexture(gl.TEXTURE_2D,img._t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.bindTexture(gl.TEXTURE_2D,this._blankTexture);
        this._setCurrTexture(img._t);
        return;
    }

    tc[0]=0.0; //0
    tc[1]=0.0;

    tc[2]=1.0; //1
    tc[3]=0.0;

    tc[4]=0.0; //3
    tc[5]=1.0;

    tc[6]=1.0; //1
    tc[7]=0.0;

    tc[8]=1.0; //2
    tc[9]=1.0;

    tc[10]=0.0; //3
    tc[11]=1.0;

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

CanvasGL.prototype.blend = function()
{
    this.gl.blendFunc(this._currBlendSrc,this._currBlendDest);
};

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
    this._texture = false;
};

/*---------------------------------------------------------------------------------------------------------*/
// Drawing primitives
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.textureTest = function(x,y,width,height)
{
    var gl = this.gl;

    var v = this._tempBufferQuadVertices,
        c = this._tempBufferQuadColors,
        t = this._tempQuadTexCoords;

    var vblen = v.byteLength,
        cblen = c.byteLength,
        tblen = t.byteLength,
        tlen  = vblen + cblen + tblen;

    var offSetV = 0,
        offSetC = offSetV + vblen,
        offSetT = vblen + cblen;

    var xw = x+width,
        yh = y+height;



    v[ 0] = x;
    v[ 1] = y;
    v[ 2] = x;
    v[ 3] = yh;
    v[ 4] = xw;
    v[ 5] = yh;
    v[ 6] = xw;
    v[ 7] = y;




    gl.bindBuffer(gl.ARRAY_BUFFER,this._vbo);
    gl.bufferData(gl.ARRAY_BUFFER,tlen,gl.DYNAMIC_DRAW);

    gl.bufferSubData(gl.ARRAY_BUFFER,0,v);
    gl.bufferSubData(gl.ARRAY_BUFFER,offSetC,c);
    gl.bufferSubData(gl.ARRAY_BUFFER,offSetT,t);

    gl.vertexAttribPointer(this._locationAttribPosition,    2,gl.FLOAT,false,0,offSetV);
    gl.vertexAttribPointer(this._locationAttribVertexColor, 4,gl.FLOAT,false,0,offSetC);
    gl.vertexAttribPointer(this._locationAttribTextureCoord,2,gl.FLOAT,false,0,offSetT);

    gl.uniform1f(this._locationUniformUseTexture,0.5);
    gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);
    gl.uniform1f(this._locationUniformImage,0);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

    this._disableTexture();

    /*
    var gl = this.gl;

    var v = this._tempBufferQuadVertices,
        c = this._tempBufferQuadColors,
        t = this._tempQuadTexCoords;

    var vblen = v.byteLength,
        cblen = c.byteLength,
        tblen = t.byteLength,
        tlen  = vblen + cblen + tblen;

    var offSetV = 0,
        offSetC = offSetV + vblen,
        offSetT = vblen + cblen;

    var xw = x+width,
        yh = y+height;



    v[ 0] = x;
    v[ 1] = y;
    v[ 2] = xw;
    v[ 3] = y;
    v[ 4] = xw;
    v[ 5] = yh;
    v[ 6] = x;
    v[ 7] = yh;




    gl.bindBuffer(gl.ARRAY_BUFFER,this._vbo);
    gl.bufferData(gl.ARRAY_BUFFER,tlen,gl.DYNAMIC_DRAW);

    gl.bufferSubData(gl.ARRAY_BUFFER,0,v);
    gl.bufferSubData(gl.ARRAY_BUFFER,offSetC,c);
    gl.bufferSubData(gl.ARRAY_BUFFER,offSetT,t);

    gl.vertexAttribPointer(this._locationAttribPosition,    2,gl.FLOAT,false,0,offSetV);
    gl.vertexAttribPointer(this._locationAttribVertexColor, 4,gl.FLOAT,false,0,offSetC);
    gl.vertexAttribPointer(this._locationAttribTextureCoord,2,gl.FLOAT,false,0,offSetT);

    gl.uniform1f(this._locationUniformUseTexture,0.5);
    gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);
    gl.uniform1f(this._locationUniformImage,0);
    gl.drawArrays(gl.TRIANGLE_FAN,0,4);

    this._disableTexture();
    */

};

CanvasGL.prototype.quad = function(x0,y0,x1,y1,x2,y2,x3,y3)
{
    if(!this._fill && !this._stroke && !this._texture)return;

    var gl = this.gl;
    var vbo = this._vbo;
    var v = this._tempBufferQuadVertices;
    var glArrayBuffer = gl.ARRAY_BUFFER,
        glDynamicDraw = gl.DYNAMIC_DRAW,
        glFloat       = gl.FLOAT;

    this._setMatrixUniform();

    v[ 0] = x0;
    v[ 1] = y0;
    v[ 2] = x1;
    v[ 3] = y1;
    v[ 4] = x3;
    v[ 5] = y3;
    v[ 6] = x2;
    v[ 7] = y2;

    var c;

    if(this._fill && !this._texture)
    {
        c = this._applyColorToColorBuffer(this._fillColor,this._tempBufferQuadColors,null);
        this._fillBuffer(v,c);
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }

    if(this._texture)
    {
        /*
        v = this._tempBufferQuadVertices12;
        v[ 0] = x0;
        v[ 1] = y0;
        v[ 2] = x1;
        v[ 3] = y1;
        v[ 4] = x3;
        v[ 5] = y3;
        v[ 6] = x1;
        v[ 7] = y1;
        v[ 8] = x2;
        v[ 9] = y2;
        v[10] = x3;
        v[11] = y3;

        c = this._tempBlankQuadColors6;
        var t = this._tempQuadTexCoords6;

        var vblen = v.byteLength,
            cblen = c.byteLength,
            tblen = t.byteLength;

        gl.bindBuffer(glArrayBuffer,vbo);
        gl.bufferData(glArrayBuffer,vblen + tblen,glDynamicDraw);
        gl.bufferSubData(glArrayBuffer,0,v);
        gl.bufferSubData(glArrayBuffer,vblen,t);
        gl.vertexAttribPointer(this._locationAttribPosition,2,gl.FLOAT,false,0,0);
        gl.vertexAttribPointer(this._locationAttribTextureCoord,2,gl.FLOAT,false,0,vblen);
        this._applyTexture();
        gl.drawArrays(gl.TRIANGLES,0,6);
        */

        /*
        gl.bindBuffer(glArrayBuffer,vbo);
        gl.bufferData(glArrayBuffer,vblen + tblen + cblen,glDynamicDraw);

        gl.bufferSubData(glArrayBuffer,0,          v);
        gl.bufferSubData(glArrayBuffer,vblen      ,t);
        //gl.bufferSubData(glArrayBuffer,vblen+tblen,c);

        gl.vertexAttribPointer(this._locationAttribPosition,    2,glFloat,false,0,0);
        gl.vertexAttribPointer(this._locationAttribTextureCoord,2,glFloat,false,0,vblen);
        //gl.vertexAttribPointer(this._locationAttribVertexColor, 4,glFloat,false,0,tblen);

        gl.uniform1f(this._locationUniformUseTexture,1.0);
        gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);
        gl.uniform1f(this._locationUniformImage,0);
        //gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        gl.drawArrays(gl.TRIANGLES,0,6);
        gl.uniform1f(this._locationUniformUseTexture,0.0);
        */
    }

    if(this._stroke)
    {
        c = this._applyColorToColorBuffer(this._strokeColor,this._tempBufferQuadColors,null);
        v[ 0] = x0;
        v[ 1] = y0;
        v[ 2] = x1;
        v[ 3] = y1;
        v[ 4] = x2;
        v[ 5] = y2;
        v[ 6] = x3;
        v[ 7] = y3;
        this._fillBuffer(v,c);
        gl.drawArrays(gl.LINE_LOOP,0,4);
    }
};

CanvasGL.prototype.rect = function(x,y,width,height)
{
    var xw = x+width,yh = y+height;
    this.quad(x,y,xw,y,xw,yh,x,yh);
};

CanvasGL.prototype.ellipse = function(x,y,radiusX,radiusY)
{
    if(!this._fill && !this._stroke)return;

    var cm = this._ellipseMode;

    var cx = cm == 0 ? x : x + radiusX;
    var cy = cm == 0 ? y : y + radiusY;

    var d = this._currEllipseDetail;
    var v = this._tempBufferCircleVertices;
    var l = d * 2;

    var step = Math.PI / d;
    var i = 0;
    var s;

    while(i < l)
    {
        s      = step * i;
        v[i]   = cx + radiusX * Math.cos(s);
        v[i+1] = cy + radiusY * Math.sin(s);
        i+=2;
    }

    var gl  = this.gl;
    var cb = new Float32Array(d*4);
    var c;
    this._setMatrixUniform();

    if(this._fill && !this._texture)
    {
        c = this._applyColorToColorBuffer(this._fillColor,cb,null);
        this._fillBuffer(v,c);
        gl.drawArrays(gl.TRIANGLE_FAN,0,d);
    }

    if(this._stroke)
    {
        c = this._applyColorToColorBuffer(this._strokeColor,cb,null);
        this._fillBuffer(v,c);
        gl.drawArrays(gl.LINE_LOOP,0,d);
    }
};

//http://slabode.exofire.net/circle_draw.shtml

CanvasGL.prototype.circle = function(x,y,radius)
{
    if(!this._fill && !this._stroke)return;

    var cm = this._ellipseMode;

    var cx = cm == 0 ? x : x + radius;
    var cy = cm == 0 ? y : y + radius;

    var d = this._currEllipseDetail;
    var v = this._tempBufferCircleVertices;
    var l = d * 2;

    var i = 0;

    var theta = 2 * Math.PI / d;
    var c = Math.cos(theta), s = Math.sin(theta);
    var t;
    var ox = radius, oy = 0;

    while(i < l)
    {
        v[i]   = ox + x;
        v[i+1] = oy + y;
        t  = ox;
        ox = c * ox - s * oy;
        oy = s * t  + c * oy;
        i+=2;
    }

    var gl  = this.gl;
    var cb = new Float32Array(d*4);
    this._setMatrixUniform();

    if(this._fill && !this._texture)
    {
        c = this._applyColorToColorBuffer(this._fillColor,cb,null);
        this._fillBuffer(v,c);
        gl.drawArrays(gl.TRIANGLE_FAN,0,d);
    }

    if(this._stroke)
    {
        c = this._applyColorToColorBuffer(this._strokeColor,cb,null);
        this._fillBuffer(v,c);
        gl.drawArrays(gl.LINE_LOOP,0,d);
    }
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

    this._setMatrixUniform();

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
    var v   = this._tempBufferLineVertices,
        c   = this._applyColorToColorBuffer(this._strokeColor,this._tempBufferLineColors,null);

    var glArrayBuffer = gl.ARRAY_BUFFER,
        glFloat       = gl.FLOAT,
        glDynamicDraw = gl.DYNAMIC_DRAW;

    var vblen = v.byteLength,
        cblen = c.byteLength;

    v[0] = x0;v[1] = y0;
    v[2] = x1;v[3] = y1;

    this._setMatrixUniform();
    this._fillBuffer(v,c);
    gl.drawArrays(gl.LINES,0,2);
};

CanvasGL.prototype.beginShape = function(){};

CanvasGL.prototype.endShape = function(){};

CanvasGL.prototype.vertex = function(x,y){};

CanvasGL.prototype.bezier = function(x0,y0,x1,y1,x2,y2,x3,y3)
{
    var d = this._currBezierDetail;
    var p = this._tempBezierPoints;

    p[0] = x0;p[1] = y0;
    p[2] = x2;p[3] = y2;
    p[4] = x1;p[5] = y1;
    p[6] = x3;p[7] = y3;

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
    this._setMatrixUniform();
    gl.drawArrays(gl.LINE_STRIP,0,d*0.5);
};

CanvasGL.prototype.bezierPoint = function(d)
{
    var nt  = 1 - d,
        nt3 = nt * nt * nt,
        nt2 = nt * nt;

    var t3  = d * d * d,
        t2  = d * d;

    var p = this._tempBezierPoints;

    var x0 = p[0],y0 = p[1],
        x2 = p[2],y2 = p[3],
        x1 = p[4],y1 = p[5],
        x3 = p[6],y3 = p[7];

    return [nt3*x0+3*nt2*d*x1+3*nt*t2*x2+t3*x3,
            nt3*y0+3*nt2*d*y1+3*nt*t2*y2+t3*y3];

};

CanvasGL.prototype.catmullRomSpline = function(points)
{
    var tightness = 0.5;

    var d = this._currSplineDetail;

    var h0,h1,h2,h3;
    var t,t2,t3;

    var i = 0,j;

    var vertices = [];
    var pl = points.length;
    var ci,pi,ni,ni2;

    while(i < pl-1)
    {
        j = 0;
        while(j < d)
        {
            t = j/(d-2);

            ci = i;

            vertices.push(this._catmullrom(points[Math.max(0,i-2)],
                                           points[ci],
                                           points[Math.min(ci+2,pl-2)],
                                           points[Math.min(ci+4,pl-2)],
                                           t));

            ci = i+1;

            vertices.push(this._catmullrom(points[Math.max(1,ci-2)],
                                           points[ci],
                points[Math.min(ci+2,pl-1)],
                points[Math.min(ci+4,pl-1)],
                t));


            j+=2;
        }
        i+=2;
    }

    var gl = this.gl;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
    this._applyStroke();
    this._setMatrixUniform();
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
};

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

CanvasGL.prototype.mesh = function(vertices,faceIndices)
{
    if(!this._fill)return;

    var gl = this.gl;
    var ind = new Uint16Array(faceIndices || this._faceIndicesLinearCW(vertices));

    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,ind,gl.DYNAMIC_DRAW);

    if(this._fill)
    {
        this._applyFill();
        this._setMatrixUniform();
        gl.drawElements(gl.TRIANGLES,ind.length,gl.UNSIGNED_SHORT,0);
    }
};

CanvasGL.prototype.triangle = function(x0,y0,x1,y1,x2,y2)
{
    if(!this._fill && !this._stroke)return;

    var gl = this.gl;
    var v  = this._tempBufferTriangleVertices;
    v[0] = x0;
    v[1] = y0;
    v[2] = x1;
    v[3] = y1;
    v[4] = x2;
    v[5] = y2;
    gl.bufferData(gl.ARRAY_BUFFER,v,gl.DYNAMIC_DRAW);
    this._setMatrixUniform();
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
    var v  = this._tempBufferPointVertices;
    v[0] = x;
    v[1] = y;
    gl.bufferData(gl.ARRAY_BUFFER,v,gl.DYNAMIC_DRAW);
    this._applyFill();
    this._setMatrixUniform();
    gl.drawArrays(gl.POINTS,0,1);
};

CanvasGL.prototype.lines = function(vertices)
{
    if(!this._stroke)return;
    var gl  = this.gl;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
    this._applyStroke();
    this._setMatrixUniform();
    gl.drawArrays(gl.LINE_STRIP,0,vertices.length*0.5);
};

CanvasGL.prototype.points = function(vertices)
{
    if(!this._fill)return;
    var gl  = this.gl;
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
    this._applyFill();
    this._setMatrixUniform();
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

CanvasGLImage.prototype._set = function(t,i)
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

CanvasGL.prototype.getImagePixel = function(img)
{
    this._c2dSetImage(img);
    return this._c2dGetPixelData();
}

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
        console.log("Could not compile shader.");
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
        console.log("Could not link program.");
        gl.deleteProgram(program);
        program = null;
    }

    return program;
};

/*---------------------------------------------------------------------------------------------------------*/
// Screen Coords / unproject
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.getScreenCoord = function(x,y)
{
    x = x || 0;
    y = y || 0;

    var m = this._transMatrix;
    var s = this._tempScreenCoords;

    s[0] = m[ 0] * x + m[ 3] * y + m[6];
    s[1] = m[ 1] * x + m[ 4] * y + m[7];

    return s
};

/*---------------------------------------------------------------------------------------------------------*/
// Internal Matrix apply
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype._setMatrixUniform = function()
{
    this.gl.uniformMatrix3fv(this._locationTransMatrix,false,this._transMatrix);
};

CanvasGL.prototype._loadIdentity = function()
{
    this.__mat33Identity(this._transMatrix);
};

/*---------------------------------------------------------------------------------------------------------*/
// Public Matrix transformations
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.translate = function(x,y)
{
    this._transMatrix = this.__mat33MultPost(this._transMatrix,this.__makeMat33Translate(x,y));
};

CanvasGL.prototype.scale = function(x,y)
{
    this._transMatrix = this.__mat33MultPost(this._transMatrix,this.__makeMat33Scale(x,y));
};

CanvasGL.prototype.rotate = function(a)
{
    this._transMatrix = this.__mat33MultPost(this._transMatrix,this.__makeMat33Rotation(a));
};

/*---------------------------------------------------------------------------------------------------------*/
// Drawing matrix stack manipulation
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.pushMatrix = function()
{
    this._transMatrixStack.push(this.__makeMat33Copy(this._transMatrix));
};

CanvasGL.prototype.popMatrix = function()
{
    var stack = this._transMatrixStack;

    if(stack.length == 0)
    {
        throw "Invalid pop!";
    }

    this._transMatrix = stack.pop();

    return this._transMatrix;

};

/*---------------------------------------------------------------------------------------------------------*/
// Private matrix
/*---------------------------------------------------------------------------------------------------------*/

// Internal Matrix 3x3 class for all transformations



// SX  0  0   0  1  2
//  0 SY  0   3  4  5
// TX TY  1   6  7  8

CanvasGL.prototype.__tempMatrix = function()
{
    return this.__mat33Identity(this._tempMatrix);
};

CanvasGL.prototype.__makeMat33 = function()
{
    return new Float32Array([ 1, 0, 0,
                              0, 1, 0,
                              0, 0, 1]);
};

CanvasGL.prototype.__mat33Identity = function(m)
{
    m[ 0] = 1;m[ 4] = 1;m[ 8] = 1;
    m[ 1] = m[ 2] = m[ 3] = m[ 5] = m[ 6] = m[ 7] = 0;
    return m;
};

CanvasGL.prototype.__mat33Copy = function(m)
{
    return new Float32Array(m);
};

CanvasGL.prototype.__makeMat33Scale = function(x,y)
{
    var  m = this.__tempMatrix();
    m[0] = x;
    m[4] = y;
    return m;
};

CanvasGL.prototype.__makeMat33Translate = function(x,y)
{
    var  m = this.__tempMatrix();
    m[6] = x;
    m[7] = y;
    return m;
};

CanvasGL.prototype.__makeMat33Rotation = function(a)
{
    var  m = this.__tempMatrix();

    var sin = Math.sin(a),
        cos = Math.cos(a);

    m[0] = cos;
    m[1] = sin;
    m[3] = -sin;
    m[4] = cos;
    return m;
};

CanvasGL.prototype.__makeMat33Copy = function(m)
{
    var d = this.__makeMat33();

    d[ 0] = m[ 0];d[ 1] = m[ 1];d[ 2] = m[ 2];
    d[ 3] = m[ 3];d[ 4] = m[ 4];d[ 5] = m[ 5];
    d[ 6] = m[ 6];d[ 7] = m[ 7];d[ 8] = m[ 8];

    return d;
};

CanvasGL.prototype.__mat33MultPre = function(m0,m1)
{
    var m = this.__makeMat33();


   var m000 = m0[ 0],m001 = m0[ 1],m002 = m0[ 2],
       m003 = m0[ 3],m004 = m0[ 4],m005 = m0[ 5],
       m006 = m0[ 6],m007 = m0[ 7],m008 = m0[8];

   var m100 = m1[ 0],m101 = m1[ 1],m102 = m1[ 2],
       m103 = m1[ 3],m104 = m1[ 4],m105 = m1[ 5],
       m106 = m1[ 6],m107 = m1[ 7],m108 = m1[8];

    m[ 0] = m000*m100 + m001*m103 + m002*m106;
    m[ 1] = m000*m101 + m001*m104 + m002*m107;
    m[ 2] = m000*m102 + m001*m105 + m002*m108;

    m[ 3] = m003*m100 + m004*m103 + m005*m106;
    m[ 4] = m003*m101 + m004*m104 + m005*m107;
    m[ 5] = m003*m102 + m004*m105 + m005*m108;

    m[ 6] = m006*m100 + m007*m103 + m008*m106;
    m[ 7] = m006*m101 + m007*m104 + m008*m107;
    m[ 8] = m006*m102 + m007*m105 + m008*m108;

    return m;
};

CanvasGL.prototype.__mat33MultPost = function(mat0,mat1)
{
    return this.__mat33MultPre(mat1,mat0);
};

/*---------------------------------------------------------------------------------------------------------*/
// Helper
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype._faceIndicesLinearCW = function(vertices)
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

CanvasGL.prototype._faceIndicesLinearCCW = function(vertices)
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

CanvasGL.prototype._c2dGetPixelData = function(x,y,width,height)
{
    var gl2dC = this._gl2dCanvas;

    x      = x || 0;
    y      = y || 0;
    width  = width  || gl2dC.width;
    height = height || gl2dC.height;

    return this._gl2d.getImageData(x,y,width,height).data;
};

CanvasGL.prototype._c2dSetImage = function(img)
{
    var c2d = this._gl2d;
    this._c2dSetSize(img.width,img.height);
    c2d.save();
    c2d.setTransform(1,0,0,1,0,0);
    c2d.clearRect(0,0,this._gl2dCanvas.width,this._gl2dCanvas.height);
    c2d.drawImage(img._t.image,0,0);
    c2d.restore();

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

_CGLInternal = {};
_CGLInternal.PoolArray = function(reserveAmount)
{
    this._DEFAULT_SIZE = 100;
    this._array        = [];
    this._index        = 0;
    this._count        = 0;
    this._reservedSize = 0;
    this.reserve( reserveAmount );
};

_CGLInternal.PoolArray.prototype.reserve = function(amount)
{
    this._reservedSize = Math.round(amount);
    this._array.length = this._reservedSize;
};

_CGLInternal.PoolArray.prototype.reservedSize = function()
{
    return this._reservedSize;
};

_CGLInternal.PoolArray.prototype.size = function()
{
    return this._count;
};

_CGLInternal.PoolArray.prototype.add = function(obj)
{
    if(this._count >= this._reservedSize)
    {
        this.reserve(this._count*1.1);
    }

    this._array[this._index]=obj;
    this._index++;
    this._count++;
};

_CGLInternal.PoolArray.prototype.reset = function()
{
    this._count = 0;
    this._index = 0;
};

_CGLInternal.PoolArray.prototype.get = function(index)
{
    return this._array[index];
};

