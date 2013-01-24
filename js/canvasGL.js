/**
 * User: Henryk Wollik
 * Date: 27.12.12
 * Time: 09:37
 */




CGL =
{
    SIZE_OF_VERTEX:2
};

_CGLC =
{
    WIDTH_DEFAULT:300,
    HEIGHT_DEFAULT:300,

    BEZIER_DETAIL_DEFAULT:30,
    BEZIER_DETAIL_MAX:50,

    ELLIPSE_MODE_DEFAULT : 0,
    ELLIPSE_DETAIL_DEFAULT:10,
    ELLIPSE_DETAIL_MAX:50,

    RECT_MODE_DEFAULT : 1,

    SPLINE_DETAIL_DEFAULT:10,
    SPLINE_DETAIL_MAX:50,

    LINE_WIDTH_DEFAULT:1,
    LINE_ROUND_CAP_DETAIL_MAX:20,
    LINE_ROUND_CAP_DETAIL_MIN:3,

    TINT_DEFAULT:1.0,
    TINT_MAX    :1.0,
    TINT_MIN    :0.0,

    SIZE_OF_VERTEX:2,
    SIZE_OF_TRIANGLE:6,
    SIZE_OF_QUAD:8,
    SIZE_OF_LINE:4,
    SIZE_OF_POINT:2,
    SIZE_OF_COLOR:4,
    SIZE_OF_T_COORD:2,

    TEXT_DEFAULT_STYLE:'',
    TEXT_DEFAULT_WEIGHT:'normal',
    TEXT_DEFAULT_SIZE:8,
    TEXT_DEFAULT_FAMILY:'Arial',
    TEXT_DEFAULT_BASELINE:'bottom',
    TEXT_DEFAULT_ALIGN:'left',
    TEXT_DEFAULT_LINE_HEIGHT:'1',
    TEXT_DEFAULT_SPACING:'1'
};




/** ------------------------------------------------------------------------------------------------------------------
 *
 * CanvasGL class
 *
 * ---------------------------------------------------------------------------------------------------------------- */

