/**
 *
 * canvasGL.js Accelerated 2D drawing in WebGL
 *
 * canvasGL.js is available under the terms of the MIT license.  The full text of the
 * MIT license is included below.
 *
 * MIT License
 * ===========
 *
 * Copyright (c) 2012-2013 Henryk Wollik. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

/**
 *
 * @class CanvasGL
 * @param {String} element
 * @param {Number} width
 * @param {Number} height
 * @constructor
 */

function CanvasGL(element,width,height){
    this.parent = element;
    this._canvas3d = document.createElement('canvas');

    //Init webgl
    var gl = this.gl = null;
    var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
    var i = -1;
    while(++i<names.length){
        try{
            gl = this.gl = this._canvas3d.getContext(names[i],{ alpha:false,
                                                                depth:false,
                                                                stencil:false,
                                                                antialias: false,
                                                                premultipliedAlpha:false,
                                                                preserveDrawingBuffer:true});
        }catch (e){
            throw ("WebGL context could not be initialized");
        }
        if(this.gl){
            break;
        }
    }

    //Setup Shader

    var glVertexShader   = gl.VERTEX_SHADER,
        glFragmentShader = gl.FRAGMENT_SHADER;

    this._vertShader     = this._loadShader(CanvasGL.__vertShader,     glVertexShader);
    this._fragShader     = this._loadShader(CanvasGL.__fragShader,     glFragmentShader);
    this._vertShaderPost = this._loadShader(CanvasGL.__vertShaderPost, glVertexShader);
    this._fragShaderPost = this._loadShader(CanvasGL.__fragShaderPost, glFragmentShader);


    var CONSTANTS = CanvasGL._CGLC;

    this._program     = this._loadProgram(this._vertShader,    this._fragShader);
    this._programPost = this._loadProgram(this._vertShaderPost,this._fragShaderPost);

    var glTexture2d = gl.TEXTURE_2D,
        glRGBA      = gl.RGBA,
        glFloat     = gl.FLOAT;

    gl.useProgram(this._program);

    this._bufferColorBg      = new Float32Array([1.0,1.0,1.0,1.0]);
    this._bufferColorBgOld   = new Float32Array([-1.0,-1.0,-1.0,-1.0]);
    this._backgroundClear    = CONSTANTS.CLEAR_BACKGROUND;

    this._screenTex = gl.createTexture();
    this._fboRTT    = gl.createFramebuffer();
    this._fboCanvas = null;

    this._iwidth      = this._twidth  = this.width  = width  || CONSTANTS.WIDTH_DEFAULT;
    this._iheight     = this._theight = this.height = height || CONSTANTS.HEIGHT_DEFAULT;
    this._ssaaf       = CONSTANTS.SSAA_FACTOR;

    this.setSize(this.width,this.height);

    gl.bindFramebuffer(gl.FRAMEBUFFER,this._fboRTT);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this._screenTex,0);
    gl.bindTexture(gl.TEXTURE_2D,null);

    this._setFrameBuffer(this._fboRTT);


    // Render-Shader
    // attribute and uniform locations

    this._locationAttribPosition        = gl.getAttribLocation( this._program, "a_position");
    this._locationTransMatrix           = gl.getUniformLocation(this._program, "a_matrix");
    this._locationAttribTextureCoord    = gl.getAttribLocation( this._program, "a_texture_coord");
    this._locationAttribVertexColor     = gl.getAttribLocation( this._program, "a_vertex_color");
    this._locationUniformResolution     = gl.getUniformLocation(this._program, "u_resolution");
    this._locationUniformImage          = gl.getUniformLocation(this._program, "u_image");
    this._locationUniformUseTexture     = gl.getUniformLocation(this._program, "u_use_texture");

    this._locationUniformFlipY          = gl.getUniformLocation(this._program, "u_flip_y");

    // Post-Shader
    // attribute and uniform locations

    this._locationPostAttribPoition      = gl.getAttribLocation( this._programPost, "a_position");
    this._locationPostAttribTextureCoord = gl.getAttribLocation( this._programPost, "a_texture_coord");
    this._locationPostUniformScreenTex   = gl.getUniformLocation(this._programPost, "u_screen_tex");
    this._locationPostUniformResolution  = gl.getUniformLocation(this._programPost, "u_resolution");


    // Set default y flip

    gl.uniform1f(this._locationUniformFlipY,1.0);

    // Create Buffers

    this._vbo = gl.createBuffer();
    this._ibo = gl.createBuffer();

    // Create default blank texture and texture coords / use color & set alpha to 1.0

    this._currTint = CONSTANTS.TINT_DEFAULT;

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

    gl.vertexAttribPointer(    this._locationAttribPosition,    CONSTANTS.SIZE_OF_VERTEX ,glFloat,false,0,0);
    gl.vertexAttribPointer(    this._locationAttribTextureCoord,CONSTANTS.SIZE_OF_T_COORD,glFloat,false,0,0);

    // Create matrix stack and apply to shader

    this._transMatrix  = this.__makeMat33();
    this._tempMatrix   = this.__makeMat33();
    this._transMatrixStack = [];

    gl.uniformMatrix3fv(this._locationTransMatrix,false,this._transMatrix);


    // Enable gl flags

    gl.enable(gl.BLEND);

    // Create canvas for canvas textures

    this.canvas = document.createElement('canvas');
    this.context2d = this.canvas.getContext('2d');

    // Set draw modes

    this._modeEllipse = CanvasGL.CENTER;
    this._modeRect    = CanvasGL.CORNER;

    this._texture     = false;
    this._textureCurr = null;

    this._textureOffset = false;

    this._textureOffsetX = this._textureOffsetY = 0;
    this._textureOffsetW = this._textureOffsetH = 0;

    this._context2DTexture  = this._context2DPrepareTexture();

    this._fontProperties =
    {
        style:     CONSTANTS.TEXT_DEFAULT_STYLE,
        weight:    CONSTANTS.TEXT_DEFAULT_WEIGHT,
        size:      CONSTANTS.TEXT_DEFAULT_SIZE,
        family:    CONSTANTS.TEXT_DEFAULT_FAMILY,
        baseLine:  CONSTANTS.TEXT_DEFAULT_BASELINE,
        align:     CONSTANTS.TEXT_DEFAULT_ALIGN,
        lineHeight:CONSTANTS.TEXT_DEFAULT_LINE_HEIGHT,
        spacing:   CONSTANTS.TEXT_DEFAULT_SPACING
    };


    // Setup vertex buffers

    this._bufferVerticesQuad      = new Float32Array(CONSTANTS.SIZE_OF_QUAD);
    this._bufferVerticesTriangle  = new Float32Array(CONSTANTS.SIZE_OF_TRIANGLE);
    this._bufferVerticesLine      = new Float32Array(CONSTANTS.SIZE_OF_LINE);
    this._bufferVerticesPoint     = new Float32Array(CONSTANTS.SIZE_OF_POINT);
    this._bufferVerticesEllipse   = new Float32Array(CONSTANTS.ELLIPSE_DETAIL_MAX * CONSTANTS.SIZE_OF_VERTEX);
    this._bufferVerticesBezier    = new Float32Array(CONSTANTS.BEZIER_DETAIL_MAX  * CONSTANTS.SIZE_OF_VERTEX);
    this._bufferVerticesArc       = new Float32Array(CONSTANTS.ELLIPSE_DETAIL_MAX * CONSTANTS.SIZE_OF_VERTEX*2);
    this._bufferVerticesArcStroke = new Float32Array(CONSTANTS.ELLIPSE_DETAIL_MAX * CONSTANTS.SIZE_OF_VERTEX);
    this._bufferVerticesSpline    = new Float32Array(CONSTANTS.SPLINE_DETAIL_MAX  * 4);
    this._bufferVerticesRoundRect = new Float32Array(CONSTANTS.ELLIPSE_DETAIL_MAX * CONSTANTS.SIZE_OF_VERTEX + CONSTANTS.SIZE_OF_QUAD);

    this._bufferIndicesRoundRect  = new Uint16Array((((this._bufferVerticesRoundRect.length) / 2)-2) * CONSTANTS.SIZE_OF_FACE);

    this._bufferTexCoordsQuadDefault     = new Float32Array([0.0,0.0,1.0,0.0,0.0,1.0,1.0,1.0]);
    this._bufferTexCoordsQuad            = new Float32Array(this._bufferTexCoordsQuadDefault);
    this._bufferTexCoordsTriangleDefault = new Float32Array([0.0,0.0,1.0,0.0,1.0,1.0]);
    this._bufferTexCoordsTriangle        = new Float32Array(this._bufferTexCoordsTriangleDefault.length);
    this._bufferTexCoordsEllipse         = new Float32Array(this._bufferVerticesEllipse.length);
    this._bufferTexCoodsArc              = new Float32Array(this._bufferVerticesArc.length);

    this._bufferColorVertex       = new Float32Array(CONSTANTS.SIZE_OF_COLOR);
    this._bufferColorQuad         = new Float32Array(CONSTANTS.SIZE_OF_COLOR*4);
    this._bufferColorTriangle     = new Float32Array(CONSTANTS.SIZE_OF_COLOR*3);
    this._bufferColorLine         = new Float32Array(CONSTANTS.SIZE_OF_COLOR*2);
    this._bufferColorPoint        = new Float32Array(CONSTANTS.SIZE_OF_COLOR);
    this._bufferColorArc          = new Float32Array(CONSTANTS.SIZE_OF_COLOR*CONSTANTS.ELLIPSE_DETAIL_MAX*2);
    this._bufferColorEllipse      = new Float32Array(CONSTANTS.SIZE_OF_COLOR*CONSTANTS.ELLIPSE_DETAIL_MAX);
    this._bufferColorRoundRect    = new Float32Array(this._bufferVerticesRoundRect.length * 2);

    this._cachedPointsBezier      = new Array(CONSTANTS.SIZE_OF_POINT*4);

    this._indicesTriangle = [0,1,2];
    this._indicesQuad     = [0,1,2,1,2,3];



    // Setup fill props, buffers and cached value

    this._fill               = true;
    this._bufferColorFill4   = [1.0,1.0,1.0,1.0];
    this._bufferColorFill    = this._bufferColorFill4;

    this._stroke             = true;
    this._bufferColorStroke4 = [1.0,1.0,1.0,1.0];
    this._bufferColorStroke  = this._bufferColorStroke4;

    this._tempScreenCoords  = new Array(2);
    this._tempCurveVertices = [];

    this._currDetailEllipse  = CONSTANTS.ELLIPSE_DETAIL_DEFAULT;
    this._currRadiusXEllipse = 0;
    this._currRadiusYEllipse = 0;
    this._currRadiusCircle   = 0;
    this._currDetailBezier   = CONSTANTS.BEZIER_DETAIL_DEFAULT;
    this._currDetailSpline   = CONSTANTS.SPLINE_DETAIL_DEFAULT;
    this._currDetailCorner   = CONSTANTS.CORNER_DETAIL_DEFAULT;

    this._modeTexture = CanvasGL.CLAMP;

    this._prevDetailEllipse  = 0;
    this._prevRadiusXEllipse = 0;
    this._prevRadiusYEllipse = 0;
    this._prevRadiusCircle   = 0;
    this._prevDetailCorner   = 0;

    this._currLineWidth = CONSTANTS.LINE_WIDTH_DEFAULT;

    // batch

    this._batchActive             = false;
    this._batchOffsetVertices     = 0;

    this._batchBufferVertices     = [];
    this._batchBufferVertexColors = [];
    this._batchBufferIndices      = [];
    this._batchBufferTexCoords    = [];

    this._batchLimit = 0;

    this._batchTextureActive = false;

    // canvas text

    this.setFontSize(      CONSTANTS.TEXT_DEFAULT_SIZE);
    this.setFontFamily(    CONSTANTS.TEXT_DEFAULT_FAMILY);
    this.setTextAlign(     CONSTANTS.TEXT_DEFAULT_ALIGN);
    this.setTextBaseLine(  CONSTANTS.TEXT_DEFAULT_BASELINE);
    this.setTextLineHeight(CONSTANTS.TEXT_DEFAULT_LINE_HEIGHT);

    // Attach canvas to parent DOM element



    this.parent.appendChild(this._canvas3d);
}

CanvasGL.__vertShader     = "uniform mat3 a_matrix; attribute vec2 a_position; uniform vec2 u_resolution; uniform float u_flip_y; attribute vec2 a_texture_coord; varying vec2 v_texture_coord; attribute vec4 a_vertex_color; varying vec4 v_vertex_color; void main() { vec2 clipSpace = vec2(a_matrix * vec3(a_position.xy,1)).xy / u_resolution * 2.0 - 1.0; gl_Position = vec4(clipSpace.x,-clipSpace.y * u_flip_y,0,1); v_texture_coord = a_texture_coord; v_vertex_color = a_vertex_color; gl_PointSize = 1.0; }";
CanvasGL.__fragShader     = "precision mediump float; uniform float u_use_texture; uniform sampler2D u_image; varying vec2 v_texture_coord; varying vec4 v_vertex_color; void main(){ vec4 texColor = texture2D(u_image,v_texture_coord); gl_FragColor = v_vertex_color * (1.0 - u_use_texture) + texColor * u_use_texture; }";
CanvasGL.__vertShaderPost = "attribute vec2 a_position; attribute vec2 a_texture_coord; varying vec2 v_texture_coord; uniform vec2 u_resolution; void main() { vec2 cs = vec2(a_position/u_resolution*2.0-1.0); gl_Position = vec4(cs.x,cs.y,0,1); v_texture_coord = a_texture_coord; }";
CanvasGL.__fragShaderPost = "precision mediump float; uniform sampler2D u_screen_tex; varying vec2 v_texture_coord; void main() { gl_FragColor = texture2D(u_screen_tex,v_texture_coord); }";

CanvasGL._CGLC =
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
    LINE_ROUND_CAP_DETAIL_MIN:4,

    CORNER_DETAIL_DEFAULT : 5,
    CORNER_DETAIL_MAX     : 10,

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
    SIZE_OF_FACE:3,

    TEXT_DEFAULT_STYLE:'',
    TEXT_DEFAULT_WEIGHT:'normal',
    TEXT_DEFAULT_SIZE:8,
    TEXT_DEFAULT_FAMILY:'Arial',
    TEXT_DEFAULT_BASELINE:'top',
    TEXT_DEFAULT_ALIGN:'left',
    TEXT_DEFAULT_LINE_HEIGHT:1,
    TEXT_DEFAULT_SPACING:'1',

    SSAA_FACTOR : 2,

    BUFFER_DEFAULT_RESERVE_AMOUNT : 50,

    CLEAR_BACKGROUND : true
};

/**
 * @method setSize
 * @param {Number} width Width of the canvas in pixel
 * @param {Number} height Height of the canvas in pixel
 */

CanvasGL.prototype.setSize = function(width,height)
{
    var glc = this._canvas3d,
        gl  = this.gl,
        s   = this._ssaaf,
        c   = this._bufferColorBg;

    this.width       = width;
    this.height      = height;
    glc.style.width  = width  + 'px';
    glc.style.height = height + 'px';
    glc.width        = this._iwidth  = width  * s;
    glc.height       = this._iheight = height * s;

    this._updateRTTTexture();

    gl.useProgram(this._programPost);
    gl.uniform2f(this._locationPostUniformResolution,width,height);
    gl.useProgram(this._program);
    gl.uniform2f(this._locationUniformResolution,width,height);
    gl.viewport(0,0,width,height);

    var c0 = c[0]/255,
        c1 = c[1]/255,
        c2 = c[2]/255;


    this._setFrameBuffer(this._fboCanvas);
    gl.clearColor(c0,c1,c2,1.0);
    gl.clear(gl.COLOR_BUFFER_BIT );

    /*
    this._setFrameBuffer(this._fboRTT);
    gl.clearColor(c0,c1,c2,1.0);
    gl.clear(gl.COLOR_BUFFER_BIT );
    */


};

/*---------------------------------------------------------------------------------------------------------*/
// Drawing settings
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.CENTER = 0;
CanvasGL.CORNER = 1;
CanvasGL.WRAP   = 2;
CanvasGL.CLAMP  = 3;
CanvasGL.REPEAT = 4;



CanvasGL.FUNC_ADD = "";
CanvasGL.FUNC_SUBSTRACT = "";
CanvasGL.FUNC_REVERSER_SUBSTRACT = "";

CanvasGL.ZERO = "";
CanvasGL.ONE = "";

CanvasGL.SRC_ALPHA = 770;
CanvasGL.SRC_COLOR = 768;


CanvasGL.ONE_MINUS_SRC_ALPHA = 771;
CanvasGL.ONE_MINUS_SRC_COLOR = 769;

CanvasGL.TRIANGLE_STRIP = 5;
CanvasGL.TRIANGLE_FAN   = 6;


CanvasGL.TOP    = "top";
CanvasGL.MIDDLE = "middle";
CanvasGL.BOTTOM = "bottom";

CanvasGL.THIN   = "thin";
CanvasGL.REGULAR= "normal";
CanvasGL.BOLD   = "bold";

/**
 * @method setEllipseMode
 * @param mode
 */

CanvasGL.prototype.setEllipseMode = function(mode)
{
    this._modeEllipse = mode;
};

/**
 * @method setRectMode
 * @param mode
 */

CanvasGL.prototype.setRectMode = function(mode)
{
    this._modeRect = mode;
};

/**
 * @method setEllipseDetail
 * @param a
 */

CanvasGL.prototype.setEllipseDetail = function(a)
{
    var md = CanvasGL._CGLC.BEZIER_DETAIL_MAX;
    this._prevDetailEllipse = this._currDetailEllipse;
    this._currDetailEllipse = a > md ? md : a;
};

/**
 * @method setBezierDetail
 * @param {Integer}a Resolution of bezier curve
 */

CanvasGL.prototype.setBezierDetail = function(a)
{
    var md = CanvasGL._CGLC.BEZIER_DETAIL_MAX;
    this._currDetailBezier = a > md ? md : a;
};

/**
 * @method setCurveDetail
 * @param {Integer} a Resolution of curves
 */

CanvasGL.prototype.setCurveDetail = function(a)
{
    var md = CanvasGL._CGLC.SPLINE_DETAIL_MAX;
    this._currDetailSpline = a  > md ? md : a;
};

/**
 * @method setCornerDetail
 * @param {Integer} a Resolution of corners
 */

CanvasGL.prototype.setCornerDetail = function(a)
{
    var md = CanvasGL._CGLC.CORNER_DETAIL_MAX;
    this._currDetailCorner = a > md ? md : a;
};

/**
 * @method setLineWidth
 * @param {Number} a Width of lines
 */

CanvasGL.prototype.setLineWidth = function(a)
{
    this._currLineWidth = a;
};

/**
 * @method setTextureWrap
 * @param mode
 */

CanvasGL.prototype.setTextureWrap = function(mode)
{
    this._modeTexture = mode;
};

/**
 * @method getEllipseDetail
 * @return {Integer} Current detail of ellipses
 */

CanvasGL.prototype.getEllipseDetail = function()
{
    return this._currDetailEllipse;
};

/**
 * @method getBezierDetail
 * @return {Integer} Current detail of bezier curves
 */

CanvasGL.prototype.getBezierDetail = function()
{
    return this._currDetailBezier;
};

/**
 * @method getCurveDetail
 * @return {Integer} Current detail of curves
 */

CanvasGL.prototype.getCurveDetail = function()
{
    return this._currDetailSpline;
};

/**
 * @method enableBlend
 */

CanvasGL.prototype.enableBlend = function()
{
    this.gl.enable(this.gl.BLEND);
};

/**
 * @method disableBlend
 */

CanvasGL.prototype.disableBlend = function()
{
    this.gl.disable(this.gl.BLEND);
};

/*---------------------------------------------------------------------------------------------------------*/
// Shape fill/stroke/texture
/*---------------------------------------------------------------------------------------------------------*/

/**
 * @method fill
 */

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

/**
 * @method fill1i
 * @param {Integer} k
 */

CanvasGL.prototype.fill1i = function(k)
{
    var f = this._bufferColorFill = this._bufferColorFill4;
    f[0] = f[1] = f[2] = k/255;f[3] = 1.0;
    this._fill = true;
};

/**
 * @method fill2i
 * @param {Integer} k
 * @param {Number} a
 */

CanvasGL.prototype.fill2i = function(k,a)
{
    var f = this._bufferColorFill = this._bufferColorFill4;
    f[0] = f[1] = f[2] = k/255;f[3] = a;
    this._fill = true;
};

/**
 * @method fill3i
 * @param {Integer} r
 * @param {Integer} g
 * @param {Integer} b
 */

CanvasGL.prototype.fill3i = function(r,g,b)
{
    var f = this._bufferColorFill = this._bufferColorFill4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = 1.0;
    this._fill = true;
};

/**
 * @method fill4i
 * @param {Integer} r
 * @param {Integer} g
 * @param {Integer} b
 * @param {Number} a
 */

CanvasGL.prototype.fill4i = function(r,g,b,a)
{
    var f = this._bufferColorFill = this._bufferColorFill4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = a;
    this._fill = true;
};

/**
 * @method fill1f
 * @param {Number} k
 */

CanvasGL.prototype.fill1f = function(k)
{
    var f = this._bufferColorFill = this._bufferColorFill4;
    f[0] = f[1] = f[2] = k;f[3] = 1.0;
    this._fill = true;
};

/**
 * @method fill2f
 * @param {Number} k
 * @param {Number} a
 */

CanvasGL.prototype.fill2f = function(k,a)
{
    var f = this._bufferColorFill = this._bufferColorFill4;
    f[0] = f[1] = f[2] = k;f[3] = a;
    this._fill = true;
};

/**
 * @method fill3f
 * @param {Number} r
 * @param {Number} g
 * @param {Number} b
 */

CanvasGL.prototype.fill3f = function(r,g,b)
{
    var f = this._bufferColorFill = this._bufferColorFill4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = 1.0;
    this._fill = true;
};

/**
 * @method fill4f
 * @param {Number} r
 * @param {Number} g
 * @param {Number} b
 * @param {Number} a
 */

CanvasGL.prototype.fill4f = function(r,g,b,a)
{
    var f = this._bufferColorFill = this._bufferColorFill4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = a;
    this._fill = true;
};

/**
 * @method fillArr
 * @param {Array} a
 */

CanvasGL.prototype.fillArr =  function(a)
{
    this.fillArrI(a);
};

/**
 * @method fillArrI
 * @param {Array} a
 */

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

/**
 * @method fillArrF
 * @param {Array} a
 */

CanvasGL.prototype.fillArrF = function(a)
{
    this._bufferColorFill = a;
    this._fill = true;
};

/**
 * @method noFill
 */

CanvasGL.prototype.noFill = function()
{
    this._fill = false;
};

/**
 * @method stroke
 */

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

/**
 * @method stroke1i
 * @param k
 */