function CanvasGL(parentDomElementId)
{
    this.parent = document.getElementById(parentDomElementId);
    this._size = {width: _CGLC.WIDTH_DEFAULT ,
                  height:_CGLC.HEIGHT_DEFAULT};

    this._glCanvas = document.createElement('canvas');
    this._glCanvas.style.position = 'absolute';
    this._glCanvas.style.left = '0px';
    this._glCanvas.style.top = '0px';

    //Init webgl

    this._usedBrowser    = null;
    this._implementation = null;

    this.gl = null;

    var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
    var i = -1;

    while(++i<names.length)
    {
        try
        {
            this.gl = this._glCanvas.getContext(names[i],{ antialias: true});
        }
        catch (e)
        {
            throw ("WebGL context could not be initialized");
        }
        if(this.gl)
        {
            this._implementation = names[i];break;
        }
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
            "uniform float     u_use_texture;" +
            "uniform sampler2D u_image;" +
            "varying vec2      v_texture_coord;" +
            "varying vec4      v_vertex_color;" +

            "void main()" +
            "{" +
                "vec4 texColor  = texture2D(u_image,v_texture_coord);" +
                "gl_FragColor = v_vertex_color * (1.0 - u_use_texture) + texColor * u_use_texture;"+
            "}",

        this.gl.FRAGMENT_SHADER);


    // Load and init program & set size to default

    this._program        = this._loadProgram();

    var gl          = this.gl,
        glTexture2d = gl.TEXTURE_2D,
        glRGBA      = gl.RGBA,
        glFloat     = gl.FLOAT;

    gl.useProgram(this._program);

    this.setSize(_CGLC.WIDTH_DEFAULT,_CGLC.HEIGHT_DEFAULT);


    // Save attribute and uniform locations from shader

    this._locationAttribPosition        = gl.getAttribLocation( this._program, "a_position");
    this._locationTransMatrix           = gl.getUniformLocation(this._program, "a_matrix");
    this._locationAttribTextureCoord    = gl.getAttribLocation( this._program, "a_texture_coord");
    this._locationAttribVertexColor     = gl.getAttribLocation( this._program, "a_vertex_color");
    this._locationUniformResolution     = gl.getUniformLocation(this._program, "u_resolution");
    this._locationUniformImage          = gl.getUniformLocation(this._program, "u_image");
    this._locationUniformUseTexture     = gl.getUniformLocation(this._program, "u_use_texture");

    // Create Buffers

    this._vbo = gl.createBuffer();
    this._ibo = gl.createBuffer();

    // Create default blank texture and texture coords / use color & set alpha to 1.0

    this._currTint = _CGLC.TINT_DEFAULT;

    this._blankTexture = gl.createTexture();
    gl.bindTexture(glTexture2d,this._blankTexture);
    gl.texImage2D( glTexture2d, 0, glRGBA, 1, 1, 0, glRGBA, gl.UNSIGNED_BYTE, new Uint8Array([1,1,1,1]));

    gl.uniform1f(this._locationUniformUseTexture,0.0);


    // bind defaults

    gl.bindBuffer(gl.ARRAY_BUFFER,        this._vbo);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this._ibo);

    gl.enableVertexAttribArray(this._locationAttribPosition);
    gl.enableVertexAttribArray(this._locationAttribTextureCoord);
    gl.enableVertexAttribArray(this._locationAttribVertexColor);

    gl.vertexAttribPointer(    this._locationAttribPosition,    _CGLC.SIZE_OF_VERTEX ,glFloat,false,0,0);
    gl.vertexAttribPointer(    this._locationAttribTextureCoord,_CGLC.SIZE_OF_T_COORD,glFloat,false,0,0);

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

    this._modeEllipse = CanvasGL.CENTER;
    this._modeRect    = CanvasGL.CORNER;
    this._textureWrap = CanvasGL.CLAMP;

    this._texture     = false;
    this._textureCurr = null;
    this._c2dTexture  = this._c2dPrepareTexture();

    this._fontProperties =
    {
        style:     _CGLC.TEXT_DEFAULT_STYLE,
        weight:    _CGLC.TEXT_DEFAULT_WEIGHT,
        size:      _CGLC.TEXT_DEFAULT_SIZE,
        family:    _CGLC.TEXT_DEFAULT_FAMILY,
        baseLine:  _CGLC.TEXT_DEFAULT_BASELINE,
        align:     _CGLC.TEXT_DEFAULT_ALIGN,
        lineHeight:_CGLC.TEXT_DEFAULT_LINE_HEIGHT,
        spacing:   _CGLC.TEXT_DEFAULT_SPACING
    };


    // Init temp values & arrays

    this._tempBezierPoints = new Array(8);

    // Setup vertex buffers

    this._bufferVerticesQuad      = new Float32Array(_CGLC.SIZE_OF_QUAD);
    this._bufferVerticesTriangle  = new Float32Array(_CGLC.SIZE_OF_TRIANGLE);
    this._bufferVerticesLine      = new Float32Array(_CGLC.SIZE_OF_LINE);
    this._bufferVerticesPoint     = new Float32Array(_CGLC.SIZE_OF_POINT);
    this._bufferVerticesEllipse   = new Float32Array(_CGLC.ELLIPSE_DETAIL_MAX * _CGLC.SIZE_OF_VERTEX);
    this._bufferVerticesBezier    = new Float32Array(_CGLC.BEZIER_DETAIL_MAX  * _CGLC.SIZE_OF_VERTEX);
    this._bufferVerticesArc       = new Float32Array(_CGLC.ELLIPSE_DETAIL_MAX * _CGLC.SIZE_OF_VERTEX*2);
    this._bufferVerticesArcStroke = new Float32Array(_CGLC.ELLIPSE_DETAIL_MAX * _CGLC.SIZE_OF_VERTEX);
    this._bufferVerticesSpline    = new Float32Array(_CGLC.SPLINE_DETAIL_MAX  * 4);

    this._bufferTexCoordsQuadDefault = new Float32Array([0.0,0.0,1.0,0.0,0.0,1.0,1.0,1.0]);
    this._bufferTexCoordsQuadTemp    = new Float32Array(this._bufferTexCoordsQuadDefault);
    this._bufferTexCoordsQuad        = new Float32Array(this._bufferTexCoordsQuadDefault);

    this._bufferColorVertex       = new Float32Array(_CGLC.SIZE_OF_COLOR);
    this._bufferColorQuad         = new Float32Array(_CGLC.SIZE_OF_COLOR*4);
    this._bufferColorTriangle     = new Float32Array(_CGLC.SIZE_OF_COLOR*3);
    this._bufferColorLine         = new Float32Array(_CGLC.SIZE_OF_COLOR*2);
    this._bufferColorPoint        = new Float32Array(_CGLC.SIZE_OF_COLOR);
    this._bufferColorArc          = new Float32Array(_CGLC.SIZE_OF_COLOR*_CGLC.ELLIPSE_DETAIL_MAX*2);
    this._bufferColorEllipse      = new Float32Array(_CGLC.SIZE_OF_COLOR*_CGLC.ELLIPSE_DETAIL_MAX);

    // Setup fill props & buffers

    this._fill               = true;
    this._bufferColorFill4   = [1.0,1.0,1.0,1.0];
    this._bufferColorFill    = this._bufferColorFill4;

    this._stroke             = true;
    this._bufferColorStroke4 = [1.0,1.0,1.0,1.0];
    this._bufferColorStroke  = this._bufferColorStroke4;

    this._bufferColorBg      = new Float32Array([1.0,1.0,1.0,1.0]);

    this._tempColorArr = [];
    this._tempBlankQuadColors = new Float32Array(this._color1fArr(1.0,16));


    this._tempScreenCoords = new Array(2);
    this._tempSplineVertices = [];

    this._currDetailEllipse = _CGLC.ELLIPSE_DETAIL_DEFAULT;
    this._currDetailBezier  = _CGLC.BEZIER_DETAIL_DEFAULT;
    this._currDetailSpline  = _CGLC.SPLINE_DETAIL_DEFAULT;

    this._currLineWidth = _CGLC.LINE_WIDTH_DEFAULT;

    // batch

    this._batchActive             = false;
    this._batchOffsetVertices     = 0;
    this._batchOffsetVertexColors = 0;
    this._batchOffsetIndioes      = 0;
    this._batchBufferVertices     = null;
    this._batchBufferVertexColors = null;
    this._batchBufferIndices      = null;


    // Attach canvas to parent DOM element

    this.parent.appendChild(this._glCanvas);
}

/*---------------------------------------------------------------------------------------------------------*/
// Set size
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
    this._modeEllipse = mode;
};

CanvasGL.prototype.setRectMode = function(mode)
{
    this._modeRect = mode;
};

CanvasGL.prototype.setEllipseDetail = function(a)
{
    var md = _CGLC.BEZIER_DETAIL_MAX;
    this._currDetailEllipse = a > md ? md : a;
};

CanvasGL.prototype.setBezierDetail = function(a)
{
    var md = _CGLC.BEZIER_DETAIL_MAX;
    this._currDetailBezier = a > md ? md : a;
};

CanvasGL.prototype.setSplineDetail = function(a)
{
    var md = _CGLC.SPLINE_DETAIL_MAX;
    this._currDetailSpline = a  > md ? md : a;
};

CanvasGL.prototype.setLineWidth = function(a)
{
    this._currLineWidth = a;
};

CanvasGL.prototype.setTextureWrap = function(mode)
{
    this._textureWrap = mode;
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
    return this._currDetailEllipse;
};

CanvasGL.prototype.getBezierDetail = function()
{
    return this._currDetailBezier;
};

CanvasGL.prototype.getSplineDetail = function()
{
    return this._currDetailSpline;
};