CanvasGL.prototype.stroke1i = function(k)
{
    var f = this._bufferColorStroke = this._bufferColorStroke4;
    f[0] = f[1] = f[2] = k/255;f[3] = 1.0;
    this._stroke = true;
};

/**
 * @method stroke2i
 * @param k
 * @param a
 */

CanvasGL.prototype.stroke2i = function(k,a)
{
    var f = this._bufferColorStroke = this._bufferColorStroke4;
    f[0] = f[1] = f[2] = k/255;f[3] = a;
    this._stroke = true;
};

/**
 * @method stroke3i
 * @param r
 * @param g
 * @param b
 */

CanvasGL.prototype.stroke3i = function(r,g,b)
{
    var f = this._bufferColorStroke = this._bufferColorStroke4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = 1.0;
    this._stroke = true;
};

/**
 * @method stroke4i
 * @param r
 * @param g
 * @param b
 * @param a
 */

CanvasGL.prototype.stroke4i = function(r,g,b,a)
{
    var f = this._bufferColorStroke = this._bufferColorStroke4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = a;
    this._stroke = true;
};

/**
 * @method stroke1f
 * @param {Number} k
 */

CanvasGL.prototype.stroke1f = function(k)
{
    var f = this._bufferColorStroke = this._bufferColorStroke4;
    f[0] = f[1] = f[2] = k;f[3] = 1.0;
    this._stroke = true;
};

/**
 * @method stroke2f
 * @param {Number} k
 * @param {Number} a
 */

CanvasGL.prototype.stroke2f = function(k,a)
{
    var f = this._bufferColorStroke = this._bufferColorStroke4;
    f[0] = f[1] = f[2] = k;f[3] = a;
    this._stroke = true;
};

/**
 * @method stroke3f
 * @param {Number} r
 * @param {Number} g
 * @param {Number} b
 */

CanvasGL.prototype.stroke3f = function(r,g,b)
{
    var f = this._bufferColorStroke = this._bufferColorStroke4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = 1.0;
    this._stroke = true;
};

/**
 * @method stroke4f
 * @param {Number} r
 * @param {Number} g
 * @param {Number} b
 * @param {Number} a
 */

CanvasGL.prototype.stroke4f = function(r,g,b,a)
{
    var f = this._bufferColorStroke = this._bufferColorStroke4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = a;
    this._stroke = true;
};

/**
 * @method strokeArr
 * @param {Array} a
 */

CanvasGL.prototype.strokeArr = function(a)
{
    this._bufferColorStroke = a;
    this._stroke = true;
};

/**
 * @method strokeArrI
 * @param {Array} a
 */

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
};

/**
 * @method strokeArrF
 * @param {Array} a
 */

CanvasGL.prototype.strokeArrF = function(a)
{
    this._bufferColorStroke = a;
    this._stroke = true;
};

/**
 * @method noStroke
 */

CanvasGL.prototype.noStroke = function()
{
    this._stroke = false;
};

CanvasGL.prototype._applyColorToColorBuffer = function(color,buffer)
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

/**
 * @method tint
 * @param {Number} a
 */

CanvasGL.prototype.tint = function(a)
{
    this._currTint = Math.max(CanvasGL._CGLC.TINT_MIN,Math.min(a,CanvasGL._CGLC.TINT_MAX));
};

/**
 * @method noTint
 */

CanvasGL.prototype.noTint = function()
{
    this._currTint = CanvasGL._CGLC.TINT_MAX;
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
    gl.vertexAttribPointer(this._locationAttribTextureCoord,CanvasGL._CGLC.SIZE_OF_T_COORD,gl.FLOAT,false,0,0);
    gl.uniform1f(this._locationUniformUseTexture,0.0);
    this._texture = false;
};

/**
 * @method setUVOffset
 * @param {Number} offsetU
 * @param {Number} offsetV
 * @param {Number} textureWidth
 * @param {Number} textureHeight
 */

CanvasGL.prototype.setUVOffset = function(offsetU,offsetV,textureWidth,textureHeight)
{
    this._textureOffsetX = offsetU;
    this._textureOffsetY = offsetV;
    this._textureOffsetW = textureWidth-1;
    this._textureOffsetH = textureHeight-1;

    this._textureOffset = true;
};

/**
 * @method resetUVOffset
 */

CanvasGL.prototype.resetUVOffset = function()
{
    this._textureOffsetX = 0;
    this._textureOffsetY = 0;
    this._textureOffsetW = 1;
    this._textureOffsetH = 1;

    this._textureOffset = false;
};

/**
 * @method setUVQuad
 * @param {Number} u0 U-value of the first coordinate
 * @param {Number} v0 V-value of the first coordinate
 * @param {Number} u1 U-value of the second coordinate
 * @param {Number} v1 V-value of the second coordinate
 * @param {Number} u2 U-value of the third coordinate
 * @param {Number} v2 V-value of the third coordinate
 * @param {Number} u3 U-value of the fourth coordinate
 * @param {Number} v3 V-value of the fourth coordinate
 */

CanvasGL.prototype.setUVQuad = function(u0,v0,u1,v1,u2,v2,u3,v3)
{
    var t = this._bufferTexCoordsQuad;

    t[0] = u0;
    t[1] = v0;
    t[2] = u1;
    t[3] = v1;
    t[4] = u2;
    t[5] = v2;
    t[6] = u3;
    t[7] = v3;
};

/**
 * Resets all quad uv-values to default.
 * @method resetUVQuad
 */

CanvasGL.prototype.resetUVQuad = function()
{
    this.__setArr(this._bufferTexCoordsQuad,this._bufferTexCoordsQuadDefault);
};

/**
 * @method setUVTriangle
 * @param {Number} u0 U-value of the first coordinate
 * @param {Number} v0 V-value of the first coordinate
 * @param {Number} u1 U-value of the second coordinate
 * @param {Number} v1 V-value of the second coordinate
 * @param {Number} u2 U-value of the third coordinate
 * @param {Number} v2 V-value of the third coordinate
 */

CanvasGL.prototype.setUVTriangle = function(u0,v0,u1,v1,u2,v2)
{
    var t = this._bufferTexCoordsTriangle;

    t[0] = u0;
    t[1] = v0;
    t[2] = u1;
    t[3] = v1;
    t[4] = u2;
    t[5] = v2;
};

/**
 * Resets all triangle uv-values to default.
 * @method resetUVTriangle
 */

CanvasGL.prototype.resetUVTriangle = function()
{
    this.__setArr(this._bufferTexCoordsTriangle,this._bufferTexCoordsTriangleDefault);
};

/**
 * Binds a texture.
 * @method texture
 * @param {CanvasGLImage} img
 */

CanvasGL.prototype.texture = function(img)
{
    this._setCurrTexture(img._t);
};

CanvasGL.prototype._setCurrTexture = function(tex)
{
    this._textureCurr = tex;

    var gl = this.gl,
        m  = this._modeTexture;

    gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);
    if(m == CanvasGL.REPEAT)
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)

    }
    else if(m == CanvasGL.CLAMP)
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    }

    this._texture = true;
};

CanvasGL.prototype._createTexture = function()
{
    var gl = this.gl;
    var t  = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return t;
};

/**
 * Disables texture binding.
 * @method noTexture
 */

CanvasGL.prototype.noTexture = function()
{
    this._disableTexture();
    this._texture = false;
};

/**
 * @method blend
 * @param src
 * @param dest
 */

CanvasGL.prototype.blend = function(src,dest)
{
    this.gl.blendFunc(src,dest);
};

/**
 * Resets blend to default.
 * @method resetBlend
 */

CanvasGL.prototype.resetBlend = function()
{
    var gl = this.gl;
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
};

/**
 * @method background
 */

CanvasGL.prototype.background = function()
{
    var col  = this._bufferColorBg;

    col[3] = 1.0;

    switch (arguments.length)
    {
        case 0:
            col[0] = col[1] = col[2]  = 0.0;
            break;
        case 1:
            col[0] = col[1] = col[2]  = arguments[0];
            break;
        case 2:
            col[0] = col[1] = col[2]  = arguments[0];
            col[3] = arguments[1];
            break;
        case 3:
            col[0] = arguments[0];
            col[1] = arguments[1];
            col[2] = arguments[2];
            break;
        case 4:
            col[0] = arguments[0];
            col[1] = arguments[1];
            col[2] = arguments[2];
            col[3] = arguments[3];
            break;
    }

    this._backgroundClear = (col[3] == 1.0);

    this._stroke   = false;
    this._texture  = false;
    this._fill     = false;
    this._currTint = 1.0;

    var CONSTANTS = CanvasGL._CGLC;

    this._currLineWidth = CONSTANTS.LINE_WIDTH_DEFAULT;
    this._modeEllipse   = CONSTANTS.ELLIPSE_MODE_DEFAULT;
    this._modeRect      = CONSTANTS.RECT_MODE_DEFAULT;

    this.resetBlend();

    this._applyFBOTexToQuad();
    this.clearColorBuffer();

    this.resetUVOffset();
    this.resetUVQuad();
    this.resetUVTriangle();

    this.scale(this._ssaaf,this._ssaaf);
};

CanvasGL.prototype._applyFBOTexToQuad = function()
{
    var gl = this.gl,
        lt = this._locationUniformUseTexture,
        lf = this._locationUniformFlipY,
        w  = this._twidth ,
        h  = this._theight ,
        v  = this._bufferVerticesQuad,
        c  = this._bufferColorQuad,
        t  = this._bufferTexCoordsQuad;

    this._loadIdentity();
    this._setMatrixUniform();
    this.resetUVQuad();

    gl.useProgram(this._program);
    this._setFrameBuffer(this._fboCanvas);

    gl.uniform1f(lt,1.0);
    gl.uniform1f(lf,-1.0);
    this._setCurrTexture(this._screenTex);

    v[0] = v[1] = v[3] = v[4] =0;
    v[2] = v[6] = w;
    v[5] = v[7] = h;

    this.__fillBufferTexture(v,c,t);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

    gl.useProgram(this._program);
    gl.uniform1f(lt,0.0);
    gl.uniform1f(lf,1.0);
    this._setCurrTexture(this._blankTexture);
    this._disableTexture();

    this._setFrameBuffer(this._fboRTT);
};

/**
 * Manually clears the color buffer.
 * @method clearColorBuffer
 */

CanvasGL.prototype.clearColorBuffer = function()
{
    var gl = this.gl;

    var c  = this._bufferColorBg,
        co = this._bufferColorBgOld;




    if(this._backgroundClear)
    {
        gl.clearColor(c[0]/255,c[1]/255,c[2]/255,1.0);
        gl.clear(gl.COLOR_BUFFER_BIT );
    }
    else
    {
        if(c[0] != co[0] && c[1] != co[1] && c[2] != co[2] && c[3] != co[3])
        {
            var c0 = c[0]/255,
                c1 = c[1]/255,
                c2 = c[2]/255;

            this._setFrameBuffer(this._fboCanvas);
            gl.clearColor(c0,c1,c2,1.0);
            gl.clear(gl.COLOR_BUFFER_BIT );

            this._setFrameBuffer(this._fboRTT);
            gl.clearColor(c0,c1,c2,1.0);
            gl.clear(gl.COLOR_BUFFER_BIT );

            co[0] = c[0];
            co[1] = c[1];
            co[2] = c[2];
            co[3] = c[3];
        }

        this.fill(c[0],c[1],c[2],c[3]);
        this.rect(0,0,this._iwidth,this._iheight);
        this.noFill();
    }
};

CanvasGL.prototype._setFrameBuffer = function(fbo)
{
    var gl = this.gl,
        w  = this._iwidth,
        h  = this._iheight;

    gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
    gl.uniform2f(this._locationUniformResolution,w,h);
    gl.viewport(0,0,w,h);
};

CanvasGL.prototype._updateRTTTexture = function()
{
    var gl = this.gl,
        glTexture2d = gl.TEXTURE_2D,
        glNearest   = gl.NEAREST;

    this._twidth  = this.__np2(this._iwidth);
    this._theight = this.__np2(this._iheight);

    gl.bindTexture(glTexture2d,this._screenTex);
    gl.texParameteri(glTexture2d, gl.TEXTURE_MIN_FILTER, glNearest);
    gl.texParameteri(glTexture2d, gl.TEXTURE_MAG_FILTER, glNearest);
    gl.texImage2D(glTexture2d,0,gl.RGBA,this._twidth,this._theight,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.bindTexture(glTexture2d,null);
};


/*---------------------------------------------------------------------------------------------------------*/
// Drawing primitives
/*---------------------------------------------------------------------------------------------------------*/

/**
 * Draws a quad.
 * @method quad
 * @param {Number} x0 X-value of the first coordinate
 * @param {Number} y0 Y-value of the first coordinate
 * @param {Number} x1 X-value of the second coordinate
 * @param {Number} y1 Y-value of the second coordinate
 * @param {Number} x2 X-value of the third coordinate
 * @param {Number} y2 Y-value of the third coordinate
 * @param {Number} x3 X-value of the fourth coordinate
 * @param {Number} y3 Y-value of the fourth coordinate
 */

CanvasGL.prototype.quad = function(x0,y0,x1,y1,x2,y2,x3,y3)
{
    if(!this._fill && !this._stroke && !this._texture)return;

    var gl = this.gl;
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
        c = this._applyColorToColorBuffer(this._bufferColorFill,this._bufferColorQuad);

        if(this._batchActive)
        {
            this._batchPush(v,this._indicesQuad,c,null);
        }
        else
        {
            this.__fillBuffer(v,c);
            gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        }
    }

    if(this._texture)
    {
        c = this._applyColorToColorBuffer(this._bufferColorFill,this._bufferColorQuad);

        var t  = this._bufferTexCoordsQuad,
            td = this._bufferTexCoordsQuadDefault;

        if(this._textureOffset)
        {
            var tox = this._textureOffsetX,
                toy = this._textureOffsetY,
                tow = this._textureOffsetW,
                toh = this._textureOffsetH;


            t[0] = td[0] + tox;
            t[1] = td[1] + toy;

            t[2] = td[2] + tox + tow;
            t[3] = td[3] + toy;

            t[4] = td[4] + tox;
            t[5] = td[5] + toy + toh;

            t[6] = td[6] + tox + tow;
            t[7] = td[7] + toy + toh;

        }

        if(this._batchActive)
        {
            this._batchPush(v,this._indicesQuad,c,t);
        }
        else
        {
            this.__fillBufferTexture(v,c,t);
            gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        }
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

/**
 * Draws a rectangle.
 * @method rect
 * @param {Number} x X-value of the origin coordinate
 * @param {Number} y Y-value of the origon coordinate
 * @param {Number} width Width of the rectangle
 * @param {Number} height Height of the rectangle
 */

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

/**
 * Draws a rounded rectangle.
 * @method roundRect
 * @param {Number} x X-value of the origin coordinate
 * @param {Number} y Y-value of the origon coordinate
 * @param {Number} width Width of the rectangle
 * @param {Number} height Height of the rectangle
 * @param {Number} cornerRadius Radius of the corners
 */

CanvasGL.prototype.roundRect = function(x,y,width,height,cornerRadius)
{
    if(!this._fill && !this._stroke && !this._texture)return;

    var rm = this._modeRect;

    var xx = x + (rm == 1 ? 0.0 : - width*0.5),
        yy = y + (rm == 1 ? 0.0 : - height*0.5);


    var xc  = xx + cornerRadius,
        yc  = yy + cornerRadius,
        xwc = xx + width  - cornerRadius,
        yhc = yy + height - cornerRadius;

    if(cornerRadius == 0)
    {
        this.quad(xc,yc,xwc,yc,xwc,yhc,xc,yhc);
        return;
    }

    var e = [xwc,yhc,xc,yhc,xc,yc,xwc,yc],
        ex,ey;

    var v = this._bufferVerticesRoundRect,
        i = this._bufferIndicesRoundRect;

    var CONSTANTS = CanvasGL._CGLC;

    var d  = this._currDetailCorner,
        d2 = d * CONSTANTS.SIZE_OF_VERTEX,
        d3 = d2 + 2,
        i2 = (d  + 1) * CONSTANTS.SIZE_OF_FACE,
        i3 = (i2 - 6),
        l  = d3 * 4,
        is = d3 / 2,
        il = (l  / 2  + 2) * CONSTANTS.SIZE_OF_FACE;

    var m, m2,n,o,om,on;

    var pi2 = Math.PI * 0.5,
        s   = pi2 / (d-1);

    var a,as;

    m = 0;
    while(m < 4)
    {
        om = m * (d2 + 2);
        m2 = m * 2;

        v[om  ] = ex = e[m2  ];
        v[om+1] = ey = e[m2+1];

        n  = om + 2;
        on = n  + d2;
        a  = m  * pi2;
        o  = 0;

        while(n < on)
        {
            as = a + s*o;
            v[n  ] = ex + Math.cos(as) * cornerRadius;
            v[n+1] = ey + Math.sin(as) * cornerRadius;
            o++;
            n+=2;
        }

        ++m;
    }

    if(this._currDetailCorner != this._prevDetailCorner)
    {
        m = 0;
        while(m<4)
        {
            om  = m * i2;
            n   = om;
            on  = n + i3;
            o   = 1;
            om /= 3;

            while(n < on)
            {
                i[n]   = om;
                i[n+1] = om + o ;
                i[n+2] = om + o + 1;

                o++;
                n+=3;
            }

            om = m * is;

            if(m<3)
            {
                i[n]   = i[n+3] = om;
                i[n+1] = om + is;
                i[n+2] = i[n+5] = i[n+1] + 1 ;
                i[n+4] = om + d;
            }
            else if(m==3)
            {
                i[n]   = om;
                i[n+1] = i[n+4] = om +d;
                i[n+2] = i[n+3] = 0;
                i[n+5] = 1;

            }

            ++m;
        }

        i[il-4] = 0;
        i[il-2] = is*2;
        i[il-5] = i[il-3] = is;
        i[il-6] = i[il-1] = is*3;
    }

    var gl = this.gl;
    var c;

    if(this._fill && !this._texture)
    {
        c = this._applyColorToColorBuffer(this._bufferColorFill4,this._bufferColorRoundRect);

        if(this._batchActive)
        {
            this._batchPush(v,i,c,null);
        }
        else
        {
            var glArrayBuffer = gl.ARRAY_BUFFER,
                glDynamicDraw = gl.DYNAMIC_DRAW,
                glFloat       = gl.FLOAT;

            var vblen = v.byteLength,
                cblen = c.byteLength,
                tlen  = vblen + cblen;

            this._setMatrixUniform();

            var CONSTANTS = CanvasGL._CGLC;

            gl.bufferData(glArrayBuffer,tlen,glDynamicDraw);
            gl.bufferSubData(glArrayBuffer,0,    v);
            gl.bufferSubData(glArrayBuffer,vblen,c);
            gl.vertexAttribPointer(this._locationAttribPosition,   CONSTANTS.SIZE_OF_VERTEX,glFloat,false,0,0);
            gl.vertexAttribPointer(this._locationAttribVertexColor,CONSTANTS.SIZE_OF_COLOR, glFloat,false,0,vblen);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,i,glDynamicDraw);
            gl.drawElements(gl.TRIANGLES, il,gl.UNSIGNED_SHORT,0);

        }
    }

    if(this._texture)
    {
        if(this._batchActive)
        {

        }
        else
        {

        }

    }

    if(this._stroke)
    {
        v[0]      = v[2];
        v[1]      = v[3];

        v[d3]     = v[d3+2];
        v[d3+1]   = v[d3+3];

        v[d3*2]   = v[d3*2+2];
        v[d3*2+1] = v[d3*2+3];

        v[d3*3]   = v[d3*3+2];
        v[d3*3+1] = v[d3*3+3];


        this._polyline(v,d2*4+8,true);
    }
};

/**
 * Draws an ellipse.
 * @method ellipse
 * @param {Number} x X-value of the origin coordinate
 * @param {Number} y Y-value of the origin coordinate
 * @param {Number} radiusX Horizonal radius
 * @param {Number} radiusY Vertical radius
 */


CanvasGL.prototype.ellipse = function(x,y,radiusX,radiusY)
{
    if(!this._fill && !this._stroke && !this._texture)return;

    var cm = this._modeEllipse;

    this._prevRadiusXEllipse = this._currRadiusXEllipse;
    this._prevRadiusYEllipse = this._currRadiusYEllipse;
    this._currRadiusXEllipse = radiusX;
    this._currRadiusYEllipse = radiusY;

    var cx = cm == 0 ? x : x + radiusX,
        cy = cm == 0 ? y : y + radiusY;

    var d = this._currDetailEllipse,
        v = this._bufferVerticesEllipse,
        l = d * 2;

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

    var c;

    var gl = this.gl;

    c = this._applyColorToColorBuffer(this._bufferColorFill,this._bufferColorEllipse);

    if(this._fill && !this._texture)
    {


        if(this._batchActive)
        {
            this._batchPush(v,this.__faceIndicesFan(v,l),c,null,l);
        }
        else
        {
            this.__fillBuffer(v,c);
            gl.drawArrays(gl.TRIANGLE_FAN,0,d);
        }
    }

    if(this._texture)
    {
        var t = this._bufferTexCoordsEllipse;


        var ox = 0.5,
            oy = 0.5,
            ow = 0.5,
            oh = 0.5;

        if(this._currDetailEllipse  != this._prevDetailEllipse &&
           this._currRadiusXEllipse != this._prevRadiusXEllipse &&
           this._currRadiusYEllipse != this._prevRadiusYEllipse  ||
           this._textureOffset)
        {

            if(this._textureOffset)
            {
                ox = this._textureOffsetX;
                oy = this._textureOffsetY;
                ow = (1+this._textureOffsetW) * 0.5;
                oh = (1+this._textureOffsetH) * 0.5;
            }

            i = 0;
            while(i < l)
            {
                s      = step * i;
                s      = step * i;
                t[i  ] = (ow + ox) + Math.cos(s) * ow;
                t[i+1] = (oh + oy )+ Math.sin(s) * oh;
                i+=2;
            }
        }


        if(this._batchActive)
        {
            this._batchPush(v,this.__faceIndicesFan(v,l),c,t, l);
        }
        else
        {
            this.__fillBufferTexture(v,c,t);
            gl.drawArrays(gl.TRIANGLE_FAN,0,d);
        }


    }

    if(this._stroke)
    {
        this._polyline(v,l,true);
    }


};

//http://slabode.exofire.net/circle_draw.shtml

/**
 * Draws a circle.
 * @method circle
 * @param {Number} x X-value of the origin coordinate
 * @param {Number} y Y-value of the origin coordinate
 * @param {Number} radius Radius
 */

CanvasGL.prototype.circle = function(x,y,radius)
{
    if(!this._fill && !this._stroke && !this._texture)return;

    var gl = this.gl;

    var cm = this._modeEllipse;

    this._prevRadiusCircle = this._currRadiusCircle;
    this._currRadiusCircle = radius;

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
        v[i  ] = ox + cx;
        v[i+1] = oy + cy;

        t  = ox;
        ox = c * ox - s * oy;
        oy = s * t  + c * oy;

        i+=2;
    }

    this._setMatrixUniform();

    var col;

    if(this._fill && !this._texture)
    {
        col = this._applyColorToColorBuffer(this._bufferColorFill,this._bufferColorEllipse);

        if(this._batchActive)
        {
            this._batchPush(this._bufferVerticesEllipse,
                            this.__faceIndicesFan(this._bufferVerticesEllipse,l),
                            col,
                            null,
                            l);
        }
        else
        {

            this.__fillBuffer(v,col);
            gl.drawArrays(gl.TRIANGLE_FAN,0,d);
        }
    }

    if(this._texture)
    {
        col = this._applyColorToColorBuffer(this._bufferColorFill,this._bufferColorEllipse);

        var tc = this._bufferTexCoordsEllipse;

        if(this._currDetailEllipse != this._prevDetailEllipse &&
           this._currRadiusCircle  != this._prevRadiusCircle ||
           this._textureOffset)
        {

            var oxx = this._textureOffsetX,
                oyy = this._textureOffsetY,
                ow  = (1+this._textureOffsetW) * 0.5 ,
                oh  = (1+this._textureOffsetH) * 0.5 ;

            ox = radius;
            oy = 0;

            i = 0;
            while(i<l)
            {
                tc[i]   = (ow + oxx) + (ox / radius) * ow;
                tc[i+1] = (oh + oyy) + (oy / radius) * oh;

                t  = ox;
                ox = c * ox - s * oy;
                oy = s * t  + c * oy;

                i+=2;
            }
        }


        if(this._batchActive)
        {
            this._batchPush(v,this.__faceIndicesFan(v,l),col,tc,l);
        }
        else
        {
            this.__fillBufferTexture(v,col,tc);
            gl.drawArrays(gl.TRIANGLE_FAN,0,d);
        }
    }

    if(this._stroke)
    {
        this._polyline(v,l,true);
    }
};