/*---------------------------------------------------------------------------------------------------------*/
// Shape fill/stroke/texture
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.fill = function()
{

    var f = this._bufferColorFill = this._bufferColorFill4;

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

    this._fill = true;
};

CanvasGL.prototype.fill1i = function(k)
{
    var f = this._bufferColorFill = this._bufferColorFill4;
    f[0] = f[1] = f[2] = k/255;f[3] = 1.0;
    this._fill = true;
};

CanvasGL.prototype.fill2i = function(k,a)
{
    var f = this._bufferColorFill = this._bufferColorFill4;
    f[0] = f[1] = f[2] = k/255;f[3] = a;
    this._fill = true;
};

CanvasGL.prototype.fill3i = function(r,g,b)
{
    var f = this._bufferColorFill = this._bufferColorFill4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = 1.0;
    this._fill = true;
};

CanvasGL.prototype.fill4i = function(r,g,b,a)
{
    var f = this._bufferColorFill = this._bufferColorFill4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = a;
    this._fill = true;
};

CanvasGL.prototype.fill1f = function(k)
{
    var f = this._bufferColorFill = this._bufferColorFill4;
    f[0] = f[1] = f[2] = k;f[3] = 1.0;
    this._fill = true;
};

CanvasGL.prototype.fill2f = function(k,a)
{
    var f = this._bufferColorFill = this._bufferColorFill4;
    f[0] = f[1] = f[2] = k;f[3] = a;
    this._fill = true;
};

CanvasGL.prototype.fill3f = function(r,g,b)
{
    var f = this._bufferColorFill = this._bufferColorFill4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = 1.0;
    this._fill = true;
};

CanvasGL.prototype.fill4f = function(r,g,b,a)
{
    var f = this._bufferColorFill = this._bufferColorFill4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = a;
    this._fill = true;
};

CanvasGL.prototype.fillArr =  function(a)
{
    this.fillArrI(a);
};

CanvasGL.prototype.fillArrI = function(a)
{
    var i = 0;

    while(i < a.length)
    {
        a[i  ] /= 255;
        a[i+1] /= 255;
        a[i+2] /= 255;

        i+=4;
    }

    this._bufferColorFill = a;
    this._fill = true;
};

CanvasGL.prototype.fillArrF = function(a)
{
    this._bufferColorFill = a;
    this._fill = true;
}

CanvasGL.prototype.noFill = function()
{
    this._fill = false;
};


// Stroke

CanvasGL.prototype.stroke = function()
{
    var f = this._bufferColorStroke = this._bufferColorStroke4;

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

    this._stroke = true;
};

CanvasGL.prototype.stroke1i = function(k)
{
    var f = this._bufferColorStroke = this._bufferColorStroke4;
    f[0] = f[1] = f[2] = k/255;f[3] = 1.0;
    this._stroke = true;
};

CanvasGL.prototype.stroke2i = function(k,a)
{
    var f = this._bufferColorStroke = this._bufferColorStroke4;
    f[0] = f[1] = f[2] = k/255;f[3] = a;
    this._stroke = true;
};

CanvasGL.prototype.stroke3i = function(r,g,b)
{
    var f = this._bufferColorStroke = this._bufferColorStroke4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = 1.0;
    this._stroke = true;
};

CanvasGL.prototype.stroke4i = function(r,g,b,a)
{
    var f = this._bufferColorStroke = this._bufferColorStroke4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = a;
    this._stroke = true;
};

CanvasGL.prototype.stroke1f = function(k)
{
    var f = this._bufferColorStroke = this._bufferColorStroke4;
    f[0] = f[1] = f[2] = k;f[3] = 1.0;
    this._stroke = true;
};

CanvasGL.prototype.stroke2f = function(k,a)
{
    var f = this._bufferColorStroke = this._bufferColorStroke4;
    f[0] = f[1] = f[2] = k;f[3] = a;
    this._stroke = true;
};

CanvasGL.prototype.stroke3f = function(r,g,b)
{
    var f = this._bufferColorStroke = this._bufferColorStroke4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = 1.0;
    this._stroke = true;
};

CanvasGL.prototype.stroke4f = function(r,g,b,a)
{
    var f = this._bufferColorStroke = this._bufferColorStroke4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = a;
    this._stroke = true;
};

CanvasGL.prototype.strokeArr = function(a)
{
    this._bufferColorStroke = a;
    this._stroke = true;
};

CanvasGL.prototype.strokeArrI = function(a)
{
    var  i = 0;

    while(i< a.length)
    {
        a[i  ]/=255;
        a[i+1]/=255;
        a[i+2]/=255;

        i+=4;
    }

    this._bufferColorStroke = a;
    this._stroke = true;
}

CanvasGL.prototype.strokeArrF = function(a)
{
    this._bufferColorStroke = a;
    this._stroke = true;
}

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
            throw ("Color array length not equal to number of vertices.");
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

CanvasGL.prototype._colorArrLerped = function(colors,arr)
{
    var l = arr.length,
        i = 0,
        j1,
        j;

    while(i<l)
    {
        j  = i / l;
        j1 = 1 - j;

        arr[i  ] = colors[0] * (1-j) + colors[4] * j;
        arr[i+1] = colors[1] * (1-j) + colors[5] * j;
        arr[i+2] = colors[2] * (1-j) + colors[6] * j;
        arr[i+3] = colors[3] * (1-j) + colors[7] * j;

        i+=4;
    }

    return arr;
};

CanvasGL.prototype.tint = function(a)
{
    this._currTint = Math.max(_CGLC.TINT_MIN,Math.min(a,_CGLC.TINT_MAX));
};