/**
 * Draws a set of circles.
 * @method circles
 * @param {Array} positions An array containing all x- and y-values of the orgins
 * @param {Array} radii An array containing all radii
 * @param {Array} fillColors An array containing all fill-colors
 * @param {Array} strokeColors An array containin all stroke-colors
 */

CanvasGL.prototype.circles = function(positions,radii,fillColors,strokeColors)
{
    var i = 0,l = positions.length,i_2, f,s;

    while(i<l)
    {
        i_2 = i * 0.5;
        if(fillColors)
        {
            f = fillColors[i_2];
            this.fill(f[0],f[1],f[2],f[3]);
        }
        if(strokeColors)
        {
            s = strokeColors[i_2];
            this.stroke(s[0],s[1],s[2],s[3]);
        }
        this.circle(positions[i],positions[i+1],radii[i_2]);
        i+=2;
    }

};

/**
 * Dras an arc
 * @method arc
 * @param {Number} centerX X-value of the origin
 * @param {Number} centerY Y-value of the origin
 * @param {Number} radiusX Horizontal value of the outer radius
 * @param {Number} radiusY Vertical value of the outer radius
 * @param {Number} startAngle The start-angle
 * @param {Number} stopAngle The stop-angle
 * @param {Number} innerRadiusX Horizontal value of the inner radius
 * @param {Number} innerRadiusY Vertical value of the inner radius
 */

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

    var c;

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

    if(this._fill && !this._texture)
    {
        c = this._applyColorToColorBuffer(this._bufferColorFill,this._bufferColorArc);

        if(this._batchActive)
        {
            this._batchPush(v,this.__faceIndicesLinearCW(v,l), c,null,l);
        }
        else
        {
            var gl = this.gl;
            this.__fillBuffer(v,c);
            gl.drawArrays(gl.TRIANGLE_STRIP,0,l*0.5);
        }
    }


    if(this._texture)
    {
        //var t = this.__texCoordsLinearCW(v);
        //c = this._applyColorToColorBuffer(this._bufferColorFill,this._bufferColorArc);


        if(this._batchActive)
        {

        }
        else
        {
            //this.__fillBufferTexture(v,c,t);
            //gl.drawArrays(gl.TRIANGLE_FAN,0,d)
        }
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

/**
 * Draws a line.
 * @method line
 */

CanvasGL.prototype.line = function()
{
    if(!this._stroke)return;

    switch (arguments.length)
    {
        case 1:
            if(arguments[0].length == 0)return;
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

/**
 * Draws a set of lines.
 * @method lines
 * @param {Array} lines An array containing lines
 * @param {Array} strokeColors  An array containing all stroke-colors
 * @param {Array} lineWidths  An array containing all line-widths
 */


CanvasGL.prototype.lines = function(lines,strokeColors,lineWidths)
{
    var i = -1,l = lines.length, s,i_2;

    while(++i<l)
    {
        i_2 = i * 0.5;

        if(strokeColors)
        {
            s = strokeColors[i_2];
            this.stroke(s[0],s[1],s[2],s[3]);
        }

        if(lineWidths)
        {
            this.setLineWidth(lineWidths[i_2]);
        }

        this.line(lines[i]);
    }

};

/**
 * Draws a bezier curve.
 *
 * @method bezier
 * @param {Number} x0 X-value of the first anchor point
 * @param {Number} y0 Y-value of the first anchor point
 * @param {Number} x1 X-value of the first control point
 * @param {Number} y1 Y-value of the first control point
 * @param {Number} x2 X-value of the second control point
 * @param {Number} y2 Y-value of the second control point
 * @param {Number} x3 X-value of the second anchor point
 * @param {Number} y3 Y-value of the second anchor point
 */

CanvasGL.prototype.bezier = function(x0,y0,x1,y1,x2,y2,x3,y3)
{
    var d   = this._currDetailBezier,
        d_2 = d - 2,
        p   = this._cachedPointsBezier,
        v   = this._bufferVerticesBezier;

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

    while(i < d)
    {
        t   = i / d_2;
        nt  = 1 - t;
        nt3 = nt*nt*nt;
        nt2 = nt*nt;
        t3  = t*t*t;
        t2  = t*t;

        v[i  ] = nt3*x0+3*nt2*t*x1+3*nt*t2*x2+t3*x3;
        v[i+1] = nt3*y0+3*nt2*t*y1+3*nt*t2*y2+t3*y3;

        i+=2;
    }

    this._polyline(v,d,false);
};

/**
 * Draws a bezier curve.
 *
 * @method bezierPoint
 * @param {Number} d A value between 0 and 1
 * @return {Array} Returns the point on the curve
 */

CanvasGL.prototype.bezierPoint = function(d)
{
    var nt  = 1 - d,
        nt3 = nt * nt * nt,
        nt2 = nt * nt,
        t3  = d * d * d,
        t2  = d * d;

    var p = this._cachedPointsBezier;

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

/**
 * Calculates the angle of the tangent of a point on a bezier curve.
 *
 * @method bezierTangentAngle
 * @param {Number} d A value between 0 and 1
 * @return {Number} Returns the a in radians
 */

CanvasGL.prototype.bezierTangentAngle = function(d)
{
    var nt1  = 1 - d,
        nt31 = nt1 * nt1 * nt1,
        nt21 = nt1 * nt1,
        t31  = d * d * d,
        t21  = d * d,
        d2   = (d >= 1.0) ? d : (d+0.1),
        nt2  = 1 - d2,
        nt32 = nt2 * nt2 * nt2,
        nt22 = nt2 * nt2,
        t32  = d2 * d2 * d2,
        t22  = d2 * d2;

    var p = this._cachedPointsBezier;

    var x0 = p[0],
        y0 = p[1],
        x2 = p[2],
        y2 = p[3],
        x1 = p[4],
        y1 = p[5],
        x3 = p[6],
        y3 = p[7];

    var p0x = nt31*x0+3*nt21*d*x1+3*nt1*t21*x2+t31*x3,
        p0y = nt31*y0+3*nt21*d*y1+3*nt1*t21*y2+t31*y3,
        p1x = nt32*x0+3*nt22*d2*x1+3*nt2*t22*x2+t32*x3,
        p1y = nt32*y0+3*nt22*d2*y1+3*nt2*t22*y2+t32*y3;

    return Math.atan2(p1y-p0y,p1x-p0x);
};

/**
 * Draws a bezier curve through a set of points.
 *
 * @method curve
 * @param {Array} points The x- and y-values of the points
 */

CanvasGL.prototype.curve = function(points)
{
    var d = this._currDetailSpline,
        d_2 = d - 2;

    var i = 0, j,t;

    var vertices = this._tempCurveVertices = [];
    var pl = points.length;
    var ni;

    while(i < pl-2)
    {
        j = 0;
        while(j < d)
        {
            t = j / d_2;

            ni = i+1;

            vertices.push(this._catmullrom(points[Math.max(0,i-2)],
                                           points[i],
                                           points[Math.min(i+2,pl-2)],
                                           points[Math.min(i+4,pl-2)],
                                           t),
                          this._catmullrom(points[Math.max(1,ni-2)],
                                           points[ni],
                                           points[Math.min(ni+2,pl-1)],
                                           points[Math.min(ni+4,pl-1)],t));
            j+=2;
        }
        i+=2;
    }

    this._polyline(vertices);
};


CanvasGL.prototype._catmullrom = function(a,b,c,d,i)
{
    return a * ((-i + 2) * i - 1) * i * 0.5 +
           b * (((3 * i - 5) * i) * i + 2) * 0.5 +
           c * ((-3 * i + 4) * i + 1) * i * 0.5 +
           d * ((i - 1) * i * i) * 0.5;
};

/**
 * Begins a bezier curve
 * @method beginCurve
 */

CanvasGL.prototype.beginCurve =  function()
{
    this._tempCurveVertices = [];
};

/**
 * Ends and draws a bezier curve
 * @method endCurve
 */

CanvasGL.prototype.endCurve =  function()
{
    this.curve(this._tempCurveVertices);
};

/**
 * Adds a point to a bezier curve. (Must be called in between beginCurve and endCurve)
 * @method curveVertex
 * @param {Number} x The x-value of the point to be added
 * @param {Number} y The y-value of the point to be added
 */

CanvasGL.prototype.curveVertex = function(x,y)
{
    this._tempCurveVertices.push(x,y)
};

/**
 * Draws a triangle.
 * @method triangle
 * @param {Number} x0
 * @param {Number} y0
 * @param {Number} x1
 * @param {Number} y1
 * @param {Number} x2
 * @param {Number} y2
 */

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

    this._setMatrixUniform();

    var c;

    if(this._fill && this._texture)
    {
        c = this._applyColorToColorBuffer(this._bufferColorFill,this._bufferColorTriangle);

        if(this._batchActive)
        {
            this._batchPush(this._bufferVerticesTriangle,this._indicesTriangle,c,null);
        }
        else
        {
            this.__fillBuffer(v,c);
            gl.drawArrays(gl.TRIANGLES,0,3);
        }
    }

    if(this._texture)
    {
        c = this._applyColorToColorBuffer(this._bufferColorFill,this._bufferColorTriangle);

        var t = this._bufferTexCoordsTriangle;

        if(this._textureOffset)
        {
            var tox = this._textureOffsetX,
                toy = this._textureOffsetY,
                tow = this._textureOffsetW,
                toh = this._textureOffsetH;

            t[0]+=tox;
            t[1]+=toy;

            t[2]+=tox+tow;
            t[3]+=toy;

            t[4]+=tox;
            t[5]+=toy+toh;
        }

        if(this._batchActive)
        {
            this._batchPush(v,this._indicesTriangle,c,t);
        }
        else
        {
            var glArrayBuffer = gl.ARRAY_BUFFER,
                glFloat       = gl.FLOAT;

            var vblen = v.byteLength,
                cblen = c.byteLength,
                tblen = t.byteLength,
                tlen  = vblen + cblen + tblen;

            var offSetV = 0,
                offSetC = offSetV + vblen,
                offSetT = vblen + cblen;

            var CONSTANTS = CanvasGL._CGLC;

            //gl.bindBuffer(glArrayBuffer,this._vbo);
            gl.bufferData(glArrayBuffer,tlen,gl.DYNAMIC_DRAW);

            gl.bufferSubData(glArrayBuffer,0,v);
            gl.bufferSubData(glArrayBuffer,offSetC,c);
            gl.bufferSubData(glArrayBuffer,offSetT,t);

            gl.vertexAttribPointer(this._locationAttribPosition,    CONSTANTS.SIZE_OF_VERTEX, glFloat,false,0,offSetV);
            gl.vertexAttribPointer(this._locationAttribVertexColor, CONSTANTS.SIZE_OF_COLOR,  glFloat,false,0,offSetC);
            gl.vertexAttribPointer(this._locationAttribTextureCoord,CONSTANTS.SIZE_OF_T_COORD,glFloat,false,0,offSetT);

            gl.uniform1f(this._locationUniformUseTexture,this._currTint);
            gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);
            gl.uniform1f(this._locationUniformImage,0);
            gl.drawArrays(gl.TRIANGLES,0,1);

            this._disableTexture();
        }
    }

    if(this._stroke)
    {
        this._polyline(v, v.length,true);
    }
};


/**
 * @method point
 * @param {Number} x
 * @param {Number} y
 */

CanvasGL.prototype.point = function(x,y)
{
    if(!this._fill)return;

    var v  = this._bufferVerticesPoint,
        c  = this._applyColorToColorBuffer(this._bufferColorFill4,this._bufferColorPoint);

    v[0] = x;
    v[1] = y;

    this._setMatrixUniform();
    this.__fillBuffer(v,c);
    this.gl.drawArrays(this.gl.POINTS,0,1);
};


/**
 * @method points
 * @param {Array} vertices
 */

CanvasGL.prototype.points = function(vertices)
{
    if(!this._fill)return;
    var gl  = this.gl;
    this._setMatrixUniform();
    this.__fillBuffer(new Float32Array(vertices),
                     this._applyColorToColorBuffer(this._bufferColorFill,new Float32Array(vertices.length*2)));
    gl.drawArrays(gl.POINTS,0,vertices.length*0.5);
};

CanvasGL.prototype._polyline = function(joints,length,loop)
{
    if(!this._stroke || this._currLineWidth <= 0.0)return;

    var color    = this._bufferColorStroke,
        colorLen = color.length;

    if(colorLen!= 4 && colorLen!=8)
    {
        throw ("Color array length not valid.");
    }

    loop = Boolean(loop);

    var pvcol = color.length != 4;

    var lineWidth = this._currLineWidth;

    var CONSTANTS = CanvasGL._CGLC;

    var jointSize      = 2,
        jointLen       = (length || joints.length) + (loop ? jointSize : 0),
        jointCapResMax = CONSTANTS.LINE_ROUND_CAP_DETAIL_MAX,
        jointCapResMin = CONSTANTS.LINE_ROUND_CAP_DETAIL_MIN,
        jointCapRes    = (lineWidth <= 2.0 ) ? 0 : round(lineWidth)*4 ,
        jointRad       = lineWidth * 0.5,
        jointNum       = jointLen  * 0.5,
        jointNum_1     = jointNum - 1,
        jointNum_2     = jointNum - 2;

    var d = Math.max(jointCapResMin,Math.min(jointCapRes,jointCapResMax));

    var vbLen = 8,
        cbLen = vbLen * 2,
        ibLen = (vbLen - 2) * 3;

    var verticesBLen = vbLen * jointNum_1,
        colorsBLen   = cbLen * jointNum_1,
        indicesBLen  = ibLen * jointNum_1;

    var vjLen = d * 2,
        cjLen = d * 4,
        ijLen = (d-2) * 3;

    var verticesJLen = vjLen * jointNum,
        colorsJLen   = cjLen * jointNum,
        indicesJLen  = ijLen * jointNum;

    var vtLen = vbLen + vjLen,
        ctLen = cbLen + cjLen,
        itLen = ibLen + ijLen;

    var vertices = new Float32Array(verticesBLen + verticesJLen),
        colors   = new Float32Array(colorsBLen   + colorsJLen),
        indices  = new Uint16Array( indicesBLen  + indicesJLen);

    var i, j, k;

    var vertexIndex,
        faceIndex;

    var offsetV,
        offsetI;

    var theta = 2 * Math.PI / d,
        c     = Math.cos(theta),
        s     = Math.sin(theta),
        t;

    var x, y, cx, cy, nx, ny;

    var slopex,slopey,slopelen,temp;

    i = 0;

    while(i < jointNum)
    {
        vertexIndex = i * 2;

        x = joints[vertexIndex];
        y = joints[vertexIndex+1];

        if(loop && (i == jointNum_1))
        {
            x = joints[0];
            y = joints[1];
        }

        cx = jointRad;
        cy = 0;

        offsetV = j = vtLen * i;

        while(j < offsetV + vjLen)
        {
            vertices[j  ] = cx + x;
            vertices[j+1] = cy + y;

            t  = cx;
            cx = c * cx - s * cy;
            cy = s * t  + c * cy;

            j+=2;
        }

        offsetI = j = itLen * i;
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

        if(i < jointNum - 1)
        {
            nx = joints[vertexIndex+2];
            ny = joints[vertexIndex+3];

            if(loop && (i == jointNum_2))
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

            temp = jointRad * slopex;

            offsetV = j = vtLen * i + vjLen;

            vertices[j  ] = x  + temp;
            vertices[j+2] = x  - temp;
            vertices[j+4] = nx + temp;
            vertices[j+6] = nx - temp;

            temp = jointRad * slopey;

            vertices[j+1] = y  + temp;
            vertices[j+3] = y  - temp;
            vertices[j+5] = ny + temp;
            vertices[j+7] = ny - temp;

            faceIndex =  offsetV / jointSize;
            j = offsetI + ijLen;

            indices[j  ] = faceIndex;
            indices[j+1] = indices[j+3] = faceIndex + 1;
            indices[j+2] = indices[j+4] = faceIndex + 2;
            indices[j+5] = faceIndex + 3;
        }

        i++;
    }

    if(pvcol)
    {
        var colIArr = this._colorArrLerped(color,new Array(jointNum*4));
        var colorsTLen = colorsJLen + colorsJLen;

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
        this._applyColorToColorBuffer(this._bufferColorStroke,colors);
    }

    this._setMatrixUniform();

    var gl = this.gl,
        glArrayBuffer = gl.ARRAY_BUFFER,
        glDynamicDraw = gl.DYNAMIC_DRAW,
        glFloat       = gl.FLOAT;

    var vblen = vertices.byteLength,
        cblen = colors.byteLength,
        tlen  = vblen + cblen;

    if(this._batchActive)
    {
        this._batchPush(vertices,indices,colors,null);
    }
    else
    {
        var CONSTANTS = CanvasGL._CGLC;

        if(this._texture)
        {
            gl.bindTexture(gl.TEXTURE_2D, this._blankTexture);
            gl.vertexAttribPointer(this._locationAttribTextureCoord,CONSTANTS.SIZE_OF_T_COORD,gl.FLOAT,false,0,0);
            gl.uniform1f(this._locationUniformUseTexture,0.0);
        }

        gl.bufferData(glArrayBuffer,tlen,glDynamicDraw);
        gl.bufferSubData(glArrayBuffer,0,    vertices);
        gl.bufferSubData(glArrayBuffer,vblen,colors);
        gl.vertexAttribPointer(this._locationAttribPosition,   CONSTANTS.SIZE_OF_VERTEX,glFloat,false,0,0);
        gl.vertexAttribPointer(this._locationAttribVertexColor,CONSTANTS.SIZE_OF_COLOR, glFloat,false,0,vblen);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,glDynamicDraw);
        gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
    }
};

/**
 * @method drawArrays
 * @param {Array} vertices
 * @param {Array} colors
 * @param mode
 */

CanvasGL.prototype.drawArrays = function(vertices,colors,mode)
{
    if(!this._fill)return;

    var v = new Float32Array(vertices),
        c = this._applyColorToColorBuffer((colors || this._bufferColorFill4),new Float32Array(vertices.length * 2));

    var gl  = this.gl;
    var glArrayBuffer = gl.ARRAY_BUFFER,
        glDynamicDraw = gl.DYNAMIC_DRAW,
        glFloat       = gl.FLOAT;

    var vblen = v.byteLength,
        cblen = c.byteLength;

    if(this._batchActive)
    {
        this._batchPush(v,
                        mode == 5 ? this.__faceIndicesLinearCW(vertices) : this.__faceIndicesFan(vertices),
                        c,null);

    }
    else
    {
        var CONSTANTS = CanvasGL._CGLC;

        gl.bufferData(glArrayBuffer,vblen + cblen,glDynamicDraw);
        gl.bufferSubData(glArrayBuffer,0,v);
        gl.bufferSubData(glArrayBuffer,vblen,c);
        gl.vertexAttribPointer(this._locationAttribPosition,   CONSTANTS.SIZE_OF_VERTEX,glFloat,false,0,0);
        gl.vertexAttribPointer(this._locationAttribVertexColor,CONSTANTS.SIZE_OF_COLOR, glFloat,false,0,vblen);
        gl.drawArrays(mode,0,v.length*0.5);
    }
};

/**
 * @method drawElements
 * @param {Array} vertices
 * @param {Array} indices
 * @param {Array} colors
 */

CanvasGL.prototype.drawElements = function(vertices,indices,colors)
{
    if(!this._fill)return;

    var v = new Float32Array(vertices),
        i = new Uint16Array(indices || this.__faceIndicesLinearCW(vertices)),
        c = this._applyColorToColorBuffer((colors || this._bufferColorFill4),new Float32Array(vertices.length * 2));

    var gl = this.gl,
        glArrayBuffer = gl.ARRAY_BUFFER,
        glDynamicDraw = gl.DYNAMIC_DRAW,
        glFloat       = gl.FLOAT;

    var vblen = v.byteLength,
        cblen = c.byteLength,
        tlen  = vblen + cblen;

    if(this._batchActive)
    {
        this._batchPush(v,i,c,null);
    }
    else
    {

        this._setMatrixUniform();

        var CONSTANTS = CanvasGL._CGLC;

        gl.bufferData(glArrayBuffer,tlen,glDynamicDraw);
        gl.bufferSubData(glArrayBuffer,0,    v);
        gl.bufferSubData(glArrayBuffer,vblen,c);
        gl.vertexAttribPointer(this._locationAttribPosition,   CONSTANTS.SIZE_OF_VERTEX,glFloat,false,0,0);
        gl.vertexAttribPointer(this._locationAttribVertexColor,CONSTANTS.SIZE_OF_COLOR, glFloat,false,0,vblen);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,i,glDynamicDraw);
        gl.drawElements(gl.TRIANGLES,i.length,gl.UNSIGNED_SHORT,0);
    }
};

/**
 * @method beginBatch
 */

CanvasGL.prototype.beginBatch = function()
{
    this._batchActive = true;

    this._batchBufferVertices     = [];
    this._batchBufferIndices      = [];
    this._batchBufferVertexColors = [];
    this._batchBufferTexCoords    = [];

    this._batchOffsetVertices = 0;
};


CanvasGL.prototype._batchPush = function(vertices,indices,colors,texCoords,limit)
{
    var vlen,ilen,clen,tlen;

    this._batchLimit = limit || 0;

    if(this._batchLimit != 0)
    {
        vlen = limit;
        ilen = (vlen*0.5-2)*3;
        clen = vlen*2;
    }
    else
    {
        vlen = vertices.length;
        ilen = indices.length;
        clen = colors.length;
    }

    tlen = texCoords ? vlen : 0;

    var bv = this._batchBufferVertices,
        bi = this._batchBufferIndices,
        bc = this._batchBufferVertexColors,
        bt = this._batchBufferTexCoords;

    var i = -1;
    while(++i<vlen)
    {
        bv.push(vertices[i]);
    }

    i = -1;
    while(++i<ilen)
    {
        bi.push(indices[i] + this._batchOffsetVertices);
    }

    i = -1;
    while(++i<clen)
    {
        bc.push(colors[i]);
    }

    i = -1;
    while(++i<tlen)
    {
        bt.push(texCoords[i]);
    }

    this._batchOffsetVertices+=vlen*0.5;
};