CanvasGL.prototype.noTint = function()
{
    this._currTint = _CGLC.TINT_MAX;
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


CanvasGL.prototype.setUVQuad = function(u0,v0,u1,v1,u2,v2,u3,v3)
{
    this._bufferTexCoordsQuad[0] = u0;
    this._bufferTexCoordsQuad[1] = v0;
    this._bufferTexCoordsQuad[2] = u1;
    this._bufferTexCoordsQuad[3] = v1;
    this._bufferTexCoordsQuad[4] = u2;
    this._bufferTexCoordsQuad[5] = v2;
    this._bufferTexCoordsQuad[6] = u3;
    this._bufferTexCoordsQuad[7] = v3;
};

CanvasGL.prototype.resetUVQuad = function()
{
    this._bufferTexCoordsQuad[0] = this._bufferTexCoordsQuadDefault[0];
    this._bufferTexCoordsQuad[1] = this._bufferTexCoordsQuadDefault[1];
    this._bufferTexCoordsQuad[2] = this._bufferTexCoordsQuadDefault[2];
    this._bufferTexCoordsQuad[3] = this._bufferTexCoordsQuadDefault[3];
    this._bufferTexCoordsQuad[4] = this._bufferTexCoordsQuadDefault[4];
    this._bufferTexCoordsQuad[5] = this._bufferTexCoordsQuadDefault[5];
    this._bufferTexCoordsQuad[6] = this._bufferTexCoordsQuadDefault[6];
    this._bufferTexCoordsQuad[7] = this._bufferTexCoordsQuadDefault[7];
};


CanvasGL.prototype.texture = function(img,offsetX,offsetY,width,height)
{
    if(offsetX  )
    {
        var tc = this._bufferTexCoordsQuad;
        var gl          = this.gl,
            glTexture2d = gl.TEXTURE_2D,
            glRepeat    = gl.REPEAT;

        offsetY = offsetY || 0;
        width  = 1/width  || 1;
        height = 1/height || 1;

        tc[0]+=offsetX;
        tc[1]+=offsetY;

        tc[2]+=offsetX+width;
        tc[3]+=offsetY;

        tc[4]+=offsetX;
        tc[5]+=offsetY+height;

        tc[6]+=offsetX+width;
        tc[7]+=offsetY+height;

        gl.bindTexture(  glTexture2d,img._t);
        gl.texParameteri(glTexture2d, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(glTexture2d, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.bindTexture(  glTexture2d,this._blankTexture);
        this._setCurrTexture(img._t);
        return;
    }

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

CanvasGL.prototype.blend = function(src,dest)
{
    this.gl.blendFunc(src,dest);
};

CanvasGL.prototype.resetBlend = function()
{
    var gl = this.gl;
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
};

CanvasGL.prototype.background = function()
{
    var c  = this._bufferColorBg;

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

    this._stroke  = false;
    this._fill    = false;
    this._texture = false;

    this._currLineWidth = _CGLC.LINE_WIDTH_DEFAULT;
    this._modeEllipse   = _CGLC.ELLIPSE_MODE_DEFAULT;
    this._modeRect      = _CGLC.RECT_MODE_DEFAULT;

    this.resetUVQuad();

    var gl = this.gl;
    gl.clearColor(c[0],c[1],c[2],c[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    //Reset transformation matrix to identity matrix
    this._loadIdentity();
};

/*---------------------------------------------------------------------------------------------------------*/
// Drawing primitives
/*---------------------------------------------------------------------------------------------------------*/

//TODO: Merge fill and polyline draw

CanvasGL.prototype.quad = function(x0,y0,x1,y1,x2,y2,x3,y3)
{
    if(!this._fill && !this._stroke && !this._texture)return;

    var gl = this.gl;
    var vbo = this._vbo;
    var v = this._bufferVerticesQuad;

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
        c = this._applyColorToColorBuffer(this._bufferColorFill,this._bufferColorQuad,null);
        this.__fillBuffer(v,c);
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }

    if(this._texture)
    {
        var glArrayBuffer = gl.ARRAY_BUFFER,
            glFloat = gl.FLOAT;

        c = this._applyColorToColorBuffer(this._bufferColorFill,this._bufferColorQuad,null);

        var t = this._bufferTexCoordsQuad;

        var vblen = v.byteLength,
            cblen = c.byteLength,
            tblen = t.byteLength,
            tlen  = vblen + cblen + tblen;

        var offSetV = 0,
            offSetC = offSetV + vblen,
            offSetT = vblen + cblen;

        gl.bindBuffer(glArrayBuffer,this._vbo);
        gl.bufferData(glArrayBuffer,tlen,gl.DYNAMIC_DRAW);

        gl.bufferSubData(glArrayBuffer,0,v);
        gl.bufferSubData(glArrayBuffer,offSetC,c);
        gl.bufferSubData(glArrayBuffer,offSetT,t);

        gl.vertexAttribPointer(this._locationAttribPosition,    _CGLC.SIZE_OF_VERTEX, glFloat,false,0,offSetV);
        gl.vertexAttribPointer(this._locationAttribVertexColor, _CGLC.SIZE_OF_COLOR,  glFloat,false,0,offSetC);
        gl.vertexAttribPointer(this._locationAttribTextureCoord,_CGLC.SIZE_OF_T_COORD,glFloat,false,0,offSetT);

        gl.uniform1f(this._locationUniformUseTexture,this._currTint);
        gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);
        gl.uniform1f(this._locationUniformImage,0);
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

        this._disableTexture();
    }

    if(this._stroke)
    {
        v[ 0] = x0;
        v[ 1] = y0;
        v[ 2] = x1;
        v[ 3] = y1;
        v[ 4] = x2;
        v[ 5] = y2;
        v[ 6] = x3;
        v[ 7] = y3;
        this._polyline(v, v.length, true);
    }
};

CanvasGL.prototype.rect = function(x,y,width,height)
{
    var cm = this._modeRect == CanvasGL.CENTER,
        rx,ry,rw,rh;

    if(cm)
    {
        var w2 = width  * 0.5,
            h2 = height * 0.5;

        rx = x - w2;
        ry = y - h2;
        rw = x + w2;
        rh = y + h2;
    }
    else
    {
        rx = x;
        ry = y;
        rw = x+width;
        rh = y+height;

    }

    this.quad(rx,ry,rw,ry,rw,rh,rx,rh);
};

//TODO: Merge fill and polyline draw

CanvasGL.prototype.ellipse = function(x,y,radiusX,radiusY)
{
    if(!this._fill && !this._stroke)return;

    var cm = this._modeEllipse;

    var cx = cm == 0 ? x : x + radiusX;
    var cy = cm == 0 ? y : y + radiusY;

    var d = this._currDetailEllipse;
    var v = this._bufferVerticesEllipse;
    var l = d * 2;

    var step = Math.PI / d;
    var i = 0;
    var s;

    while(i < l)
    {
        s      = step * i;
        v[i  ] = cx + radiusX * Math.cos(s);
        v[i+1] = cy + radiusY * Math.sin(s);

        i+=2;
    }

    this._setMatrixUniform();

    if(this._fill && !this._texture)
    {
        this.__fillBuffer(v,this._applyColorToColorBuffer(this._bufferColorFill,this._bufferColorEllipse,null));
        this.gl.drawArrays(gl.TRIANGLE_FAN,0,d);
    }

    if(this._stroke)
    {
        this._polyline(v,d*2,true);
    }
};

//TODO: Merge fill and polyline draw

//http://slabode.exofire.net/circle_draw.shtml

CanvasGL.prototype.circle = function(x,y,radius)
{
    if(!this._fill && !this._stroke)return;

    var cm = this._modeEllipse;

    var cx = cm == 0 ? x : x + radius,
        cy = cm == 0 ? y : y + radius;

    var d = this._currDetailEllipse,
        v = this._bufferVerticesEllipse,
        l = d * 2;

    var i = 0;

    var theta = 2 * Math.PI / d,
        c = Math.cos(theta),
        s = Math.sin(theta),
        t;

    var ox = radius,
        oy = 0;

    while(i < l)
    {
        v[i  ] = ox + x;
        v[i+1] = oy + y;

        t  = ox;
        ox = c * ox - s * oy;
        oy = s * t  + c * oy;

        i+=2;
    }

    this._setMatrixUniform();

    //TODO: Implement

    if(this._fill)
    {
        var gl = this.gl;
        this.__fillBuffer(v,this._applyColorToColorBuffer(this._bufferColorFill,this._bufferColorEllipse,null));
        gl.drawArrays(gl.TRIANGLE_FAN,0,d);
    }

    if(this._stroke)
    {
        this._polyline(v,d*2,true);
    }
};

CanvasGL.prototype.arc = function(centerX,centerY,radiusX,radiusY,startAngle,stopAngle,innerRadiusX,innerRadiusY)
{
    if(!this._fill && !this._stroke)return;


    innerRadiusX = innerRadiusX || 0;
    innerRadiusY = innerRadiusY || 0;

    var d = this._currDetailEllipse,
        l = d* 4,
        v = this._bufferVerticesArc;

    var step = (stopAngle - startAngle)/(d*2-2);

    var s,coss,sins;

    var i = 0;

    while(i < l)
    {
        s    = startAngle + step * i;
        coss = Math.cos(s);
        sins = Math.sin(s);

        v[i  ] = centerX + radiusX * coss;
        v[i+1] = centerY + radiusY * sins;
        v[i+2] = centerX + innerRadiusX * coss;
        v[i+3] = centerY + innerRadiusY * sins;

        i+=4;
    }

    this._setMatrixUniform();

    if(this._fill)
    {
        var gl = this.gl;
        this.__fillBuffer(v,this._applyColorToColorBuffer(this._bufferColorFill,this._bufferColorArc,null));
        gl.drawArrays(gl.TRIANGLE_STRIP,0,l*0.5);
    }

    if(this._stroke)
    {
        var vo = this._bufferVerticesArcStroke;
        var i2;
        l = d * 2;
        i = 0;
        while(i < l)
        {
            i2 = i*2;
            vo[i ]  = v[i2  ];
            vo[i+1] = v[i2+1];
            i+=2;
        }
        this._polyline(vo,l,false);
    }
};

CanvasGL.prototype.line = function()
{
    if(!this._stroke)return;

    switch (arguments.length)
    {
        case 1:
            this._polyline(arguments[0]);
            break;
        case 4:
            var v = this._bufferVerticesLine;

            v[0] = arguments[0];
            v[1] = arguments[1];
            v[2] = arguments[2];
            v[3] = arguments[3];

            this._polyline(v);
            break;
    }
};

CanvasGL.prototype.lines = function(vertices,strokes,colors)
{
    if(!this._stroke)return;
    this._polyline(vertices);
};

CanvasGL.prototype.beginShape = function(){};

CanvasGL.prototype.endShape = function(){};

CanvasGL.prototype.vertex = function(x,y){};

CanvasGL.prototype.bezier = function(x0,y0,x1,y1,x2,y2,x3,y3)
{
    var d = this._currDetailBezier;
    var p = this._tempBezierPoints;

    p[0] = x0;
    p[1] = y0;
    p[2] = x2;
    p[3] = y2;
    p[4] = x1;
    p[5] = y1;
    p[6] = x3;
    p[7] = y3;

    var i = 0;
    var t,nt,nt3,nt2,t3,t2;

    var vertices =this._bufferVerticesBezier;

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

    this._polyline(vertices);
};

CanvasGL.prototype.bezierPoint = function(d)
{
    var nt  = 1 - d,
        nt3 = nt * nt * nt,
        nt2 = nt * nt;

    var t3  = d * d * d,
        t2  = d * d;

    var p = this._tempBezierPoints;

    var x0 = p[0],
        y0 = p[1],
        x2 = p[2],
        y2 = p[3],
        x1 = p[4],
        y1 = p[5],
        x3 = p[6],
        y3 = p[7];

    return [nt3*x0+3*nt2*d*x1+3*nt*t2*x2+t3*x3,
            nt3*y0+3*nt2*d*y1+3*nt*t2*y2+t3*y3];

};

CanvasGL.prototype.catmullRomSpline = function(points)
{
    var tightness = 0.5;

    var d = this._currDetailSpline;

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

CanvasGL.prototype.drawElements = function(vertices,faceIndices,vertexColors)
{
    if(!this._fill)return;

    var v = new Float32Array(vertices),
        i = new Uint16Array(faceIndices || this.__faceIndicesLinearCW(vertices)),
        c = null;

    var gl = this.gl;

    gl.bufferData(gl.ARRAY_BUFFER,v,gl.DYNAMIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,i,gl.DYNAMIC_DRAW);

    if(this._fill)
    {
        this._applyFill();
        this._setMatrixUniform();
        gl.drawElements(gl.TRIANGLES,i.length,gl.UNSIGNED_SHORT,0);
    }
};

CanvasGL.prototype.triangle = function(x0,y0,x1,y1,x2,y2)
{
    if(!this._fill && !this._stroke)return;

    var gl = this.gl;
    var v  = this._bufferVerticesTriangle;
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
    var v  = this._bufferVerticesPoint,
        c  = this._applyColorToColorBuffer(this._bufferColorFill,this._bufferColorPoint, null);


    v[0] = x;
    v[1] = y;

    this.__fillBuffer(v,c);
    this._setMatrixUniform();
    gl.drawArrays(gl.POINTS,0,1);
};


CanvasGL.prototype.points = function(vertices)
{
    if(!this._fill)return;
    var gl  = this.gl;
    //gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
    this._setMatrixUniform();
    this.__fillBuffer(new Float32Array(vertices),
                     this._applyColorToColorBuffer(this._bufferColorFill,new Float32Array(vertices.length*2),
                     null));
    gl.drawArrays(gl.POINTS,0,vertices.length*0.5);
};

CanvasGL.prototype._polylines = function(joints,length,loop)
{

};

//TODO: Optimize, add support for caps, alpha, overlapping

CanvasGL.prototype._polyline = function(joints,length,loop)
{
    if(!this._stroke)return;


    var color    = this._bufferColorStroke,
        colorLen = color.length;

    if(colorLen!= 4 && colorLen!=8)
    {
        throw ("Color array length not valid.");
    }

    loop = Boolean(loop);

    var pvcol = color.length != 4;

    var lineWidth = this._currLineWidth;

    var jointSize      = 2,
        jointLen       = (length || joints.length) + (loop ? jointSize : 0),
        jointCapResMax = _CGLC.LINE_ROUND_CAP_DETAIL_MAX,
        jointCapResMin = _CGLC.LINE_ROUND_CAP_DETAIL_MIN,
        jointCapRes    = lineWidth*4 ,
        jointRad       = lineWidth * 0.5,
        jointNum       = jointLen  * 0.5;


    var d = Math.max(jointCapResMin,Math.min(jointCapRes,jointCapResMax));

    var vbLen = 8,
        cbLen = vbLen * 2,
        ibLen = (vbLen - 2) * 3;

    var verticesBLen = vbLen * (jointNum-1),
        colorsBLen   = cbLen * (jointNum-1),
        indicesBLen  = ibLen * (jointNum-1);

    var vjLen = d * 2,
        cjLen = d * 4,
        ijLen = (d-2) * 3;

    var verticesJLen = vjLen * jointNum,
        colorsJLen   = cjLen * jointNum,
        indicesJLen  = ijLen * jointNum;

    var vtLen = vbLen + vjLen,
        ctLen = cbLen + cjLen,
        itLen = ibLen + ijLen;

    var verticesTLen = verticesBLen + verticesJLen,
        colorsTLen   = colorsBLen   + colorsJLen,
        indicesTLen  = indicesBLen  + indicesJLen;


    var vertices = new Float32Array(verticesTLen),
        colors   = new Float32Array(colorsTLen),
        indices  = new Uint16Array( indicesTLen);

    var i = 0, j,jointIndex,j3,oi3, k,faceIndex;

    var offsetV,
        offsetC,
        offsetI;

    var theta = 2 * Math.PI / d,
        c     = Math.cos(theta),
        s     = Math.sin(theta),
        t;

    var x, y, cx, cy, nx, ny;

    var slopex,slopey,slopelen,temp;

    while(i < jointLen)
    {
        jointIndex = i / jointSize;

        x = joints[i];
        y = joints[i+1];

        if(loop && (i == jointLen - jointSize))
        {
            x = joints[0];
            y = joints[1];
        }

        //setup circle cap

        cx = jointRad;
        cy = 0;

        offsetV = j = vtLen * jointIndex;

        while(j < offsetV + vjLen)
        {
            vertices[j  ] = cx + x;
            vertices[j+1] = cy + y;

            t  = cx;
            cx = c * cx - s * cy;
            cy = s * t  + c * cy;

            j+=2;
        }

        offsetI = j = itLen * jointIndex;
        faceIndex =  offsetV / jointSize;

        k = 1;

        while(j < offsetI + ijLen)
        {
            indices[j ]  = faceIndex;
            indices[j+1] = faceIndex + k;
            indices[j+2] = faceIndex + k + 1;

            j+=3;
            k++;
        }

        if(i < jointLen - jointSize)
        {
            nx = joints[i+2];
            ny = joints[i+3];

            if(loop && (i == (jointLen - jointSize*2)))
            {
                nx = joints[0];
                ny = joints[1];
            }

            slopex = nx - x;
            slopey = ny - y;

            slopelen = 1/Math.sqrt(slopex*slopex + slopey*slopey);

            slopex *= slopelen;
            slopey *= slopelen;

            temp   = slopex;
            slopex = slopey;
            slopey = -temp;

            temp = (jointRad) * slopex;

            offsetV = j = vtLen * jointIndex + vjLen;

            vertices[j  ] = x  + temp;
            vertices[j+2] = x  - temp;
            vertices[j+4] = nx + temp;
            vertices[j+6] = nx - temp;

            temp = (jointRad) * slopey;

            vertices[j+1] = y  + temp;
            vertices[j+3] = y  - temp;
            vertices[j+5] = ny + temp;
            vertices[j+7] = ny - temp;

            faceIndex =  offsetV / jointSize;

            offsetI = offsetI + ijLen;
            j = offsetI;

            indices[j  ] = faceIndex;
            indices[j+1] = faceIndex + 1;
            indices[j+2] = faceIndex + 2;
            indices[j+3] = indices[j+1];
            indices[j+4] = indices[j+2];
            indices[j+5] = faceIndex + 3;


        }

        i+=2;
    }

    if(pvcol)
    {
        var colIArr = this._colorArrLerped(color,new Array(jointNum*4));

        i = 0;

        while(i <  colorsTLen)
        {
            j = i;
            k = i/ctLen * 4;

            while(j < i + cjLen)
            {
                colors[j  ] = colIArr[k  ];
                colors[j+1] = colIArr[k+1];
                colors[j+2] = colIArr[k+2];
                colors[j+3] = colIArr[k+3];
                j+=4;
            }

            colors[j   ] = colors[j+4 ] = colIArr[k  ];
            colors[j+1 ] = colors[j+5 ] = colIArr[k+1];
            colors[j+2 ] = colors[j+6 ] = colIArr[k+2];
            colors[j+3 ] = colors[j+7 ] = colIArr[k+3];

            colors[j+8 ] = colors[j+12] = colIArr[k+4];
            colors[j+9 ] = colors[j+13] = colIArr[k+5];
            colors[j+10] = colors[j+14] = colIArr[k+6];
            colors[j+11] = colors[j+15] = colIArr[k+7];

            i+=ctLen;
        }
    }
    else
    {
        this._applyColorToColorBuffer(this._bufferColorStroke,colors,null);
    }

    this._setMatrixUniform();

    var gl = this.gl,
        glArrayBuffer = gl.ARRAY_BUFFER,
        glDynamicDraw = gl.DYNAMIC_DRAW,
        glFloat       = gl.FLOAT;

    var vblen = vertices.byteLength,
        cblen = colors.byteLength,
        tlen  = vblen + cblen;


    gl.bufferData(glArrayBuffer,tlen,glDynamicDraw);
    gl.bufferSubData(glArrayBuffer,0,    vertices);
    gl.bufferSubData(glArrayBuffer,vblen,colors);
    gl.vertexAttribPointer(this._locationAttribPosition,2,glFloat,false,0,0);
    gl.vertexAttribPointer(this._locationAttribVertexColor,4,glFloat,false,0,vblen);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,glDynamicDraw);
    gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);

};
/*
CanvasGL.prototype._polyline = function(joints,length,loop)
{
    if(!this._stroke)return;


    var color    = this._bufferColorStroke,
        colorLen = color.length;

    if(colorLen!= 4 && colorLen!=8)
    {
        throw ("Color array length not valid.");
    }

    loop = Boolean(loop);

    var pvcol = color.length != 4;

    var lineWidth = this._currLineWidth;

    var jointLen       = (length || joints.length) + (loop ? 2 : 0),
        jointCapResMax = _CGLC.LINE_ROUND_CAP_DETAIL_MAX,
        jointCapResMin = _CGLC.LINE_ROUND_CAP_DETAIL_MIN,
        jointCapRes    = lineWidth * 4 ,
        jointRad       = lineWidth * 0.5,
        jointNum       = jointLen  * 0.5;


    var d = Math.max(jointCapResMin,Math.min(jointCapRes,jointCapResMax));

    var vbLen = 8,
        cbLen = vbLen * 2,
        ibLen = (vbLen - 2) * 3;

    var verticesBLen = vbLen * (jointNum-1),
        colorsBLen   = cbLen * (jointNum-1),
        indicesBLen  = ibLen * (jointNum-1);

    var vjLen = d * 2,
        cjLen = d * 4,
        ijLen = (d-2) * 3;

    var verticesJLen = vjLen * jointNum,
        colorsJLen   = cjLen * jointNum,
        indicesJLen  = ijLen * jointNum;

    var vertices = new Float32Array(verticesJLen + verticesBLen),
        colors   = new Float32Array(colorsJLen   + colorsBLen),
        indices  = new Uint16Array( indicesJLen  + indicesBLen);

    var i = 0, j,hi,j3,oi3, k,hov;

    var ov,oc,oi;

    var theta = 2 * Math.PI / d,
        c     = Math.cos(theta),
        s     = Math.sin(theta),
        t;

    var x, y, cx, cy;

    while(i < jointLen)
    {
        hi = i * 0.5;

        x = joints[i];
        y = joints[i+1];


        if(loop && (i == jointLen - 2))
        {
            x = joints[0];
            y = joints[1];
        }

        cx = jointRad;
        cy = 0;

        //setup circle cap

        ov = vjLen * hi;
        j  = ov ;

        while(j < ov + vjLen)
        {
            vertices[j  ] = cx + x;
            vertices[j+1] = cy + y;
            t = cx;
            cx = c * cx - s * cy;
            cy = s * t  + c * cy;
            j+=2;
        }

        // order cap triangles

        oi  = hi*ijLen;
        j   = oi;
        hov = ov * 0.5;

        k = 1;

        while(j < oi + ijLen)
        {
            indices[j ]  = hov;
            indices[j+1] = hov + k;
            indices[j+2] = hov + k + 1;

            j+=3;
            k++;
        }

        i+=2;
    }

    //TODO: Merge loops from cap,cap...,rect,rect... to cap,rect,cap,rect...

    var temp;

    var nx,ny;
    var v0x,v1x,v2x,v3x,v0y,v1y,v2y,v3y;
    var slopex,slopey,slopelen;

    i = 0;

    while(i < (jointLen - 2))
    {
        x  = joints[i];
        y  = joints[i+1];
        nx = joints[i+2];
        ny = joints[i+3];

        if(loop && (i == jointLen - 4))
        {
            nx = joints[0];
            ny = joints[1];
        }

        slopex = nx - x;
        slopey = ny - y;

        slopelen = Math.sqrt(slopex*slopex + slopey*slopey);

        slopex /= slopelen;
        slopey /= slopelen;

        temp   = slopex;
        slopex = slopey;
        slopey = -temp;

        temp = (jointRad) * slopex;

        v0x = x  + temp;
        v1x = x  - temp;
        v2x = nx + temp;
        v3x = nx - temp;

        temp = (jointRad) * slopey;

        v0y = y  + temp;
        v1y = y  - temp;
        v2y = ny + temp;
        v3y = ny - temp;

        hi = i * 0.5;
        ov = verticesJLen + (vbLen * hi);
        j = ov;

        //setup rect vertices

        vertices[j  ] = v0x;
        vertices[j+1] = v0y;
        vertices[j+2] = v1x;
        vertices[j+3] = v1y;
        vertices[j+4] = v2x;
        vertices[j+5] = v2y;
        vertices[j+6] = v3x;
        vertices[j+7] = v3y;

        oi = indicesJLen + (ibLen * hi);
        j = oi;

        hov = ov * 0.5;

        //order rect triangles

        indices[j  ] = hov;
        indices[j+1] = hov + 1;
        indices[j+2] = hov + 2;
        indices[j+3] = indices[j+1];
        indices[j+4] = indices[j+2];
        indices[j+5] = hov + 3;

        i+=2;
    }

    if(pvcol)
    {
        var colIArr = this._colorArrLerped(color,new Array(jointNum*4));

        /*
         i = 0;

         while(i < colIArr.length)
         {
         j = (i/4/jointNum);

         colIArr[i  ] = color[0] * (1-j) + color[4] * j;
         colIArr[i+1] = color[1] * (1-j) + color[5] * j;
         colIArr[i+2] = color[2] * (1-j) + color[6] * j;
         colIArr[i+3] = color[3] * (1-j) + color[7] * j;

         i+=4;
         }
         */
/*
        i = 0;

        while(i < colorsJLen)
        {
            j = i;
            k = i/cjLen * 4;

            while(j < i + cjLen)
            {
                colors[j  ] = colIArr[k  ];
                colors[j+1] = colIArr[k+1];
                colors[j+2] = colIArr[k+2];
                colors[j+3] = colIArr[k+3];
                j+=4;
            }

            i+=cjLen;
        }

        i = colorsJLen;

        while(i < colorsJLen + colorsBLen)
        {
            k = (i-colorsJLen)/cbLen * 4;

            colors[i   ] = colors[i+4 ] = colIArr[k  ];
            colors[i+1 ] = colors[i+5 ] = colIArr[k+1];
            colors[i+2 ] = colors[i+6 ] = colIArr[k+2];
            colors[i+3 ] = colors[i+7 ] = colIArr[k+3];

            colors[i+8 ] = colors[i+12] = colIArr[k+4];
            colors[i+9 ] = colors[i+13] = colIArr[k+5];
            colors[i+10] = colors[i+14] = colIArr[k+6];
            colors[i+11] = colors[i+15] = colIArr[k+7];

            i+=cbLen;
        }
    }
    else
    {
        this._applyColorToColorBuffer(this._bufferColorStroke,colors,null);
    }

    this._setMatrixUniform();

    var gl = this.gl,
        glArrayBuffer = gl.ARRAY_BUFFER,
        glDynamicDraw = gl.DYNAMIC_DRAW,
        glFloat       = gl.FLOAT;

    var vblen = vertices.byteLength,
        cblen = colors.byteLength,
        tlen  = vblen + cblen;

    gl.bufferData(glArrayBuffer,tlen,glDynamicDraw);
    gl.bufferSubData(glArrayBuffer,0,    vertices);
    gl.bufferSubData(glArrayBuffer,vblen,colors);
    gl.vertexAttribPointer(this._locationAttribPosition,2,glFloat,false,0,0);
    gl.vertexAttribPointer(this._locationAttribVertexColor,4,glFloat,false,0,vblen);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,glDynamicDraw);
    gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
};
*/

CanvasGL.prototype.beginShapeBatch = function(){};
CanvasGL.prototype.beginLineBatch  = function(){};
CanvasGL.prototype.beginPointBatch = function(){};
CanvasGL.prototype.endBatch        = function(){};


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

        if(!img)
        {
            throw ("Texture image is null.");
        }

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
    var rm = this._modeRect;
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
};

/*---------------------------------------------------------------------------------------------------------*/
// Shader loading
/*---------------------------------------------------------------------------------------------------------*/

//TODO: Implement

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

CanvasGL.prototype.__faceIndicesLinearCW = function(vertices)
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

CanvasGL.prototype.__faceIndicesLinearCCW = function(vertices)
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

CanvasGL.prototype.__np2 = function(n)
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

CanvasGL.prototype.__pp2 = function(n)
{
    var n2 = n>>1;
    return n2>0 ? this.__np2(n2) : this.__np2(n);
};

CanvasGL.prototype.__nnp2 = function(n)
{
    if((n&(n-1))==0)return n;
    var nn = this.__np2(n);
    var pn = this.__pp2(n);
    return (nn-n)>Math.abs(n-pn) ? pn : nn;
};

CanvasGL.prototype.__fillBuffer = function(vertexArray,colorArray)
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
    var fc  = this._bufferColorFill;

    var mt = c2d.measureText(string);
    var tw = Math.floor(mt.width+mt.width*0.5),
        th = Math.floor(this._fontProperties.size)-1;

    var cw = this.__np2(tw),
        ch = this.__np2(th);

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


/*---------------------------------------------------------------------------------------------------------*/