/**
 * @method drawBatch
 */

CanvasGL.prototype.drawBatch = function()
{
    var gl = this.gl,
        glArrayBuffer = gl.ARRAY_BUFFER,
        glDynamicDraw = gl.DYNAMIC_DRAW,
        glFloat       = gl.FLOAT;

    var v,c,i,t;

    switch (arguments.length)
    {
        case 0:
            v = new Float32Array(this._batchBufferVertices);
            c = new Float32Array(this._batchBufferVertexColors);
            i = new Uint16Array(this._batchBufferIndices);
            t = new Float32Array(this._batchBufferTexCoords);
            break;
        case 1:
            var a = arguments[0];

            v = new Float32Array(a[0]);
            c = new Float32Array(a[1]);
            i = new Uint16Array(a[2]);
            t = new Float32Array(a[3]);
            break;
    }

    var vblen = v.byteLength,
        cblen = c.byteLength,
        tblen = t.byteLength,
        tlen  = vblen + cblen + tblen;

    var textured = t.length != 0;

    this._setMatrixUniform();

    var CONSTANTS = CanvasGL._CGLC;

    if(textured)
    {
        gl.bufferData(glArrayBuffer,tlen,glDynamicDraw);
        gl.bufferSubData(glArrayBuffer,0,    v);
        gl.bufferSubData(glArrayBuffer,vblen,c);
        gl.bufferSubData(glArrayBuffer,vblen+cblen,t);
        gl.vertexAttribPointer(this._locationAttribPosition,    CONSTANTS.SIZE_OF_VERTEX, glFloat,false,0,0);
        gl.vertexAttribPointer(this._locationAttribVertexColor, CONSTANTS.SIZE_OF_COLOR,  glFloat,false,0,vblen);
        gl.vertexAttribPointer(this._locationAttribTextureCoord,CONSTANTS.SIZE_OF_T_COORD,glFloat,false,0,vblen + cblen);
        gl.uniform1f(this._locationUniformUseTexture,this._currTint);
        gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);
        gl.uniform1f(this._locationUniformImage,0);

    }
    else
    {
        gl.bufferData(glArrayBuffer,tlen,glDynamicDraw);
        gl.bufferSubData(glArrayBuffer,0,    v);
        gl.bufferSubData(glArrayBuffer,vblen,c);
        gl.vertexAttribPointer(this._locationAttribPosition,    CONSTANTS.SIZE_OF_VERTEX, glFloat,false,0,0);
        gl.vertexAttribPointer(this._locationAttribVertexColor, CONSTANTS.SIZE_OF_COLOR,  glFloat,false,0,vblen);
    }

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,i,glDynamicDraw);
    gl.drawElements(gl.TRIANGLES, i.length,gl.UNSIGNED_SHORT,0);
};

/**
 * @method endBatch
 */

CanvasGL.prototype.endBatch = function()
{
    this._batchActive = false;
};

/**
 * @method getBatch
 * @return {Array}
 */

CanvasGL.prototype.getBatch = function()
{
    return [this._batchBufferVertices,
            this._batchBufferVertexColors,
            this._batchBufferIndices,
            this._batchBufferTexCoords];
};

CanvasGL.prototype.beginBatchToTexture = function()
{
    this._batchTextureActive = true;
};

CanvasGL.prototype.endBatchToTexture = function()
{
    this._batchTextureActive = false;

};




/*---------------------------------------------------------------------------------------------------------*/
// Image & Texture
/*---------------------------------------------------------------------------------------------------------*/

/**
 * @class CanvasGLImage
 * @constructor
 */

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

/**
 * @method loadImage
 * @param {String} path
 * @param {Object} target
 * @param {CanvasGLImage} obj
 * @param {String} callbackString
 */
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

/**
 * @method image
 * @param {CanvasGLImage} image
 * @param {Number} x
 * @param {Number} y
 * @param {Number} width
 * @param {Number} height
 */

CanvasGL.prototype.image = function(image, x, y, width, height)
{
    var rm = this._modeRect;
    var w = width || image._iwidth, h = height || image.height;
    var xx = x || 0 + (rm == 1 ? 0.0 : - w*0.5), yy = y || 0 + (rm == 1 ? 0.0 : - h*0.5);
    var xw = xx+w,yh = yy+h;

    this.texture(image);
    this.rect(xx,yy,xw,yh);
    this.noTexture();

};

/**
 * @method getImagePixel
 * @param img
 * @return {*}
 */

CanvasGL.prototype.getImagePixel = function(img)
{
    this._context2DSetImage(img);
    return this._context2DGetPixelData();
};

/*---------------------------------------------------------------------------------------------------------*/
// Shader loading
/*---------------------------------------------------------------------------------------------------------*/

//TODO: Implement

/**
 * @method loadFragmentShader
 * @param shaderScript
 * @return {*}
 */

CanvasGL.prototype.loadFragmentShader = function(shaderScript)
{
    return this._loadShader(shaderScript,this.gl.FRAGMENT_SHADER);
};

/**
 * @method loadFragmentShaderFromScript
 * @param shaderScriptId
 * @return {*}
 */

CanvasGL.prototype.loadFragmentShaderFromScript = function(shaderScriptId)
{
    var s = document.getElementById(shaderScriptId);

    if(s.type != this.gl.FRAGMENT_SHADER)
    {
        return null;
    }

    return this.loadFragmentShader(s.text);
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
        console.log("Could not compile shader.");
        gl.deleteShader(shader);
        shader = null;
    }

    return shader;
};

CanvasGL.prototype._loadProgram = function(vertexShader,fragmentShader)
{
    var gl = this.gl;
    var program = gl.createProgram();
    gl.attachShader(program,vertexShader);
    gl.attachShader(program,fragmentShader);
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

/**
 * @method getScreeCoord
 * @param {Number} x
 * @param {Number} y
 * @return {Array}
 */

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

/**
 * @method translate
 * @param {Number} x
 * @param {Number} y
 */

CanvasGL.prototype.translate = function(x,y)
{
    this._transMatrix = this.__mat33MultPost(this._transMatrix,this.__makeMat33Translate(x,y));
};

/**
 * @method scale
 * @param {Number} x
 * @param {Number} y
 */

CanvasGL.prototype.scale = function(x,y)
{
    this._transMatrix = this.__mat33MultPost(this._transMatrix,this.__makeMat33Scale(x,y));
};

/**
 * @method rotate
 * @param {Number} a
 */

CanvasGL.prototype.rotate = function(a)
{
    this._transMatrix = this.__mat33MultPost(this._transMatrix,this.__makeMat33Rotation(a));
};

/**
 * @method pushMatrix
 */

CanvasGL.prototype.pushMatrix = function()
{
    this._transMatrixStack.push(this.__makeMat33Copy(this._transMatrix));
};

/**
 * @method popMatrix
 */

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

CanvasGL.prototype.__faceIndicesFan = function(vertices,limit)
{
    var l  = limit || vertices.length,
        a  = new Array((l/2-2)*3),
        al = a.length;

    var i = 0,j;

    while(i < al)
    {
        j = i/3;

        a[i]   = 0;
        a[i+1] = j+1;
        a[i+2] = j+2;

        i+=3;
    }

    return a;
};

CanvasGL.prototype.__faceIndicesLinearCW = function(vertices,limit)
{
    var l  = limit || vertices.length,
        a  = new Array((l/2-2)*3),
        al = a.length;

    var i = 0;
    while(i < al)
    {
        if(i%2==0){a[i]=i/3;a[i+1]=i/3+2;a[i+2]=i/3+1;}
        else{a[i]=a[i-2];a[i+1]=a[i-2]+1;a[i+2]=a[i-1];}
        i+=3;
    }

    return a;
};

CanvasGL.prototype.__texCoordsLinearCW = function(vertices,limit)
{
    var l  = limit || vertices.length,
        a  = new Array(vertices.length),
        al = a.length;

    var i = 0;

    while(i < al)
    {
        if((i/3)%2==0)
        {
            a[i  ] = 0.0;
            a[i+1] = 0.0;
            a[i+2] = 1.0;
            a[i+3] = 0.0;
            a[i+4] = 0.0;
            a[i+5] = 1.0;
        }
        else
        {
            a[i  ] = 1.0;
            a[i+1] = 0.0;
            a[i+2] = 1.0;
            a[i+3] = 1.0;
            a[i+4] = 0.0;
            a[i+5] = 1.0;
        }
        i+=6;
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

CanvasGL.prototype.__p2 = function(n)
{
    return (n&(n-1))==0;
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

    var CONSTANTS = CanvasGL._CGLC;

    gl.bufferData(glArrayBuffer,vblen + cblen,glDynamicDraw);
    gl.bufferSubData(glArrayBuffer,0,vertexArray);
    gl.bufferSubData(glArrayBuffer,vblen,colorArray);
    gl.vertexAttribPointer(this._locationAttribPosition,   CONSTANTS.SIZE_OF_VERTEX,glFloat,false,0,0);
    gl.vertexAttribPointer(this._locationAttribVertexColor,CONSTANTS.SIZE_OF_COLOR, glFloat,false,0,vblen);
};

CanvasGL.prototype.__fillBufferTexture = function(vertexArray,colorArray,coordArray)
{
    var gl            = this.gl,
        glArrayBuffer = gl.ARRAY_BUFFER,
        glFloat       = gl.FLOAT;

    var vblen = vertexArray.byteLength,
        cblen = colorArray.byteLength,
        tblen = coordArray.byteLength,
        tlen  = vblen + cblen + tblen;

    var offSetV = 0,
        offSetC = vblen,
        offSetT = vblen + cblen;

    //gl.bindBuffer(glArrayBuffer,this._vbo);
    gl.bufferData(glArrayBuffer,tlen,gl.DYNAMIC_DRAW);

    gl.bufferSubData(glArrayBuffer,offSetV,vertexArray);
    gl.bufferSubData(glArrayBuffer,offSetC,colorArray);
    gl.bufferSubData(glArrayBuffer,offSetT,coordArray);

    var CONSTANTS = CanvasGL._CGLC;

    gl.vertexAttribPointer(this._locationAttribPosition,    CONSTANTS.SIZE_OF_VERTEX, glFloat,false,0,offSetV);
    gl.vertexAttribPointer(this._locationAttribVertexColor, CONSTANTS.SIZE_OF_COLOR,  glFloat,false,0,offSetC);
    gl.vertexAttribPointer(this._locationAttribTextureCoord,CONSTANTS.SIZE_OF_T_COORD,glFloat,false,0,offSetT);

    gl.uniform1f(this._locationUniformUseTexture,this._currTint);
    gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);


};

CanvasGL.prototype.__setArr = function(a,b)
{
    var i = -1,l = a.length;
    while(++i< l)
    {
        a[i] = b[i];
    }
};

CanvasGL.prototype.__rgbToHex = function(r,g,b)
{
    var h = (r << 16 | g << 8 | b).toString(16);
    return "#"+new Array(7-h.length).join("0")+h;
};

/*---------------------------------------------------------------------------------------------------------*/

/**
 * @method saveToPNG
 */

CanvasGL.prototype.saveToPNG = function()
{
    window.open(this._canvas3d.toDataURL('image/png'));
};

/*---------------------------------------------------------------------------------------------------------*/
// Text
/*---------------------------------------------------------------------------------------------------------*/

/**
 * @method setFontWeight
 * @param {String} weight
 */

CanvasGL.prototype.setFontWeight = function(weight)
{
    this._fontProperties.weight = weight;
    this._context2DApplyFontStyle();
};

/**
 * @method setFontSize
 * @param {Number} size
 */

CanvasGL.prototype.setFontSize = function(size)
{
    this._fontProperties.size = size;
    this._context2DApplyFontStyle();
};

/**
 * @method setFontFamily
 * @param {String} family
 */

CanvasGL.prototype.setFontFamily = function(family)
{
    this._fontProperties.family = family;
    this._context2DApplyFontStyle();
};

/**
 * @method setTextBaseLine
 * @param {String} textBaseLine
 */

CanvasGL.prototype.setTextBaseLine = function (textBaseLine)
{
    this._fontProperties.baseLine = textBaseLine;
    this._context2DApplyFontStyle();
};

/**
 * @method setTextAlign
 * @param {String} textAlign
 */

CanvasGL.prototype.setTextAlign = function (textAlign)
{
    this._fontProperties.textAlign = textAlign;
    this._context2DApplyFontStyle();
};

/**
 * @method setTextLineHeight
 * @param {Number} lineHeight
 */

CanvasGL.prototype.setTextLineHeight = function(lineHeight)
{
    this._fontProperties.lineHeight = lineHeight;
    this._context2DApplyFontStyle();
};

/**
 * @method textWidth
 * @param {String} string
 * @return {Number}
 */

CanvasGL.prototype.textWidth = function(string)
{
    return this.context2d.measureText(string).width;
};

/**
 * @method textHeight
 * @return {Number}
 */

CanvasGL.prototype.textHeight = function()
{
    return this._fontProperties.size;
};

//TODO: Fix

/**
 * @method text
 * @param {String} string
 * @param {Number} x
 * @param {Number} y
 * @param {Number} width
 * @param {Number} height
 */

CanvasGL.prototype.text = function(string,x,y,width,height)
{
    if(!this._fill && !this._stroke)return;

    var c = this.context2d;

    var tw,th,cw,ch;

    if(width)
    {
        var lines   = this._context2DWrapText(string,width- c.measureText('A').width),
            size    = this._fontProperties.size,
            lHeight = this._fontProperties.lineHeight;

        var cHeight = 0,
            rHeight = 0;

        tw = Math.floor(width);
        th = Math.floor(height);

        cw = this.__np2(tw);
        ch = this.__np2(th);

        this._context2DSetSize(cw,ch);

        c.save();
        c.setTransform(1,0,0,1,0,0);
        this._context2DApplyFontStyle();

        var fill    = this._fill,
            stroke  = this._stroke,
            fillC   = this._context2DColor(this._bufferColorFill4),
            strokeC = this._context2DColor(this._bufferColorStroke4);




        lines.forEach(function(line,i)
                      {
                          cHeight=i*size*lHeight;
                          rHeight+=cHeight;
                          if(fill)
                          {
                              c.fillStyle = fillC;
                              c.fillText(line,x,y+cHeight);
                          }

                          if(stroke)
                          {
                              c.strokeStyle = strokeC;
                              c.strokeText(line,x,y+cHeight);
                          }

                          }
        );



        c.restore();


    }
    else
    {
        var mt = c.measureText(string);

        tw = Math.floor(mt.width + mt.width*0.5);
        th = Math.floor(this._fontProperties.size)-1;

        cw = this.__np2(tw);
        ch = this.__np2(th);

        var xo = 0,
            yo = 0;

        this._context2DSetSize(cw,ch);

        c.save();
        c.setTransform(1,0,0,1,0,0);
        this._context2DApplyFontStyle();

        if(this._fill)
        {
            c.fillStyle = this._context2DColor(this._bufferColorFill4);
            c.fillText(string,xo,yo);
        }

        if(this._stroke)
        {
            c.strokeStyle = this._context2DColor(this._bufferColorStroke4);
            c.strokeText(string,xo,yo);
        }

        c.restore();

    }



    this._setCurrTexture(this._context2DGetTexture());

    var gl = this.gl;

    var v = this._bufferVerticesQuad;

    this._setMatrixUniform();

    v[ 0] = v[ 4] = x;
    v[ 1] = v[ 3] = y;
    v[ 2] = v[ 6] = x+ cw;
    v[ 5] = v[ 7] = y + ch;

    var glArrayBuffer = gl.ARRAY_BUFFER,
        glFloat = gl.FLOAT;

    c = this._applyColorToColorBuffer(this._bufferColorFill,this._bufferColorQuad);

    var t = this._bufferTexCoordsQuad;

    var vblen = v.byteLength,
        cblen = c.byteLength,
        tblen = t.byteLength,
        tlen  = vblen + cblen + tblen;

    var offSetV = 0,
        offSetC = offSetV + vblen,
        offSetT = vblen + cblen;

    //gl.bindBuffer(glArrayBuffer,this._vbo);
    gl.bufferData(glArrayBuffer,tlen,gl.DYNAMIC_DRAW);

    gl.bufferSubData(glArrayBuffer,0,v);
    gl.bufferSubData(glArrayBuffer,offSetC,c);
    gl.bufferSubData(glArrayBuffer,offSetT,t);

    var CONSTANTS = CanvasGL._CGLC;

    gl.vertexAttribPointer(this._locationAttribPosition,    CONSTANTS.SIZE_OF_VERTEX, glFloat,false,0,offSetV);
    gl.vertexAttribPointer(this._locationAttribVertexColor, CONSTANTS.SIZE_OF_COLOR,  glFloat,false,0,offSetC);
    gl.vertexAttribPointer(this._locationAttribTextureCoord,CONSTANTS.SIZE_OF_T_COORD,glFloat,false,0,offSetT);

    gl.uniform1f(this._locationUniformUseTexture,this._currTint);
    gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);
    gl.uniform1f(this._locationUniformImage,0);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

    this._disableTexture();

};

CanvasGL.prototype._context2DWrapText = function(text,width)
{
    var c = this.context2d;

    var words = text.split(' '),
        tWord,
        lines = [],
        line  = "";

    if (c.measureText(text).width < width)
    {
        return [text];
    }

    while (words.length > 0)
    {
        while (c.measureText(words[0]).width >= width)
        {
            tWord = words[0];
            words[0] = tWord.slice(0, -1);
            if (words.length > 1) {
                words[1] = tWord.slice(-1) + words[1];
            } else {
                words.push(tWord.slice(-1));
            }
        }
        if (c.measureText(line + words[0]).width < width)
        {
            line += words.shift() + " ";
        }
        else
        {
            lines.push(line);
            line = "";
        }
        if (words.length === 0)
        {
            lines.push(line);
        }
    }
    return lines;


};

/*---------------------------------------------------------------------------------------------------------*/
// Canvas2d for textures
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype._context2DColor = function(color)
{
    return "rgba("+Math.floor(color[0]*255)+","+Math.floor(color[1]*255)+","+Math.floor(color[2]*255)+","+color[3]+")";
};

CanvasGL.prototype._context2DSetFontProperties = function (fontProperties)
{
    for (var p in fontProperties)
    {
        this._fontProperties[p] = fontProperties[p];
    }

    this._context2DApplyFontStyle();
};

CanvasGL.prototype._context2DApplyFontStyle = function()
{
    var c = this.context2d;
    var p = this._fontProperties;

    c.textBaseline = p.baseLine;
    c.textAlign    = p.textAlign;
    c.lineHeight   = p.lineHeight;

    this.context2d.font = this._fontProperties.weight + " " +
                          this._fontProperties.size + "px " +
                          this._fontProperties.family;

};

CanvasGL.prototype._context2DGetPixelData = function(x,y,width,height)
{
    var c = this.canvas;

    x      = x || 0;
    y      = y || 0;
    width  = width  || c.width;
    height = height || c.height;

    return this.context2d.getImageData(x,y,width,height).data;
};

CanvasGL.prototype._context2DSetImage = function(img)
{
    var c = this.context2d;
    this._context2DSetSize(img.width,img.height);
    c.save();
    c.setTransform(1,0,0,1,0,0);
    c.clearRect(0,0,c.width,c.height);
    c.drawImage(img._t.image,0,0);
    c.restore();
};

CanvasGL.prototype._context2DGetTexture = function()
{
    var gl            = this.gl,
        glTexture2d   = gl.TEXTURE_2D,
        glClampToEdge = gl.CLAMP_TO_EDGE,
        glLinear      = gl.LINEAR,
        glRGB         = gl.RGB;

    gl.bindTexture(glTexture2d,this._context2DTexture);
    gl.texParameteri(glTexture2d, gl.TEXTURE_WRAP_S, glClampToEdge);
    gl.texParameteri(glTexture2d, gl.TEXTURE_WRAP_T, glClampToEdge);
    gl.texParameteri(glTexture2d, gl.TEXTURE_MAG_FILTER, glLinear);
    gl.texParameteri(glTexture2d, gl.TEXTURE_MIN_FILTER, glLinear);
    gl.texImage2D(glTexture2d, 0, glRGB, glRGB, gl.UNSIGNED_BYTE, this.canvas);

    return this._context2DTexture;
};

CanvasGL.prototype._context2DPrepareTexture = function()
{
    var gl            = this.gl,
        glTexture2d   = gl.TEXTURE_2D,
        glClampToEdge = gl.CLAMP_TO_EDGE,
        glLinear      = gl.LINEAR,
        glRGB         = gl.RGB;

    this._context2DSetSize(2,2);

    var tex = this.gl.createTexture();
    tex.image = this.canvas;

    gl.bindTexture(glTexture2d,tex);
    gl.texParameteri(glTexture2d, gl.TEXTURE_WRAP_S, glClampToEdge);
    gl.texParameteri(glTexture2d, gl.TEXTURE_WRAP_T, glClampToEdge);
    gl.texParameteri(glTexture2d, gl.TEXTURE_MAG_FILTER, glLinear);
    gl.texParameteri(glTexture2d, gl.TEXTURE_MIN_FILTER, glLinear);
    gl.texImage2D(glTexture2d, 0, glRGB, glRGB, gl.UNSIGNED_BYTE, tex.image);

    return tex;
};

CanvasGL.prototype._context2DSetSize = function(width,height)
{
    var c = this.canvas;
    c.style.width  = width + 'px';
    c.style.height = height + 'px';
    c.width  = parseInt(c.style.width) ;
    c.height = parseInt(c.style.height) ;
};

/*---------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------*/




