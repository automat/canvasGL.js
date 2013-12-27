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

function CanvasGL(element){
    var Default = CanvasGL.__Default;
    var parent = this._parent = element;

    parent.style.width  = parent.style.width  || (Default.INIT_WIDTH  + 'px');
    parent.style.height = parent.style.height || (Default.INIT_HEIGHT + 'px');


    /*------------------------------------------------------------------------------------------------------------*/
    //  Get contexts
    /*------------------------------------------------------------------------------------------------------------*/

    var canvas3d = this._canvas3d = document.createElement('canvas');
    var options = { alpha:false,
                    depth:false,
                    stencil:false,
                    antialias: false,
                    premultipliedAlpha:false,
                    preserveDrawingBuffer:true };

    var gl = this._context3d = canvas3d.getContext('webkit-3d',options) ||
                               canvas3d.getContext('webgl',options) ||
                               canvas3d.getContext('experimental-webgl',options);

    if(!gl){
        this.onNotAvailable();
        return;
    } //hmm

    canvas3d.tabIndex = '1';
    canvas3d.addEventListener('webglcontextlost',    this._onWebGLContextLost.bind(this));
    canvas3d.addEventListener('webglcontextrestored',this.onWebGLContextRestored.bind(this),false);

    var Flags = CanvasGL.__Flags;
    if(!Flags.Initialized){
        Flags.UintTypeAvailable = gl.getExtension('OES_element_index_uint');
        Flags.Initialized = true;
    }

    this._canvas2d  = document.createElement('canvas');
    this._context2d = this._canvas2d.getContext('2d');

    /*------------------------------------------------------------------------------------------------------------*/
    //  Init
    /*------------------------------------------------------------------------------------------------------------*/


    var glTexture2d          = gl.TEXTURE_2D,
        glRGBA               = gl.RGBA,
        glFrameBuffer        = gl.FRAMEBUFFER,
        glArrayBuffer        = gl.ARRAY_BUFFER,
        glElementArrayBuffer = gl.ELEMENT_ARRAY_BUFFER;

    // Setup 2d / post shader

    var Common  = CanvasGL.__Common;

    this._currProgram = null;
    this._prevProgram = null;

    this._program     = new CanvasGL.Program(this, CanvasGL.__vertShader,CanvasGL.__fragShader);
    this._programPost = new CanvasGL.Program(this, CanvasGL.__vertShaderPost, CanvasGL.__fragShaderPost);

    this._bColorBg    = new Float32Array([1.0,1.0,1.0,1.0]);
    this._bColorBgOld = new Float32Array([-1.0,-1.0,-1.0,-1.0]);
    this._backgroundClear  = Default.CLEAR_BACKGROUND;

    this._fbo0      = gl.createFramebuffer(); // main
    this._tex0      = gl.createTexture(); // fbo0 texture target

    this._fboCanvas = null;

    this._iwidth  = this._twidth  = this._width  = element.clientWidth;
    this._iheight = this._theight = this._height = element.clientHeight;
    this._ssaaf   = Common.SSAA_FACTOR;

    this.setSize(this._width,this._height);

    gl.bindFramebuffer(glFrameBuffer,this._fbo0);
    gl.framebufferTexture2D(glFrameBuffer, gl.COLOR_ATTACHMENT0,glTexture2d,this._tex0,0);
    gl.bindTexture(glTexture2d,null);

    this._bindFBO(this._fbo0);

    // VBO / IBO

    this._vboShared = gl.createBuffer();
    this._iboShared = gl.createBuffer();
    this._vboSelected = null;
    this._iboSelected = null;

    gl.bindBuffer(glArrayBuffer,        this._vboShared);
    gl.bindBuffer(glElementArrayBuffer, this._iboShared);

    var program = this._program;
    var ShaderDict = CanvasGL.__SharedShaderDict;
    gl.uniform1f(program[ShaderDict.uFlipY],1.0);

    //gl.uniform1f(this._uniformLocationFlipY,1.0); //set default flip y

    // Create default blank texture and texture coords / use color & set alpha to 1.0
    this._currTint = Default.TINT;
    this._blankTexture = gl.createTexture();
    gl.bindTexture(glTexture2d,this._blankTexture);
    gl.texImage2D( glTexture2d, 0, glRGBA, 1, 1, 0, glRGBA, gl.UNSIGNED_BYTE, new Uint8Array([1,1,1,1]));
    //gl.uniform1f(this._uniformLocationUseTexture,0.0);
    gl.uniform1f(program[ShaderDict.uUseTexture],0.0);

    // Create matrix stack and apply
    this._matrix      = this._mat33Make();
    this._matrixTemp  = this._mat33Make();
    this._matrixStack = [];
    this.setMatrixUniform();



    // Enable _context3d flags
    gl.enable(gl.BLEND);

    // Set draw modes
    this._modeEllipse = CanvasGL.CENTER;
    this._modeCircle  = CanvasGL.CENTER;
    this._modeRect    = CanvasGL.CORNER;

    this._texture     = false;
    this._textureCurr = null;

    this._textureOffset = false;

    this._textureOffsetX = this._textureOffsetY = 0;
    this._textureOffsetW = this._textureOffsetH = 0;



    /*------------------------------------------------------------------------------------------------------------*/
    //  Set vertices/color/texCoord temp buffers
    /*------------------------------------------------------------------------------------------------------------*/

    var Utils       = CanvasGL.__Utils,
        Value1State = Utils.Value1State,
        Value2State = Utils.Value2State,
        Float32ArrayMutable = Utils.Float32ArrayMutable,
        Uint16ArrayMutable  = Utils.Uint16ArrayMutable;

    var ELLIPSE_DETAIL_MAX = Common.ELLIPSE_DETAIL_MAX,
        SPLINE_DETAIL_MAX  = Common.SPLINE_DETAIL_MAX,
        BEZIER_DETAIL_MAX  = Common.BEZIER_DETAIL_MAX;
    var ELLIPSE_DETAIL = Default.ELLIPSE_DETAIL;

    var SET_ALLOCATE_SIZE = Default.SET_ALLOCATE_SIZE;

    this._bVertexPoint     = new Float32Array(2);
    this._bVertexLine      = new Float32Array(4);
    this._bVertexTriangle  = new Float32Array(6);
    this._bVertexQuad      = new Float32Array(8);

    var bVertexEllipseLen = ELLIPSE_DETAIL_MAX * 2,
        bColorEllipseLen  = ELLIPSE_DETAIL_MAX * 4,
        bIndexEllipseLen  = (ELLIPSE_DETAIL_MAX - 2) * 3;

    // ellipse

    this._bVertexEllipse     = new Float32Array(bVertexEllipseLen); // ellipse vertices from unit
    this._bVertexEllipseS    = new Float32Array(bVertexEllipseLen); // ellipse vertices from unit scaled xy
    this._bVertexEllipseT    = new Float32Array(bVertexEllipseLen); // ellipse vertices from scaled translated
    this._stateDetailEllipse = new Value1State();
    this._stateRadiusEllipse = new Value2State();
    this._stateOriginEllipse = new Value2State();

    /*
    this._prevDetailEllipse  = -1;
    this._currDetailEllipse  = ELLIPSE_DETAIL;
    this._prevRadiusXEllipse = -1;
    this._prevRadiusYEllipse = -1;
    this._currRadiusXEllipse = 0;
    this._currRadiusYEllipse = 0;
    this._prevPosEllipse     = [null,null];
    */

    // circle

    this._bVertexCircle     = new Float32Array(bVertexEllipseLen);  // circle vertices from detail
    this._bVertexCirlceS    = new Float32Array(bVertexEllipseLen);  // cirlce vertices from unit scaled
    this._bVertexCircleT    = new Float32Array(bVertexEllipseLen);  // circle vertices from scaled translated
    this._stateDetailCircle = new Value1State();
    this._stateRadiusCircle = new Value1State();
    this._stateOriginCircle = new Value2State();

    this._bVertexCircleSetS    = new Float32Array(bVertexEllipseLen); // circle set vertices from unit scaled
    this._bVertexCircleSetT    = new Float32Array(bVertexEllipseLen); // circle set vertices from scaled translated
    this._bVertexCircleSetM    = new Float32Array(bVertexEllipseLen); // cricle set vertices from scaled translated multiplied by matrix
    this._bIndexCircleSet      = new Uint16Array( bIndexEllipseLen);
    this._bTexCoordsCircleSet  = new Float32Array(bVertexEllipseLen);

    this._bVertexCircleSetArr   = new Float32ArrayMutable(bVertexEllipseLen * SET_ALLOCATE_SIZE,true);
    this._bColorCircleSetArr    = new Float32ArrayMutable(bColorEllipseLen  * SET_ALLOCATE_SIZE,true);
    this._bIndexCircleSetArr    = new Uint16ArrayMutable( bIndexEllipseLen  * SET_ALLOCATE_SIZE,true);
    this._bTexCoordCircleSetArr = new Float32ArrayMutable(bVertexEllipseLen * SET_ALLOCATE_SIZE,true);
    this._stateRadiusCircleSet  = new Value1State();
    this._stateOriginCircleSet  = new Value2State();




    var bVertexRoundRectLen = ELLIPSE_DETAIL_MAX * 2 + 8;
    this._bVertexRoundRect  = new Float32Array(bVertexRoundRectLen); // round rect from corner detail scaled
    this._bVertexRoundRectT = new Float32Array(bVertexRoundRectLen); // round rect from scaled translated
    this._prevDetailRRect   = -1;
    this._currDetailRRect   = Default.CORNER_DETAIL;
    this._prevWidthRRect    = -1;
    this._prevHeightRRect   = -1;
    this._prevPosRRect      = [null,null];



    this._bVertexBezier    = new Float32Array(BEZIER_DETAIL_MAX  * 2);
    this._bVertexArc       = new Float32Array(ELLIPSE_DETAIL_MAX * 2 * 2);
    this._bVertexArcStroke = new Float32Array(ELLIPSE_DETAIL_MAX * 2);
    this._bVertexSpline    = new Float32Array(SPLINE_DETAIL_MAX  * 4);


    this._bIndexRoundRect  = new Uint16Array((((this._bVertexRoundRect.length) / 2)-2) * 3);

    this._bTexCoordsQuadDefault     = new Float32Array([0.0,0.0,1.0,0.0,0.0,1.0,1.0,1.0]);
    this._bTexCoordsQuad            = new Float32Array(this._bTexCoordsQuadDefault);
    this._bTexCoordsTriangleDefault = new Float32Array([0.0,0.0,1.0,0.0,1.0,1.0]);
    this._bTexCoordsTriangle        = new Float32Array(this._bTexCoordsTriangleDefault.length);
    this._bTexCoordsEllipse         = new Float32Array(this._bVertexEllipse.length);
    this._bTexCoodsArc              = new Float32Array(this._bVertexArc.length);

    this._bColorVertex       = new Float32Array(4);
    this._bColorQuad         = new Float32Array(4 * 4);
    this._bColorTriangle     = new Float32Array(4 * 3);
    this._bColorLine         = new Float32Array(4 * 2);
    this._bColorPoint        = new Float32Array(4);
    this._bColorArc          = new Float32Array(4 * ELLIPSE_DETAIL_MAX*2);
    this._bColorCircle       = new Float32Array(4 * ELLIPSE_DETAIL_MAX);
    this._bColorEllipse      = new Float32Array(4 * ELLIPSE_DETAIL_MAX);
    this._bColorRoundRect    = new Float32Array(this._bVertexRoundRect.length * 2);

    this._cachedPointsBezier      = new Array(2 * 4);

    this._bIndexTriangle = [0,1,2];
    this._bIndexQuad     = [0,1,2,1,2,3];


    /*------------------------------------------------------------------------------------------------------------*/
    //  Setup fill props, buffers and cached values
    /*------------------------------------------------------------------------------------------------------------*/

    this._fill        = true;
    this._bColorFill4 = [1.0,1.0,1.0,1.0];
    this._bColorFill  = this._bColorFill4;

    this._stroke        = true;
    this._bColorStroke4 = [1.0,1.0,1.0,1.0];
    this._bColorStroke  = this._bColorStroke4;

    this._tempScreenCoords  = new Array(2);
    this._tempCurveVertices = [];



    this._bPolylineCacheLimit = 1000;
    this._bPolylineCache      = null;





    this._currDetailBezier   = Default.BEZIER_DETAIL;
    this._currDetailSpline   = Default.SPLINE_DETAIL;


    this._modeTexture = CanvasGL.CLAMP;


    this._currLineWidth = Common.LINE_WIDTH;

    // batch

    this._batchActive             = false;
    this._batchOffsetVertices     = 0;

    this._batchBVertex     = [];
    this._batchBColor = [];
    this._batchBIndex      = [];
    this._batchBTexCoord    = [];

    this._batchLimit = 0;

    this._batchTextureActive = false;


    this._drawFuncLast = null;


    /*------------------------------------------------------------------------------------------------------------*/
    //  Setup input
    /*------------------------------------------------------------------------------------------------------------*/

    this._keyDown   = false;
    this._keyStr    = '';
    this._keyCode   = '';

    this._mousePos        = [0,0];
    this._mousePosLast    = [0,0];
    this._mouseDown       = false;
    this._mouseMove       = false;
    this._mouseWheelDelta = 0.0;
    this._hideCursor      = false;

    var self = this;

    canvas3d.addEventListener('mousemove',
        function(e){
            self._mousePosLast[0] = self._mousePos[0];
            self._mousePosLast[1] = self._mousePos[1];
            self._mousePos[0] = e.offsetX; // TODO: non-chrome
            self._mousePos[1] = e.offsetY;
            self.onMouseMove(e);
        });

    canvas3d.addEventListener('mousedown',
        function(e){
            self._mouseDown = true;
            self.onMouseDown(e);
        });

    canvas3d.addEventListener('mouseup',
        function(e){
            self._mouseDown = false;
            self.onMouseUp(e);
        });

    canvas3d.addEventListener('mousewheel',
        function(e){
            self._mouseWheelDelta += Math.max(-1,Math.min(1, e.wheelDelta)) * -1;
            self.onMouseWheel(e);
        });

    canvas3d.addEventListener('keydown',
        function(e){
            self._keyDown = true;
            self._keyCode = e.keyCode;
            self._keyStr  = String.fromCharCode(e.keyCode);//not reliable;
            self.onKeyDown(e);
        });

    canvas3d.addEventListener('keyup',
        function(e){
            self._keyDown = false;
            self._keyCode = e.keyCode;
            self._keyStr  = String.fromCharCode(e.keyCode);
            self.onKeyUp(e);
        });


    /*------------------------------------------------------------------------------------------------------------*/
    //  Setup anim
    /*------------------------------------------------------------------------------------------------------------*/

    this._targetFPS    = Default.FPS;
    this._frameNum     = 0;
    this._time         = 0;
    this._timeStart    = -1;
    this._timeNext     = 0;
    this._timeInterval = this._targetFPS / 1000.0;
    this._timeDelta    = 0;
    this._timeElapsed  = 0;

    this._noLoop = false;

    window.requestAnimationFrame = window.requestAnimationFrame ||
                                   window.webkitRequestAnimationFrame ||
                                   window.mozRequestAnimationFrame;

    this._initDrawLoop();


    /*------------------------------------------------------------------------------------------------------------*/

    // attach the monster
    parent.appendChild(this._canvas3d);
}

CanvasGL.__vertShader     = "uniform mat3 uMatrix; uniform vec2 uResolution; uniform float uFlipY; attribute vec2 aVertPosition; attribute vec2 aTexCoord; varying vec2 vTexCoord; attribute vec4 aVertColor; varying vec4 vVertColor; void main() { vec2 clipSpace = vec2(uMatrix * vec3(aVertPosition.xy,1)).xy / uResolution * 2.0 - 1.0; gl_Position = vec4(clipSpace.x,-clipSpace.y * uFlipY,0,1); vTexCoord = aTexCoord; vVertColor = aVertColor; gl_PointSize = 1.0; }";
CanvasGL.__fragShader     = "precision mediump float; uniform float uUseTexture; uniform sampler2D uImage; varying vec2 vTexCoord; varying vec4 vVertColor; void main(){ vec4 texColor = texture2D(uImage,vTexCoord); gl_FragColor = vVertColor * (1.0 - uUseTexture) + texColor * uUseTexture; }"
CanvasGL.__vertShaderPost = "attribute vec2 aVertPosition; attribute vec2 aTexCoord; varying vec2 vTexCoord; uniform vec2 uResolution; void main(){ vec2 cs = vec2(aVertPosition/uResolution*2.0-1.0); gl_Position = vec4(cs.x,cs.y,0,1); vTexCoord = aTexCoord; }";
CanvasGL.__fragShaderPost = "precision mediump float; uniform sampler2D uSceenTex; varying vec2 vTexCoord; void main(){ gl_FragColor = texture2D(uSceenTex,vTexCoord); }";

CanvasGL.__Warning = {
    WEBGL_NOT_AVAILABLE : "WebGL is not available.",
    UNEQUAL_ARR_LENGTH_COLOR_BUFFER : "Color array length not equal to number of vertices",
    INVALID_STACK_POP: "Invalid matrix stack pop!",
    WEBGL_CONTEXT_LOST: "WebGL context lost.",
    WEBGL_CONTEXT_RESTORED: "WebGL context restored."
};

// Override in sublclass
CanvasGL.prototype.onNotAvailable = function(){
    console.log(CanvasGL.__Warning.WEBGL_NOT_AVAILABLE);
};

// TODO: fix me
CanvasGL.prototype._onWebGLContextLost = function(e){
    e.preventDefault();
    this.onWebGLContextLost(e);
};

// Override in sublcass
CanvasGL.prototype.onWebGLContextLost = function(e){
    console.log(CanvasGL.__Warning.WEBGL_CONTEXT_LOST);
};

// Override in subclass
CanvasGL.prototype.onWebGLContextRestored = function(){
    console.log(CanvasGL.__Warning.WEBGL_CONTEXT_RESTORED);
};

CanvasGL.prototype.getParent = function(){return this._parent;};


/*------------------------------------------------------------------------------------------------------------*/
// Props
/*------------------------------------------------------------------------------------------------------------*/

CanvasGL.__Flags = {
    Initialized : false,
    UintTypeAvailable : false
};

CanvasGL.__Default = {
    CLEAR_BACKGROUND : true,
    TINT:1.0,
    ELLIPSE_MODE : 0,
    RECT_MODE :    1,
    LINE_WIDTH:1,
    CORNER_DETAIL : 5,
    ELLIPSE_DETAIL: 10,
    BEZIER_DETAIL:  30,
    SPLINE_DETAIL:  10,
    TEXT_STYLE:      '',
    TEXT_WEIGHT:     'normal',
    TEXT_SIZE:       8,
    TEXT_FAMILY:     'Arial',
    TEXT_BASELINE:   'top',
    TEXT_ALIGN:      'left',
    TEXT_LINE_HEIGHT: 1,
    TEXT_SPACING:     '1',
    FPS: 30,
    INIT_WIDTH:100,
    INIT_HEIGHT:100,
    SET_ALLOCATE_SIZE : 500
};

CanvasGL.__Common = {
    BEZIER_DETAIL_MAX:50,
    ELLIPSE_DETAIL_MAX:50,
    SPLINE_DETAIL_MAX:50,
    LINE_ROUND_CAP_DETAIL_MAX:20,
    LINE_ROUND_CAP_DETAIL_MIN:4,
    CORNER_DETAIL_MAX     : 10,
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

    SSAA_FACTOR : 2,

    BUFFER_DEFAULT_RESERVE_AMOUNT : 50
};

CanvasGL.__SharedShaderDict = {
    uMatrix:'uMatrix',
    uResolution:'uResolution',
    uFlipY:'uFlipY',
    uImage:'uImage',
    uUseTexture:'uUseTexture',
    aVertPosition:'aVertPosition',
    aVertColor:'aVertColor',
    aTexCoord:'aTexCoord'
};

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


/*------------------------------------------------------------------------------------------------------------*/
// Canvas dimensions
/*------------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.setSize = function(width,height){
    var glc = this._canvas3d,
        gl  = this._context3d,
        s   = this._ssaaf,
        c   = this._bColorBg;

    this._width      = width;
    this._height     = height;
    glc.style.width  = width  + 'px';
    glc.style.height = height + 'px';
    glc.width        = this._iwidth  = width  * s;
    glc.height       = this._iheight = height * s;

    this._updateTex0Size();

    var program     = this._program,
        programPost = this._programPost;
    var ShaderDict  = CanvasGL.__SharedShaderDict;

    this.useProgram(programPost);
    gl.uniform2f(programPost[ShaderDict.uResolution],width,height);

   // gl.useProgram(this._programPost);
   // gl.uniform2f(this._uniformLocationPostResolution,width,height);


    this.useProgram(program);
    gl.uniform2f(program[ShaderDict.uResolution],width,height);

  //  gl.useProgram(this._program);
  //  gl.uniform2f(this._uniformLocationResolution,width,height);
    gl.viewport(0,0,width,height);

    var i_255 = 1.0 / 255.0;
    var c0 = c[0] * i_255,
        c1 = c[1] * i_255,
        c2 = c[2] * i_255;


    this._bindFBO(this._fboCanvas);
    gl.clearColor(c0,c1,c2,1.0);
    gl.clear(gl.COLOR_BUFFER_BIT );

    /*
    this._setFrameBuffer(this._fbo0);
    _context3d.clearColor(c0,c1,c2,1.0);
    _context3d.clear(_context3d.COLOR_BUFFER_BIT );
    */
};

CanvasGL.prototype.getWidth = function(){
    return this._width;
};

CanvasGL.prototype.getHeight = function(){
    return this._height;
};


/*------------------------------------------------------------------------------------------------------------*/
// Animation
/*------------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.noLoop = function(){
    this._noLoop = true;
};

CanvasGL.prototype._initDrawLoop = function(){
    this._timeStart = Date.now();
    if(!this._noLoop){
        var time, timeDelta;
        var timeInterval = this._timeInterval;
        var timeNext;
        var self = this;
        function drawLoop(){
            requestAnimationFrame(drawLoop,null);

            time      = self._time = Date.now();
            timeDelta = time - self._timeNext;
            self._timeDelta = Math.min(timeDelta / timeInterval, 1);

            if(timeDelta > timeInterval){
                timeNext = self._timeNext = time - (timeDelta % timeInterval);
                self._draw();

                self._timeElapsed = (timeNext - self._timeStart) / 1000.0;
                self._frameNum++;
            }
        }
        drawLoop();
    } else {
        this._draw();
    }

};

CanvasGL.prototype._resetDrawProperties = function(){
    var Default = CanvasGL.__Default;

    this.noStroke();
    this.noTexture();
    this.noFill();
    this.noTint();

    // ellipse

    this._stateDetailEllipse.writeEmpty();
    this._stateOriginEllipse.writeEmpty();
    this._stateRadiusEllipse.writeEmpty();
    this.setDetailEllipse(Default.ELLIPSE_DETAIL);
    this.setModeEllipse(CanvasGL.CENTER);


    // circle

    this._stateDetailCircle.writeEmpty();
    this._stateOriginCircle.writeEmpty();
    this._stateRadiusCircle.writeEmpty();
    this.setDetailCircle(Default.ELLIPSE_DETAIL);
    this.setModeCircle(CanvasGL.CENTER);


    this.setLineWidth(Default.LINE_WIDTH);


    this.setDetailBezier(Default.BEZIER_DETAIL);
    this.setDetailCurve(Default.SPLINE_DETAIL);
    this.setDetailCorner(Default.CORNER_DETAIL);

    this.setModeRect(CanvasGL.CORNER);

    this.resetBlend();

    this.resetUVOffset();
    this.resetUVQuad();
    this.resetUVTriangle();
};


CanvasGL.prototype._draw = function(){
    this._resetDrawProperties();

    this._applyFBOTexToQuad();
    this.clearColorBuffer();

    this.scale(this._ssaaf,this._ssaaf);
    this.draw();
};

// Override in subclass
CanvasGL.prototype.draw = function(){};

// Get time props
CanvasGL.prototype.setTargetFPS      = function(fps){this._targetFPS = fps;this._timeInterval  = this._targetFPS / 1000.0;};
CanvasGL.prototype.getTargetFPS      = function()   {return this._targetFPS;};
CanvasGL.prototype.getFramesElapsed  = function(){return this._frameNum;};
CanvasGL.prototype.getSecondsElapsed = function(){return this._timeElapsed;};
CanvasGL.prototype.getTime           = function(){return this._time};
CanvasGL.prototype.getTimeStart      = function(){return this._timeStart;};
CanvasGL.prototype.getTimeNext       = function(){return this._timeNext};
CanvasGL.prototype.getTimeDelta      = function(){return this._timeDelta;};


/*---------------------------------------------------------------------------------------------------------*/
// Input
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.isKeyDown          = function(){return this._keyDown;};
CanvasGL.prototype.isMouseDown        = function(){return this._mouseDown;};
CanvasGL.prototype.isMouseMove        = function(){return this._mouseMove;};
CanvasGL.prototype.getKeyCode         = function(){return this._keyCode;};
CanvasGL.prototype.getKeyStr          = function(){return this._keyStr;};

CanvasGL.prototype.getMousePos        = function(){return this._mousePos;};
CanvasGL.prototype.getMousePosLast    = function(){return this._mousePosLast;};
CanvasGL.prototype.getMousePosX       = function(){return this._mousePos[0];};
CanvasGL.prototype.getMousePosY       = function(){return this._mousePos[1];};
CanvasGL.prototype.getMousePosXLast   = function(){return this._mousePosLast[0];};
CanvasGL.prototype.getMousePosYLast   = function(){return this._mousePosLast[1];};

CanvasGL.prototype.getMouseWheelDelta = function(){return this._mouseWheelDelta;};

//Override in subclass
CanvasGL.prototype.onMouseMove  = function(e){};
CanvasGL.prototype.onMouseDown  = function(e){};
CanvasGL.prototype.onMouseUp    = function(e){};
CanvasGL.prototype.onMouseWheel = function(e){};
CanvasGL.prototype.onKeyDown    = function(e){};
CanvasGL.prototype.onKeyUp      = function(e){};


/*---------------------------------------------------------------------------------------------------------*/
// Drawing propes
/*---------------------------------------------------------------------------------------------------------*/


CanvasGL.prototype.setModeEllipse = function(mode){ this._modeEllipse = mode;};
CanvasGL.prototype.getModeEllipse = function()    {return this._modeEllipse;};

CanvasGL.prototype.setModeCircle = function(mode){ this._modeCircle = mode;};
CanvasGL.prototype.getModeCircle = function()    { return this._modeCircle;};

CanvasGL.prototype.setModeRect    = function(mode){ this._modeRect = mode; };
CanvasGL.prototype.getModeRect    = function()    { return this._modeRect;};

CanvasGL.prototype.setTextureWrap = function(mode){this._modeTexture = mode;};
CanvasGL.prototype.getTextureWrap = function()    { return this._modeTexture;};


CanvasGL.prototype.setDetailEllipse = function(a){
    var stateDetailEllipse = this._stateDetailEllipse;
    if(stateDetailEllipse.a == a)return;
    var max = CanvasGL.__Common.ELLIPSE_DETAIL_MAX;
    stateDetailEllipse.write(a > max ? max : a);
};

CanvasGL.prototype.getDetailEllipse = function(){return this._currDetailEllipse;};

CanvasGL.prototype.setDetailCircle = function(a){
    var stateDetailCircle = this._stateDetailCircle;
    if(stateDetailCircle.a == a)return;
    var max = CanvasGL.__Common.ELLIPSE_DETAIL_MAX;
    stateDetailCircle.write(a > max ? max : a);
};

CanvasGL.prototype.getDetailCircle  = function(){return this._stateDetailCircle.a;};

CanvasGL.prototype.setDetailBezier = function(a){
    var md = CanvasGL.__Common.BEZIER_DETAIL_MAX;
    this._currDetailBezier = a > md ? md : a;
};

CanvasGL.prototype.getDetailBezier = function(){return this._currDetailBezier;};

CanvasGL.prototype.setDetailCurve = function(a){
    var md = CanvasGL.__Common.SPLINE_DETAIL_MAX;
    this._currDetailSpline = a  > md ? md : a;
};

CanvasGL.prototype.getDetailCurve  = function(){return this._currDetailSpline;};

CanvasGL.prototype.setDetailCorner = function(a){
    var md = CanvasGL.__Common.CORNER_DETAIL_MAX;
    this._prevDetailRRect = this._currDetailRRect;
    this._currDetailRRect = a > md ? md : a;
};

CanvasGL.prototype.getDetailCorner = function(){return this._currDetailRRect;};

CanvasGL.prototype.setLineWidth = function(a){ this._currLineWidth = a;};
CanvasGL.prototype.getLineWidth = function() { return this._currLineWidth;};

CanvasGL.prototype.enableBlend  = function(){this._context3d.enable(this._context3d.BLEND);};
CanvasGL.prototype.disableBlend = function(){this._context3d.disable(this._context3d.BLEND);};


/*---------------------------------------------------------------------------------------------------------*/
// Shape fill/stroke/texture
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.fill = function(){
    var f = this._bColorFill = this._bColorFill4;
    f[3] = 1.0;
    var i_255 = 1.0 / 255.0;

    switch (arguments.length){
        case 0: f[0] = f[1] = f[2]  = 0.0; break;
        case 1: f[0] = f[1] = f[2]  = arguments[0] * i_255; break;
        case 2: f[0] = f[1] = f[2]  = arguments[0] * i_255;f[3] = arguments[1];break;
        case 3: f[0] = arguments[0] * i_255; f[1] = arguments[1] * i_255; f[2] = arguments[2] * i_255; break;
        case 4: f[0] = arguments[0] * i_255; f[1] = arguments[1] * i_255; f[2] = arguments[2] * i_255; f[3] = arguments[3]; break;
    }

    this._fill = true;
};

CanvasGL.prototype.fill1i = function(k){
    var f = this._bColorFill = this._bColorFill4;
    f[0] = f[1] = f[2] = k/255;f[3] = 1.0;
    this._fill = true;
};

CanvasGL.prototype.fill2i = function(k,a){
    var f = this._bColorFill = this._bColorFill4;
    f[0] = f[1] = f[2] = k/255;f[3] = a;
    this._fill = true;
};

CanvasGL.prototype.fill3i = function(r,g,b){
    var f = this._bColorFill = this._bColorFill4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = 1.0;
    this._fill = true;
};

CanvasGL.prototype.fill4i = function(r,g,b,a){
    var f = this._bColorFill = this._bColorFill4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = a;
    this._fill = true;
};

CanvasGL.prototype.fill1f = function(k){
    var f = this._bColorFill = this._bColorFill4;
    f[0] = f[1] = f[2] = k;f[3] = 1.0;
    this._fill = true;
};

CanvasGL.prototype.fill2f = function(k,a){
    var f = this._bColorFill = this._bColorFill4;
    f[0] = f[1] = f[2] = k;f[3] = a;
    this._fill = true;
};

CanvasGL.prototype.fill3f = function(r,g,b){
    var f = this._bColorFill = this._bColorFill4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = 1.0;
    this._fill = true;
};

CanvasGL.prototype.fill4f = function(r,g,b,a){
    var f = this._bColorFill = this._bColorFill4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = a;
    this._fill = true;
};

CanvasGL.prototype.fillv =  function(a){
    this.filliv(a);
};

CanvasGL.prototype.filliv = function(a){
    var i = 0;
    var i_255 = 1.0 / 255.0;
    while(i < a.length){
        a[i  ] *= i_255; a[i+1] *= i_255;a[i+2] *= i_255;
        i+=4;
    }

    this._bColorFill = a;
    this._fill = true;
};

CanvasGL.prototype.fillfv = function(a){
    this._bColorFill = a;
    this._fill = true;
};

CanvasGL.prototype.noFill = function(){
    this._fill = false;
};

CanvasGL.prototype.stroke = function(){
    var f = this._bColorStroke = this._bColorStroke4;
    f[3] = 1.0;
    var i_255 = 1.0 / 255.0;
    switch (arguments.length){
        case 0: f[0] = f[1] = f[2]  = 0.0; break;
        case 1: f[0] = f[1] = f[2]  = arguments[0] * i_255; break;
        case 2: f[0] = f[1] = f[2]  = arguments[0] * i_255; f[3] = arguments[1]; break;
        case 3: f[0] = arguments[0] * i_255; f[1] = arguments[1] * i_255; f[2] = arguments[2] * i_255; break;
        case 4: f[0] = arguments[0] * i_255; f[1] = arguments[1] * i_255; f[2] = arguments[2] * i_255; f[3] = arguments[3]; break;
    }

    this._stroke = true;
};

CanvasGL.prototype.stroke1i = function(k){
    var f = this._bColorStroke = this._bColorStroke4;
    f[0] = f[1] = f[2] = k/255;f[3] = 1.0;
    this._stroke = true;
};

CanvasGL.prototype.stroke2i = function(k,a){
    var f = this._bColorStroke = this._bColorStroke4;
    f[0] = f[1] = f[2] = k/255;f[3] = a;
    this._stroke = true;
};

CanvasGL.prototype.stroke3i = function(r,g,b){
    var f = this._bColorStroke = this._bColorStroke4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = 1.0;
    this._stroke = true;
};

CanvasGL.prototype.stroke4i = function(r,g,b,a){
    var f = this._bColorStroke = this._bColorStroke4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = a;
    this._stroke = true;
};

CanvasGL.prototype.stroke1f = function(k){
    var f = this._bColorStroke = this._bColorStroke4;
    f[0] = f[1] = f[2] = k;f[3] = 1.0;
    this._stroke = true;
};

CanvasGL.prototype.stroke2f = function(k,a){
    var f = this._bColorStroke = this._bColorStroke4;
    f[0] = f[1] = f[2] = k;f[3] = a;
    this._stroke = true;
};

CanvasGL.prototype.stroke3f = function(r,g,b){
    var f = this._bColorStroke = this._bColorStroke4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = 1.0;
    this._stroke = true;
};

CanvasGL.prototype.stroke4f = function(r,g,b,a){
    var f = this._bColorStroke = this._bColorStroke4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = a;
    this._stroke = true;
};

CanvasGL.prototype.strokev = function(a){
    this._bColorStroke = a;
    this._stroke = true;
};

CanvasGL.prototype.strokeiv = function(a){
    var i_255 = 1.0 / 255.0;
    var i = 0;
    while(i < a.length){
        a[i  ]*=i_255;
        a[i+1]*=i_255;
        a[i+2]*=i_255;
        i+=4;
    }

    this._bColorStroke = a;
    this._stroke = true;
};

CanvasGL.prototype.strokefv = function(a){
    this._bColorStroke = a;
    this._stroke = true;
};

CanvasGL.prototype.noStroke = function(){
    this._stroke = false;
};

CanvasGL.prototype.getStroke = function(){
    return this._stroke ? this._bColorStroke : null;
};

CanvasGL.prototype.getFill = function(){
    return this._fill ? this._bColorFill : null;
};

CanvasGL.prototype.bufferColors = function(color,buffer){
    var cl = color.length,
        bl = buffer.length;
    var i = 0;

    if(cl == 4){
        while(i < bl){
            buffer[i]  =color[0];
            buffer[i+1]=color[1];
            buffer[i+2]=color[2];
            buffer[i+3]=color[3];
            i+=4;
        }
    }
    else{
        if(cl != bl){
            throw CanvasGL.__Warning.UNEQUAL_ARR_LENGTH_COLOR_BUFFER;
        }

        while(i < bl){
            buffer[i]   = color[i];
            buffer[i+1] = color[i+1];
            buffer[i+2] = color[i+2];
            buffer[i+3] = color[i+3];
            i+=4;
        }
    }

    return buffer;
};

CanvasGL.prototype._color1fArr = function(k,length){
    var a = new Array(length);
    var i = -1;
    while(++i < length){a[i]=k;}
    return a;
};

CanvasGL.prototype._colorvLerped = function(colors,arr){
    var i, j, k, k1, l, l_1;
      l   = arr.length / 4;
    l_1 = l - 1;
    i   = -1;

    while(++i<l){
        j  = i * 4;
        k  = i / l_1;
        k1 = 1 - k;

        arr[j  ] = colors[0] * k1 + colors[4] * k;
        arr[j+1] = colors[1] * k1 + colors[5] * k;
        arr[j+2] = colors[2] * k1 + colors[6] * k;
        arr[j+3] = colors[3] * k1 + colors[7] * k;
    }

    return arr;
};


CanvasGL.prototype.tint = function(a){
    var Common = CanvasGL.__Common;
    this._currTint = Math.max(Common.TINT_MIN,Math.min(a,Common.TINT_MAX));
};

CanvasGL.prototype.noTint = function(){
    this._currTint = CanvasGL.__Common.TINT_MAX;
};


// Texture

CanvasGL.prototype._applyTexture = function(){
    var gl = this._context3d;
    var program = this._currProgram;
    var ShaderDict = CanvasGL.__SharedShaderDict;
    gl.uniform1f(program[ShaderDict.uUseTexture],1.0);
    //gl.uniform1f(this._uniformLocationUseTexture,1.0);
    gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);
    gl.uniform1f(program[ShaderDict.uUseImage],0);
    //gl.uniform1f(this._uniformLocationImage,0);
};

CanvasGL.prototype._disableTexture = function(){
    var gl = this._context3d;
    var program = this._currProgram;
    var ShaderDict = CanvasGL.__SharedShaderDict;
    gl.bindTexture(gl.TEXTURE_2D, this._blankTexture);
    gl.vertexAttribPointer(program[ShaderDict.aTexCoord],CanvasGL.__Common.SIZE_OF_T_COORD,gl.FLOAT,false,0,0);
    //gl.vertexAttribPointer(this._attribLocationTexCoord,CanvasGL.__Common.SIZE_OF_T_COORD,gl.FLOAT,false,0,0);
    //gl.uniform1f(this._uniformLocationUseTexture,0.0);
    gl.uniform1f(program[ShaderDict.uUseTexture],0.0);
    this._texture = false;
};

CanvasGL.prototype.setUVOffset = function(offsetU,offsetV,textureWidth,textureHeight){
    this._textureOffsetX = offsetU;
    this._textureOffsetY = offsetV;
    this._textureOffsetW = textureWidth-1;
    this._textureOffsetH = textureHeight-1;

    this._textureOffset = true;
};

CanvasGL.prototype.resetUVOffset = function(){
    this._textureOffsetX = 0;
    this._textureOffsetY = 0;
    this._textureOffsetW = 1;
    this._textureOffsetH = 1;

    this._textureOffset = false;
};

CanvasGL.prototype.setUVQuad = function(u0,v0,u1,v1,u2,v2,u3,v3){
    var t = this._bTexCoordsQuad;

    t[0] = u0;
    t[1] = v0;
    t[2] = u1;
    t[3] = v1;
    t[4] = u2;
    t[5] = v2;
    t[6] = u3;
    t[7] = v3;
};

CanvasGL.prototype.resetUVQuad = function(){
    this.__setArr(this._bTexCoordsQuad,this._bTexCoordsQuadDefault);
};

CanvasGL.prototype.setUVTriangle = function(u0,v0,u1,v1,u2,v2){
    var t = this._bTexCoordsTriangle;

    t[0] = u0;
    t[1] = v0;
    t[2] = u1;
    t[3] = v1;
    t[4] = u2;
    t[5] = v2;
};

CanvasGL.prototype.resetUVTriangle = function(){
    this.__setArr(this._bTexCoordsTriangle,this._bTexCoordsTriangleDefault);
};

CanvasGL.prototype.texture = function(img){
    this._bindTexture(img._t);
};

CanvasGL.prototype._bindTexture = function(tex){
    this._textureCurr = tex;

    var gl = this._context3d,
        m  = this._modeTexture;

    gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);

    if(m == CanvasGL.REPEAT){
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    }
    else if(m == CanvasGL.CLAMP){
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    }

    this._texture = true;
};

CanvasGL.prototype._createTexture = function(){
    var gl = this._context3d;
    var t  = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return t;
};

CanvasGL.prototype.noTexture = function(){
    this._disableTexture();
    this._texture = false;
};


CanvasGL.prototype.blend = function(src,dest){
    this._context3d.blendFunc(src,dest);
};


CanvasGL.prototype.resetBlend = function(){
    var gl = this._context3d;
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
};


CanvasGL.prototype.backgroundfv = function(){
    var col  = this._bColorBg;
    col[3] = 1.0;

    switch (arguments.length){
        case 0: col[0]=col[1]=col[2]=0.0;break;
        case 1: col[0]=col[1]=col[2]=arguments[0];break;
        case 2: col[0]=col[1]=col[2]=arguments[0];col[3]=arguments[1];break;
        case 3: col[0]=arguments[0];col[1]=arguments[1];col[2]=arguments[2];break;
        case 4: col[0]=arguments[0];col[1]=arguments[1];col[2]=arguments[2];col[3]=arguments[3];break;
    }

    this._backgroundClear = (col[3] == 1.0);
};

CanvasGL.prototype.backgroundiv = function(){
    var col  = this._bColorBg;
    col[3] = 1.0;

    var i_255 = 1.0 / 255.0;
    switch (arguments.length){
        case 0: col[0]=col[1]=col[2]=0.0;break;
        case 1: col[0]=col[1]=col[2]=arguments[0]*i_255;break;
        case 2: col[0]=col[1]=col[2]=arguments[0]*i_255;col[3]=arguments[1]*i_255;break;
        case 3: col[0]=arguments[0]*i_255;col[1]=arguments[1]*i_255;col[2]=arguments[2]*i_255;break;
        case 4: col[0]=arguments[0]*i_255;col[1]=arguments[1]*i_255;col[2]=arguments[2]*i_255;col[3]=arguments[3]*i_255;break;
    }

    this._backgroundClear = (col[3] == 1.0);
};

CanvasGL.prototype._applyFBOTexToQuad = function(){
    var gl = this._context3d;
    var w  = this._twidth ,
        h  = this._theight ,
        v  = this._bVertexQuad,
        c  = this._bColorQuad,
        t  = this._bTexCoordsQuad;
    var program = this._currProgram;
    var ShaderDict = CanvasGL.__SharedShaderDict;

    this.loadIdentity();
    this.setMatrixUniform();
    this.resetUVQuad();

    //gl.useProgram(this._program);
    this._bindFBO(this._fboCanvas);

    gl.uniform1f(program[ShaderDict.uUseTexture],1.0);
    gl.uniform1f(program[ShaderDict.uFlipY],-1.0);
    this._bindTexture(this._tex0);

    v[0] = v[1] = v[3] = v[4] =0;
    v[2] = v[6] = w;
    v[5] = v[7] = h;

    this.__fillBufferTexture(v,c,t);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

    this.useProgram(this._program);
    program = this._currProgram;
    gl.uniform1f(program[ShaderDict.uUseTexture],0.0);
    gl.uniform1f(program[ShaderDict.uFlipY],1.0);
    this._bindTexture(this._blankTexture);
    this._disableTexture();

    this._bindFBO(this._fbo0);
};

CanvasGL.prototype.clearColorBuffer = function()
{
    var gl = this._context3d;

    var c  = this._bColorBg,
        co = this._bColorBgOld;

    var i_255 = 1.0 / 255.0;


    if(this._backgroundClear){

        gl.clearColor(c[0],c[1],c[2],1.0);
        gl.clear(gl.COLOR_BUFFER_BIT );
    }
    else
    {
        if(c[0] != co[0] && c[1] != co[1] && c[2] != co[2] && c[3] != co[3])
        {
            var c0 = c[0] * i_255,
                c1 = c[1] * i_255,
                c2 = c[2] * i_255;

            this._bindFBO(this._fboCanvas);
            gl.clearColor(c0,c1,c2,1.0);
            gl.clear(gl.COLOR_BUFFER_BIT );

            this._bindFBO(this._fbo0);
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

CanvasGL.prototype._bindFBO = function(fbo)
{
    var gl = this._context3d;
    var program = this._currProgram;
    var w  = this._iwidth,
        h  = this._iheight;

    gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
    gl.uniform2f(program[CanvasGL.__SharedShaderDict.uResolution],w,h);
    gl.viewport(0,0,w,h);
};

CanvasGL.prototype._updateTex0Size = function()
{
    var gl = this._context3d,
        glTexture2d = gl.TEXTURE_2D,
        glNearest   = gl.NEAREST;

    this._twidth  = this.__np2(this._iwidth);
    this._theight = this.__np2(this._iheight);

    gl.bindTexture(glTexture2d,this._tex0);
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

    var gl = this._context3d;
    var v = this._bVertexQuad;

    this.setMatrixUniform();

    v[ 0] = x0;
    v[ 1] = y0;
    v[ 2] = x1;
    v[ 3] = y1;
    v[ 4] = x3;
    v[ 5] = y3;
    v[ 6] = x2;
    v[ 7] = y2;

    var c;

    if(this._fill && !this._texture){
        c = this.bufferColors(this._bColorFill,this._bColorQuad);

        if(this._batchActive){
            this._batchPush(v,this._bIndexQuad,c,null);
        }
        else {
            this.bufferArrays(v,c,null);
            gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        }
    }

    if(this._texture) {
        c = this.bufferColors(this._bColorFill,this._bColorQuad);

        var t  = this._bTexCoordsQuad,
            td = this._bTexCoordsQuadDefault;

        if(this._textureOffset){
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

        if(this._batchActive){
            this._batchPush(v,this._bIndexQuad,c,t);
        }
        else{
            this.__fillBufferTexture(v,c,t);
            gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        }
    }

    if(this._stroke){
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

    this._drawFuncLast = this.quad;
};


CanvasGL.prototype.rect = function(x,y,width,height){
    var cm = this._modeRect == CanvasGL.CENTER,
        rx,ry,rw,rh;

    if(cm){
        var w2 = width  * 0.5,
            h2 = height * 0.5;

        rx = x - w2;
        ry = y - h2;
        rw = x + w2;
        rh = y + h2;
    }
    else{
        rx = x;
        ry = y;
        rw = x+width;
        rh = y+height;

    }

    this.quad(rx,ry,rw,ry,rw,rh,rx,rh);

    this._drawFuncLast = this.rect;
};

CanvasGL.prototype._getRoundRectVertices = function(width,height,cornerRadius){

};



CanvasGL.prototype.roundRect = function(x,y,width,height,cornerRadius){
    if(!this._fill && !this._stroke && !this._texture)return;

    var drawFuncLastIsThis = this._drawFuncLast == this.roundRect;

    var prevDetail = this._currDetailRRect,
        currDetail = this._prevDetailRRect;

    var rm = this._modeRect;

    var xx = x + (rm == 1 ? 0.0 : - width*0.5),
        yy = y + (rm == 1 ? 0.0 : - height*0.5);


    var xc  = xx + cornerRadius,
        yc  = yy + cornerRadius,
        xwc = xx + width  - cornerRadius,
        yhc = yy + height - cornerRadius;

    if(cornerRadius == 0){
        this.quad(xc,yc,xwc,yc,xwc,yhc,xc,yhc);
        return;
    }

    var e = [xwc,yhc,xc,yhc,xc,yc,xwc,yc],
        ex,ey;

    var vertices = this._bVertexRoundRect,
        indices  = this._bIndexRoundRect;

    var Common = CanvasGL.__Common;

    var d  = this._currDetailRRect,
        d2 = d * Common.SIZE_OF_VERTEX,
        d3 = d2 + 2,
        i2 = (d  + 1) * Common.SIZE_OF_FACE,
        i3 = (i2 - 6),
        l  = d3 * 4,
        is = d3 / 2,
        il = (l  / 2  + 2) * Common.SIZE_OF_FACE;

    var m, m2,n,o,om,on;

    var pi2 = Math.PI * 0.5,
        s   = pi2 / (d-1);

    var a,as;

    m = 0;
    while(m < 4){
        om = m * (d2 + 2);
        m2 = m * 2;

        vertices[om  ] = ex = e[m2  ];
        vertices[om+1] = ey = e[m2+1];

        n  = om + 2;
        on = n  + d2;
        a  = m  * pi2;
        o  = 0;

        while(n < on){
            as = a + s*o;
            vertices[n  ] = ex + Math.cos(as) * cornerRadius;
            vertices[n+1] = ey + Math.sin(as) * cornerRadius;
            o++;
            n+=2;
        }

        ++m;
    }

    if(currDetail != prevDetail && !drawFuncLastIsThis){
        m = 0;
        while(m<4){
            om  = m * i2;
            n   = om;
            on  = n + i3;
            o   = 1;
            om /= 3;

            while(n < on){
                indices[n]   = om;
                indices[n+1] = om + o ;
                indices[n+2] = om + o + 1;

                o++;
                n+=3;
            }

            om = m * is;

            if(m<3){
                indices[n]   = indices[n+3] = om;
                indices[n+1] = om + is;
                indices[n+2] = indices[n+5] = indices[n+1] + 1 ;
                indices[n+4] = om + d;
            }
            else if(m==3){
                indices[n]   = om;
                indices[n+1] = indices[n+4] = om +d;
                indices[n+2] = indices[n+3] = 0;
                indices[n+5] = 1;
            }

            ++m;
        }

        indices[il-4] = 0;
        indices[il-2] = is*2;
        indices[il-5] = indices[il-3] = is;
        indices[il-6] = indices[il-1] = is*3;
    }

    var gl = this._context3d;
    var c;

    if(this._fill && !this._texture){
        c = this.bufferColors(this._bColorFill4,this._bColorRoundRect);

        if(this._batchActive){
            this._batchPush(vertices,indices,c,null);
        }
        else{
            var glArrayBuffer = gl.ARRAY_BUFFER,
                glDynamicDraw = gl.DYNAMIC_DRAW,
                glFloat       = gl.FLOAT;

            var vblen = vertices.byteLength,
                cblen = c.byteLength,
                tlen  = vblen + cblen;

            this.setMatrixUniform();

            var program = this._currProgram;
            var ShaderDict = CanvasGL.__SharedShaderDict;

            gl.bufferData(glArrayBuffer,tlen,glDynamicDraw);
            gl.bufferSubData(glArrayBuffer,0,    vertices);
            gl.bufferSubData(glArrayBuffer,vblen,c);
            gl.vertexAttribPointer(program[ShaderDict.aVertPosition], Common.SIZE_OF_VERTEX,glFloat,false,0,0);
            gl.vertexAttribPointer(program[ShaderDict.aVertColor],    Common.SIZE_OF_COLOR, glFloat,false,0,vblen);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,glDynamicDraw);
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
        vertices[0]      = vertices[2];
        vertices[1]      = vertices[3];

        vertices[d3]     = vertices[d3+2];
        vertices[d3+1]   = vertices[d3+3];

        vertices[d3*2]   = vertices[d3*2+2];
        vertices[d3*2+1] = vertices[d3*2+3];

        vertices[d3*3]   = vertices[d3*3+2];
        vertices[d3*3+1] = vertices[d3*3+3];


        this._polyline(vertices,d2*4+8,true);
    }

    this._drawFuncLast = this.roundRect;
};




CanvasGL.prototype.ellipse = function(x,y,radiusX,radiusY){
    if(!this._fill && !this._stroke && !this._texture)return;
    var gl = this._context3d;

    var modeOrigin  = this._modeEllipse;
    var stateOrigin = this._stateOriginEllipse,
        stateRadius = this._stateRadiusEllipse,
        stateDetail = this._stateDetailEllipse;

    var originX = modeOrigin == 0 ? x : x + radiusX,
        originY = modeOrigin == 0 ? y : y + radiusY;

    stateRadius.write(radiusX,radiusY);
    stateOrigin.write(originX,originY);

    var stateOriginChanged = !stateOrigin.isEqual(),
        stateRadiusChanged = !stateRadius.isEqual(),
        stateDetailChanged = !stateDetail.isEqual();

    var detail = stateDetail.a;
    var length = detail * 2;

    var vertices,
        colors;

    var bVertex  = this._bVertexEllipse,
        bVertexS = this._bVertexEllipseS,
        bVertexT = this._bVertexEllipseT;

    if(stateDetailChanged){
        this._getVerticesCircle(detail,bVertex);
    }

    if(stateRadiusChanged){
        this._scaleVertices(bVertex,radiusX,radiusY,bVertexS);
    }

    //hm
    //if(!stateRadiusChanged && !stateDetailChanged && !stateOriginChanged){
    //    vertices = bVertexT;
    //} else {
        vertices = this._translateVertices(bVertexS,originX,originY,bVertexT);
    //}

    this.setMatrixUniform();

    if(this._fill && !this._texture){
        colors = this.bufferColors(this._bColorFill,this._bColorEllipse);

        this.bufferArrays(vertices,colors);
        gl.drawArrays(gl.TRIANGLE_FAN,0,detail);
    }

    if(this._texture){
        colors = this.bufferColors(this._bColorFill,this._bColorEllipse);
        var texCoords = this._bTexCoordsEllipse;

        if(stateDetailChanged || this._textureOffset){
            this._getTexCoordsCircle(detail,texCoords);
        }

        this.__fillBufferTexture(vertices,colors,texCoords);
        gl.drawArrays(gl.TRIANGLE_FAN,0,detail);
    }

    if(this._stroke){
        this._polyline(vertices,length,true);
    }

    stateDetail.write(stateDetail.a);
    this._drawFuncLast = this.ellipse;
};


CanvasGL.prototype._getVerticesCircle = function(detail,out){
    var l = detail * 2;
    var theta = 2 * Math.PI / detail,
        cos   = Math.cos(theta),
        sin   = Math.sin(theta),
        t;
    var ox = 1,
        oy = 0;
    var i = 0;
    //http://slabode.exofire.net/circle_draw.shtml
    while(i < l){
        out[i  ] = ox;
        out[i+1] = oy;
        t  = ox;
        ox = cos * ox - sin * oy;
        oy = sin * t  + cos * oy;
        i+=2;
    }

    return out;
};


CanvasGL.prototype._getTexCoordsCircle = function(detail,out){
    var l = detail * 2;
    var oxx = this._textureOffsetX,
        oyy = this._textureOffsetY,
        ow  = (1+this._textureOffsetW) * 0.5 ,
        oh  = (1+this._textureOffsetH) * 0.5 ;

    var theta = 2 * Math.PI / detail,
        cos   = Math.cos(theta),
        sin   = Math.sin(theta),
        t;

    var ox = 1,oy = 0;

    var i = 0;
    while(i<l)
    {
        out[i  ] = (ow + oxx) + ox * ow;
        out[i+1] = (oh + oyy) + oy * oh;

        t  = ox;
        ox = cos * ox - sin * oy;
        oy = sin * t  + cos * oy;

        i+=2;
    }
};


CanvasGL.prototype.circle = function(x,y,radius){
    if(!this._fill && !this._stroke && !this._texture)return;
    var gl = this._context3d;

    var modeOrigin  = this._modeCircle;
    var stateOrigin = this._stateOriginCircle,
        stateRadius = this._stateRadiusCircle,
        stateDetail = this._stateDetailCircle;

    var originX = modeOrigin == 0 ? x : x + radius,
        originY = modeOrigin == 0 ? y : y + radius;

    stateOrigin.write(originX,originY);
    stateRadius.write(radius);

    var stateOriginChanged = !stateOrigin.isEqual(),
        stateRadiusChanged = !stateRadius.isEqual(),
        stateDetailChanged = !stateDetail.isEqual();

    var detail = stateDetail.a;
    var length = detail * 2;

    var vertices,
        colors;

    var bVertex  = this._bVertexCircle,
        bVertexS = this._bVertexCirlceS,
        bVertexT = this._bVertexCircleT;


    if(stateDetailChanged){
        vertices = this._getVerticesCircle(detail,bVertex);
    }

    if(stateRadiusChanged){
        vertices =  this._scaleVertices(bVertex,radius,radius,bVertexS);
    } else {
        vertices = bVertexS;
    }

    if(stateOriginChanged){
        vertices = this._translateVertices(bVertexS,originX,originY,bVertexT);
    } else {
        vertices = bVertexT;

    }

    this.setMatrixUniform();

    if(this._fill && !this._texture){
        colors = this.bufferColors(this._bColorFill,this._bColorCircle);

        this.bufferArrays(vertices,colors);
        gl.drawArrays(gl.TRIANGLE_FAN,0,detail);
    }

    if(this._texture){
        colors = this.bufferColors(this._bColorFill,this._bColorCircle);
        var texCoords = this._bTexCoordsEllipse;

        if(stateDetailChanged || this._textureOffset){
            this._getTexCoordsCircle(detail,texCoords);
        }

        this.__fillBufferTexture(vertices,colors,texCoords);
        gl.drawArrays(gl.TRIANGLE_FAN,0,detail);
    }

    if(this._stroke){
        this._polyline(vertices,length,true);
    }


    stateDetail.write(stateDetail.a);
    this._drawFuncLast = this.circle;
};


CanvasGL.prototype.circleSet = function(positions,radii){
    if(!this._fill && !this._stroke && !this._texture)return;
    if(positions.length == 0 || radii.length == 0 || positions.length * 0.5 != radii.length)return;
    var gl = this._context3d;

    var modeOrigin  = this._modeCircle;
    var stateOrigin = this._stateOriginCircleSet,
        stateRadius = this._stateRadiusCircleSet,
        stateDetail = this._stateDetailCircle;

    stateRadius.writeEmpty();
    stateOrigin.writeEmpty();

    var bVertex  = this._bVertexCircle,
        bVertexS = this._bVertexCircleSetS,
        bVertexT = this._bVertexCircleSetT,
        bVertexM = this._bVertexCircleSetM,
        bIndex   = this._bIndexCircleSet;

    var bColor4f = this._bColorFill4;
    var r, g, b,a;
        r = bColor4f[0];
        g = bColor4f[1];
        b = bColor4f[2];
        a = bColor4f[3];

    var bVertexArr   = this._bVertexCircleSetArr,
        bColorArr    = this._bColorCircleSetArr,
        bIndexArr    = this._bIndexCircleSetArr,
        bTexCoordArr = this._bTexCoordCircleSetArr;

    bVertexArr.reset();
    bColorArr.reset();
    bIndexArr.reset();
    bTexCoordArr.reset();

    var originX,originY;

    var stateDetailChanged = !stateDetail.isEqual(),
        stateRadiusChanged,
        stateOriginChanged;

    var num = positions.length * 0.5;
    var detail = stateDetail.a,
        length = detail * 2;

    if(stateDetailChanged){
        this._getVerticesCircle(detail,bVertex);
        bIndex = this._bIndexCircleSet = new Uint16Array(this._getFaceIndicesFan(length));
    }

    var x,y;
    var radius;

    var vertices, colors;

    var j;
    var i = -1;
    var i2,i4;

    var matrix = this._matrix;

    while(++i <  num){
        i2 = i * 2;
        i4 = i * 4;
        x = positions[i*2  ];
        y = positions[i*2+1];
        radius = radii[i];

        originX = modeOrigin == 0 ? x : x + radius;
        originY = modeOrigin == 0 ? y : y + radius;

        stateOrigin.write(originX,originY);
        stateRadius.write(radius);

        stateOriginChanged = !stateOrigin.isEqual();
        stateRadiusChanged = !stateRadius.isEqual();
        /*
        if(stateRadiusChanged){
            vertices = this._scaleVertices(bVertex,radius,radius,bVertexS);
        } else {
            vertices = bVertexS;
        }

        if(stateOriginChanged){
            vertices = this._translateVertices(bVertex,originX,originY,bVertexT);
        } else {
            vertices = bVertexT
        }
        */

        this._scaleVertices(bVertex,radius,radius,bVertexS);
        this._translateVertices(bVertexS,originX,originY,bVertexT);
        this._applyMat33Arr(bVertexT,matrix,bVertexM);

        bVertexArr.putfv(bVertexM,length);
        bIndexArr.putiv(bIndex, detail, num);
        bColorArr.put4f(r,g,b,a);












    }


    console.log(detail);
    console.log(bVertexArr);
    console.log(bIndexArr);
    console.log(bColorArr);



    stateDetail.write(stateDetail.a);
    this._drawFuncLast = this.circleSet;
};


CanvasGL.prototype.arc = function(centerX,centerY,radiusX,radiusY,startAngle,stopAngle,innerRadiusX,innerRadiusY){
    if(!this._fill && !this._stroke)return;

    innerRadiusX = innerRadiusX || 0;
    innerRadiusY = innerRadiusY || 0;

    var cm = this._modeEllipse;

    var cx = cm == 0 ? centerX : centerX + radiusX,
        cy = cm == 0 ? centerY : centerY + radiusY;

    var d = this._currDetailEllipse,
        l = d * 4,
        v = this._bVertexArc;

    var step = (stopAngle - startAngle)/(d*2-2);

    var s,coss,sins;

    var i = 0;

    var c;

    while(i < l){
        s    = startAngle + step * i;
        coss = Math.cos(s);
        sins = Math.sin(s);

        v[i  ] = cx + radiusX * coss;
        v[i+1] = cy + radiusY * sins;
        v[i+2] = cx + innerRadiusX * coss;
        v[i+3] = cy + innerRadiusY * sins;

        i+=4;
    }

    this.setMatrixUniform();

    if(this._fill && !this._texture){
        c = this.bufferColors(this._bColorFill,this._bColorArc);

        if(this._batchActive){
            this._batchPush(v,this._getFaceIndicesLinearCW(v,l), c,null,l);
        }
        else {
            var gl = this._context3d;
            this.bufferArrays(v,c);
            gl.drawArrays(gl.TRIANGLE_STRIP,0,l*0.5);
        }
    }


    if(this._texture){
        //var t = this._getTexCoordsLinearCW(v);
        //c = this._applyColorToColorBuffer(this._bColorFill,this._bColorArc);


        if(this._batchActive){

        }
        else{
            //this.__fillBufferTexture(v,c,t);
            //_context3d.drawArrays(_context3d.TRIANGLE_FAN,0,d)
        }
    }

    if(this._stroke){
        var vo = this._bVertexArcStroke;
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

    this._drawFuncLast = this.arc;
};

/**
 * Draws a line.
 * @method line
 */

CanvasGL.prototype.line = function(){
    if(!this._stroke)return;

    switch (arguments.length){
        case 1:
            if(arguments[0].length == 0)return;
            this._polyline(arguments[0]);
            break;
        case 4:
            var v = this._bVertexLine;

            v[0] = arguments[0];
            v[1] = arguments[1];
            v[2] = arguments[2];
            v[3] = arguments[3];

            this._polyline(v);
            break;
    }

    this._drawFuncLast = this.line;
};

CanvasGL.prototype.lineSet = function(lines,strokeColors,lineWidths)
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

    this._drawFuncLast = this.lineSet;
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

CanvasGL.prototype.bezier = function(x0,y0,x1,y1,x2,y2,x3,y3){
    var d   = this._currDetailBezier,
        d_2 = d - 2,
        p   = this._cachedPointsBezier,
        v   = this._bVertexBezier;

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

    while(i < d){
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
    this._drawFuncLast = this.bezier;
};

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


CanvasGL.prototype.bezierTangentAngle = function(d){
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

CanvasGL.prototype.curve = function(points){
    var d = this._currDetailSpline,
        d_2 = d - 2;

    var i = 0, j,t;

    var vertices = this._tempCurveVertices = [];
    var pl = points.length;
    var ni;

    while(i < pl-2){
        j = 0;
        while(j < d){
            t  = j / d_2;
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
    this._drawFuncLast = this.curve;
};


CanvasGL.prototype._catmullrom = function(a,b,c,d,i){
    return a * ((-i + 2) * i - 1) * i * 0.5 +
           b * (((3 * i - 5) * i) * i + 2) * 0.5 +
           c * ((-3 * i + 4) * i + 1) * i * 0.5 +
           d * ((i - 1) * i * i) * 0.5;
};

CanvasGL.prototype.beginCurve =  function(out){
    this._tempCurveVertices = out || [];
};

CanvasGL.prototype.endCurve =  function(){
    this.curve(this._tempCurveVertices);
};

CanvasGL.prototype.curveVertex = function(x,y){
    this._tempCurveVertices.push(x,y)
};

CanvasGL.prototype.triangle = function(x0,y0,x1,y1,x2,y2){
    if(!this._fill && !this._stroke)return;

    var gl = this._context3d;
    var v  = this._bVertexTriangle;
    v[0] = x0;
    v[1] = y0;
    v[2] = x1;
    v[3] = y1;
    v[4] = x2;
    v[5] = y2;

    this.setMatrixUniform();

    var c;

    if(this._fill && this._texture)
    {
        c = this.bufferColors(this._bColorFill,this._bColorTriangle);

        if(this._batchActive)
        {
            this._batchPush(this._bVertexTriangle,this._bIndexTriangle,c,null);
        }
        else
        {
            this.bufferArrays(v,c);
            gl.drawArrays(gl.TRIANGLES,0,3);
        }
    }

    if(this._texture)
    {
        c = this.bufferColors(this._bColorFill,this._bColorTriangle);

        var t = this._bTexCoordsTriangle;

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
            this._batchPush(v,this._bIndexTriangle,c,t);
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

            var Common     = CanvasGL.__Common,
                ShaderDict = CanvasGL.__SharedShaderDict;

            var program = this._currProgram;

            //_context3d.bindBuffer(glArrayBuffer,this._vboShared);
            gl.bufferData(glArrayBuffer,tlen,gl.DYNAMIC_DRAW);

            gl.bufferSubData(glArrayBuffer,0,v);
            gl.bufferSubData(glArrayBuffer,offSetC,c);
            gl.bufferSubData(glArrayBuffer,offSetT,t);

            gl.vertexAttribPointer(program[ShaderDict.aVertPosition], Common.SIZE_OF_VERTEX, glFloat,false,0,offSetV);
            gl.vertexAttribPointer(program[ShaderDict.aVertColor],    Common.SIZE_OF_COLOR,  glFloat,false,0,offSetC);
            gl.vertexAttribPointer(program[ShaderDict.aTexCoord],     Common.SIZE_OF_T_COORD,glFloat,false,0,offSetT);

            gl.uniform1f(program[ShaderDict.uUseTexture],this._currTint);
            gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);
            gl.uniform1f(program[ShaderDict.uImage],0);
            gl.drawArrays(gl.TRIANGLES,0,1);

            this._disableTexture();
        }
    }

    if(this._stroke)
    {
        this._polyline(v, v.length,true);
    }

    this._drawFuncLast = this.triangle;
};


/**
 * @method point
 * @param {Number} x
 * @param {Number} y
 */

CanvasGL.prototype.point = function(x,y)
{
    if(!this._fill)return;

    var v  = this._bVertexPoint,
        c  = this.bufferColors(this._bColorFill4,this._bColorPoint);

    v[0] = x;
    v[1] = y;

    this.setMatrixUniform();
    this.bufferArrays(v,c);
    this._context3d.drawArrays(this._context3d.POINTS,0,1);

    this._drawFuncLast = this.point;
};


CanvasGL.prototype.pointSet = function(vertexArrOrFloat32Arr){
    if(!this._fill)return;
    var Utils = CanvasGL.__Utils;
    var gl  = this._context3d;

    this.setMatrixUniform();
    this.bufferArrays(Utils.safeFloat32Array(vertexArrOrFloat32Arr),
                     this.bufferColors(this._bColorFill,new Float32Array(vertexArrOrFloat32Arr.length*2)));
    gl.drawArrays(gl.POINTS,0,vertexArrOrFloat32Arr.length*0.5);
    this._drawFuncLast = this.pointSet;
};

CanvasGL.prototype._polyline = function(joints,length,loop){
    if(!this._stroke || this._currLineWidth <= 0.0)return;

    var color    = this._bColorStroke,
        colorLen = color.length;

    if(colorLen!= 4 && colorLen!=8){
        throw ("Color array length not valid.");
    }

    loop = Boolean(loop);

    var pvcol = color.length != 4;

    var lineWidth = this._currLineWidth;

    var Common     = CanvasGL.__Common,
        ShaderDict = CanvasGL.__SharedShaderDict;

    var jointSize      = 2,
        jointLen       = (length || joints.length) + (loop ? jointSize : 0),
        jointCapResMax = Common.LINE_ROUND_CAP_DETAIL_MAX,
        jointCapResMin = Common.LINE_ROUND_CAP_DETAIL_MIN,
        jointCapRes    = (lineWidth <= 2.0 ) ? 0 : Math.round(lineWidth)*4 ,
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

    while(i < jointNum){
        vertexIndex = i * 2;

        x = joints[vertexIndex];
        y = joints[vertexIndex+1];

        if(loop && (i == jointNum_1)){
            x = joints[0];
            y = joints[1];
        }

        cx = jointRad;
        cy = 0;

        offsetV = j = vtLen * i;

        while(j < offsetV + vjLen){
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

        while(j < offsetI + ijLen){
            indices[j ]  = faceIndex;
            indices[j+1] = faceIndex + k;
            indices[j+2] = faceIndex + k + 1;

            j+=3;
            k++;
        }

        if(i < jointNum - 1){
            nx = joints[vertexIndex+2];
            ny = joints[vertexIndex+3];

            if(loop && (i == jointNum_2)){
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

    if(pvcol){
        var colIArr = this._colorvLerped(color,new Array(jointNum*4));
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
    else{
        this.bufferColors(this._bColorStroke,colors);
    }

    this.setMatrixUniform();

    var gl = this._context3d,
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
        var program = this._currProgram;

        if(this._texture)
        {
            gl.bindTexture(gl.TEXTURE_2D, this._blankTexture);
            gl.vertexAttribPointer(program[ShaderDict.aTexCoord],Common.SIZE_OF_T_COORD,gl.FLOAT,false,0,0);
            gl.uniform1f(program[ShaderDict.uUseTexture],0.0);
        }

        gl.bufferData(glArrayBuffer,tlen,glDynamicDraw);
        gl.bufferSubData(glArrayBuffer,0,    vertices);
        gl.bufferSubData(glArrayBuffer,vblen,colors);
        gl.vertexAttribPointer(program[ShaderDict.aVertPosition], Common.SIZE_OF_VERTEX,glFloat,false,0,0);
        gl.vertexAttribPointer(program[ShaderDict.aVertColor],    Common.SIZE_OF_COLOR, glFloat,false,0,vblen);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,glDynamicDraw);
        gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
    }
};



CanvasGL.prototype.drawArrays = function(verticesArrOrFloat32Arr,
                                         colorArrOrFloat32Arr,
                                         mode){
    if(!this._fill)return;

    var Utils = CanvasGL.__Utils;

    var vertices = Utils.safeFloat32Array(verticesArrOrFloat32Arr),
        colors   = this.bufferColors((colorArrOrFloat32Arr || this._bColorFill4),
                                      new Float32Array(verticesArrOrFloat32Arr.length * 2));

    var gl  = this._context3d;

    if(this._batchActive){
        this._batchPush(vertices,
                        mode == 5 ? this._getFaceIndicesLinearCW(vertices) : this._getFaceIndicesFan(vertices.length),
                        colors,null);

    } else {
        this.bufferArrays(vertices,colors,null);
        gl.drawArrays(mode,0,vertices.length*0.5);
    }

    this._drawFuncLast = this.drawArrays;
};



CanvasGL.prototype.drawElements = function(vertices,indices,colors){
    if(!this._fill)return;
    var Utils = CanvasGL.__Utils;

    vertices = Utils.safeFloat32Array(vertices);
    indices  = indices ?
               Utils.safeUint16Array(indices) :
               new Uint16Array(this._getFaceIndicesLinearCW(vertices));

    var colorsExpLength = vertices.length * 2;

    if(colors){
        colors = colors.length == colorsExpLength ?
                 Utils.safeFloat32Array(colors) :
                 this.bufferColors(colors, new Float32Array(colorsExpLength));
    } else {
        colors = this.bufferColors(this._bColorFill4, new Float32Array(colorsExpLength));
    }

    var gl = this._context3d;

    if(this._batchActive){
        this._batchPush(vertices,indices,colors,null);
    }
    else{
        this.bufferArrays(vertices,colors,null,gl.DYNAMIC_DRAW);
        this.setMatrixUniform();
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.DYNAMIC_DRAW);
        gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
    }

    this._drawFuncLast = this.drawElements;
};

/**
 * @method beginBatch
 */

CanvasGL.prototype.beginBatch = function()
{
    this._batchActive = true;

    this._batchBVertex     = [];
    this._batchBIndex      = [];
    this._batchBColor = [];
    this._batchBTexCoord    = [];

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

    var bv = this._batchBVertex,
        bi = this._batchBIndex,
        bc = this._batchBColor,
        bt = this._batchBTexCoord;

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
    var gl = this._context3d,
        glArrayBuffer = gl.ARRAY_BUFFER,
        glDynamicDraw = gl.DYNAMIC_DRAW,
        glFloat       = gl.FLOAT;

    var v,c,i,t;

    switch (arguments.length)
    {
        case 0:
            v = new Float32Array(this._batchBVertex);
            c = new Float32Array(this._batchBColor);
            i = new Uint16Array(this._batchBIndex);
            t = new Float32Array(this._batchBTexCoord);
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

    this.setMatrixUniform();

    var Common     = CanvasGL.__Common,
        ShaderDict = CanvasGL.__SharedShaderDict;
    var program = this._currProgram;

    if(textured){
        gl.bufferData(glArrayBuffer,tlen,glDynamicDraw);
        gl.bufferSubData(glArrayBuffer,0,    v);
        gl.bufferSubData(glArrayBuffer,vblen,c);
        gl.bufferSubData(glArrayBuffer,vblen+cblen,t);
        gl.vertexAttribPointer(program[ShaderDict.aVertPosition], Common.SIZE_OF_VERTEX, glFloat,false,0,0);
        gl.vertexAttribPointer(program[ShaderDict.aVertColor],    Common.SIZE_OF_COLOR,  glFloat,false,0,vblen);
        gl.vertexAttribPointer(program[ShaderDict.aTexCoord],     Common.SIZE_OF_T_COORD,glFloat,false,0,vblen + cblen);
        gl.uniform1f(program[ShaderDict.uUseTexture],this._currTint);
        gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);
        gl.uniform1f(program[ShaderDict.uImage],0);

    }
    else{
        gl.bufferData(glArrayBuffer,tlen,glDynamicDraw);
        gl.bufferSubData(glArrayBuffer,0,    v);
        gl.bufferSubData(glArrayBuffer,vblen,c);
        gl.vertexAttribPointer(program[ShaderDict.aVertPosition], Common.SIZE_OF_VERTEX, glFloat,false,0,0);
        gl.vertexAttribPointer(program[ShaderDict.aVertColor],    Common.SIZE_OF_COLOR,  glFloat,false,0,vblen);
    }

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,i,glDynamicDraw);
    gl.drawElements(gl.TRIANGLES, i.length,gl.UNSIGNED_SHORT,0);

    this._drawFuncLast = this.drawBatch;
};

CanvasGL.prototype.endBatch = function(){
    this._batchActive = false;
};

CanvasGL.prototype.getBatch = function(out){

    if(out){
        var Utils = CanvasGL.__Utils;
        out[0] = Utils.copyFloat32Array(this._batchBVertex);
        out[1] = Utils.copyFloat32Array(this._batchBColor);
        out[2] = Utils.copyFloat32Array(this._batchBIndex);
        out[3] = Utils.copyFloat32Array(this._batchBTexCoord);
        return out;
    }

    return [this._batchBVertex,
            this._batchBColor,
            this._batchBIndex,
            this._batchBTexCoord];
};

CanvasGL.prototype.beginBatchToTexture = function(){
    this._batchTextureActive = true;
};

CanvasGL.prototype.endBatchToTexture = function(){
    this._batchTextureActive = false;

};




/*---------------------------------------------------------------------------------------------------------*/
// Image & Texture
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.image = function(image, x, y, width, height)
{
    var rm = this._modeRect;
    var w = width || image.width,
        h = height || image.height;
    var xx = x || 0 + (rm == 1 ? 0.0 : - w*0.5),
        yy = y || 0 + (rm == 1 ? 0.0 : - h*0.5);
    var xw = xx+w,yh = yy+h;

    this.texture(image);
    this.rect(xx,yy,xw,yh);
    this.noTexture();

    this._drawFuncLast = this.image;
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

CanvasGL.prototype.useProgram = function(program){
    if(program == this._currProgram)return;
    this._prevProgram = this._currProgram;
    this._context3d.useProgram(program.program);
    program.enableVertexAttribArrays(this);
    this._currProgram = program;
};

CanvasGL.prototype.getProgram = function(){return this._currProgram;};

CanvasGL.prototype.loadShader = function(source,type){
    var gl = this._context3d;
    var shader = gl.createShader(type);

    gl.shaderSource(shader,source);
    gl.compileShader(shader);

    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))
        throw gl.getShaderInfoLog(shader);

    return shader;
};

CanvasGL.prototype.createProgram = function(vertexShader,fragmentShader)
{
    var gl = this._context3d;
    var program = gl.createProgram();
    gl.attachShader(program,vertexShader);
    gl.attachShader(program,fragmentShader);
    gl.linkProgram(program);

    if(!gl.getProgramParameter(program,gl.LINK_STATUS))
        throw gl.getProgramInfoLog(program);

    return program;
};

/*---------------------------------------------------------------------------------------------------------*/
// Matrix
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.setMatrixUniform = function(){
    this._context3d.uniformMatrix3fv(this._currProgram[CanvasGL.__SharedShaderDict.uMatrix],false,this._matrix);
};

CanvasGL.prototype.loadIdentity = function(){
    this._mat33Identity(this._matrix);
};

CanvasGL.prototype.translate = function(x,y){
    this._mat33MultPost(this._matrix, this._mat33MakeTranslate(x,y,this._mat33Identity(this._matrixTemp)), this._matrix);
};

CanvasGL.prototype.scale = function(x,y){
   this._mat33MultPost(this._matrix, this._mat33MakeScale(x,y,this._mat33Identity(this._matrixTemp)), this._matrix);
};

CanvasGL.prototype.rotate = function(a){
   this._mat33MultPost(this._matrix, this._mat33MakeRotate(a,this._mat33Identity(this._matrixTemp)), this._matrix);
};

CanvasGL.prototype.multMatrix = function(m){
    this._mat33MultPost(this._matrix, m, this._matrix);
};

CanvasGL.prototype.pushMatrix = function(){
  this._matrixStack.push(this._mat33Copy(this._matrix));
};

CanvasGL.prototype.popMatrix = function(){
    var stack = this._matrixStack;
    if(stack.length == 0){
        throw CanvasGL.__Warning.INVALID_STACK_POP;
    }

    this._matrix = stack.pop();
    return this._matrix;
};


/*---------------------------------------------------------------------------------------------------------*/
// Private matrix
/*---------------------------------------------------------------------------------------------------------*/

// Internal Matrix 3x3 class for all transformations

// SX  0  0   0  1  2
//  0 SY  0   3  4  5
// TX TY  1   6  7  8


CanvasGL.prototype._mat33Make = function(){
    return new Float32Array([1,0,0,0,1,0,0,0,1]);
};

CanvasGL.prototype._mat33Identity = function(m){
    m[ 0] = 1;m[ 4] = 1;m[ 8] = 1;
    m[ 1] = m[ 2] = m[ 3] = m[ 5] = m[ 6] = m[ 7] = 0;
    return m;
};

CanvasGL.prototype._mat33Copy = function(m){
    return new Float32Array(m);
};

CanvasGL.prototype._mat33MakeScale = function(x,y,m){
    m[0] = x; m[4] = y;
    return m;
};

CanvasGL.prototype._mat33MakeTranslate = function(x,y,m){
    m[6] = x; m[7] = y;
    return m;
};

CanvasGL.prototype._mat33MakeRotate = function(a,m){
    var sin = Math.sin(a),
        cos = Math.cos(a);

    m[0] = cos;
    m[1] = sin;
    m[3] = -sin;
    m[4] = cos;
    return m;
};

CanvasGL.prototype._mat33MultPre = function(m0,m1,m){
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

CanvasGL.prototype._mat33MultPost = function(m0,m1,m){
    return this._mat33MultPre(m1,m0,m);
};

CanvasGL.prototype._applyMat33 = function(v,m,out){
    out = out || v;
    var x = v[0], y = v[1];
    out[0] = m[0] * x + m[3] * y + m[6];
    out[1] = m[1] * x + m[4] * y + m[7];
    return out;
};

CanvasGL.prototype._applyMat33Arr = function(vArr,m,outArr){
    outArr = outArr || vArr;
    var m0 = m[0],m1 = m[1],
        m3 = m[3],m4 = m[4],
        m6 = m[6],m7 = m[7];

    var x,y;
    var i = 0, l = vArr.length;
    var i1;
    while(i < l){
        i1 = i + 1;
        x = vArr[i  ];
        y = vArr[i1];
        outArr[i ] = m0 * x + m3 * y + m6;
        outArr[i1] = m1 * x + m4 * y + m7;
        i+=2;
    }
}


/*---------------------------------------------------------------------------------------------------------*/
// Helper
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype._getFaceIndicesFan = function(verticesLen){
    var l  = verticesLen,
        a  = new Array((l/2-2)*3),
        al = a.length;

    var i = 0,j;

    while(i < al){
        j = i/3;

        a[i]   = 0;
        a[i+1] = j+1;
        a[i+2] = j+2;

        i+=3;
    }

    return a;
};

CanvasGL.prototype._getFaceIndicesLinearCW = function(vertices,limit){
    var l  = limit || vertices.length,
        a  = new Array((l/2-2)*3),
        al = a.length;

    var i = 0;
    while(i < al){
        if(i%2==0){a[i]=i/3;a[i+1]=i/3+2;a[i+2]=i/3+1;}
        else{a[i]=a[i-2];a[i+1]=a[i-2]+1;a[i+2]=a[i-1];}
        i+=3;
    }

    return a;
};

CanvasGL.prototype._getTexCoordsLinearCW = function(vertices,limit){
    var l  = limit || vertices.length,
        a  = new Array(vertices.length),
        al = a.length;

    var i = 0;

    while(i < al){
        if((i/3)%2==0){
            a[i  ] = 0.0;
            a[i+1] = 0.0;
            a[i+2] = 1.0;
            a[i+3] = 0.0;
            a[i+4] = 0.0;
            a[i+5] = 1.0;
        }
        else {
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


CanvasGL.prototype._getFaceIndicesLinearCCW = function(vertices)
{
    var a = new Array((vertices.length/2-2)*3);
    var i = 0;
    while(i < a.length){
        if(i%2==0){a[i]=i/3;a[i+1]=i/3+1;a[i+2]=i/3+2;}
        else{a[i]=a[i-1];a[i+1]=a[i-2];a[i+2]=a[i-1]+1;}
        i+=3;
    }

    return a;
};

// Translate vertices
CanvasGL.prototype._translateVertices = function(src,x,y,out){
    var i = 0, l = src.length;
    while(i < l){
        out[i  ] = src[i  ] + x;
        out[i+1] = src[i+1] + y;
        i+=2;
    }

    return out;
};

CanvasGL.prototype._scaleVertices = function(src,scaleX,scaleY,out){
    var i = 0, l = src.length;
    while(i < l){
        out[i  ] = src[i  ] * scaleX;
        out[i+1] = src[i+1] * scaleY;
        i+=2;
    }

    return out;
};


CanvasGL.prototype.bufferArrays = function(vertexFloat32Array,colorFloat32Array,texCoord32Array,glDrawMode){
    var ta = texCoord32Array ? true : false;

    var program    = this._currProgram,
        ShaderDict = CanvasGL.__SharedShaderDict;

    var paVertexPosition = program[ShaderDict.aVertPosition],
        paVertexColor    = program[ShaderDict.aVertColor],
        paVertexTexCoord = program[ShaderDict.aTexCoord];

    var gl            = this._context3d,
        glArrayBuffer = gl.ARRAY_BUFFER,
        glFloat       = gl.FLOAT;

    glDrawMode = glDrawMode || gl.STATIC_DRAW;

    var vblen = vertexFloat32Array.byteLength,
        cblen = colorFloat32Array.byteLength,
        tblen = ta ? texCoord32Array.byteLength : 0;

    var offsetV = 0,
        offsetC = offsetV + vblen,
        offsetT = offsetC + cblen;

    gl.bufferData(glArrayBuffer,vblen + cblen + tblen, glDrawMode);

    gl.bufferSubData(glArrayBuffer,0, vertexFloat32Array);
    gl.vertexAttribPointer(paVertexPosition, 2, glFloat, false, 0, offsetV);

    gl.bufferSubData(glArrayBuffer,vblen,colorFloat32Array);
    gl.vertexAttribPointer(paVertexColor, 4, glFloat, false, 0, offsetC);

    /*
    if(!ta){
        gl.disableVertexAttribArray(paVertexTexCoord);
    } else {
        gl.enableVertexAttribArray(paVertexTexCoord);
        gl.bufferSubData(glArrayBuffer, 2, glFloat, false, offsetT);
    }
    */

};

CanvasGL.prototype.__fillBufferTexture = function(vertexArray,colorArray,coordArray)
{
    var gl            = this._context3d,
        glArrayBuffer = gl.ARRAY_BUFFER,
        glFloat       = gl.FLOAT;

    var vblen = vertexArray.byteLength,
        cblen = colorArray.byteLength,
        tblen = coordArray.byteLength,
        tlen  = vblen + cblen + tblen;

    var offSetV = 0,
        offSetC = vblen,
        offSetT = vblen + cblen;

    //_context3d.bindBuffer(glArrayBuffer,this._vboShared);
    gl.bufferData(glArrayBuffer,tlen,gl.DYNAMIC_DRAW);

    gl.bufferSubData(glArrayBuffer,offSetV,vertexArray);
    gl.bufferSubData(glArrayBuffer,offSetC,colorArray);
    gl.bufferSubData(glArrayBuffer,offSetT,coordArray);

    var Common     = CanvasGL.__Common,
        ShaderDict = CanvasGL.__SharedShaderDict;
    var program = this._currProgram;

    gl.vertexAttribPointer(program[ShaderDict.aVertPosition], Common.SIZE_OF_VERTEX, glFloat,false,0,offSetV);
    gl.vertexAttribPointer(program[ShaderDict.aVertColor],    Common.SIZE_OF_COLOR,  glFloat,false,0,offSetC);
    gl.vertexAttribPointer(program[ShaderDict.aTexCoord],     Common.SIZE_OF_T_COORD,glFloat,false,0,offSetT);

    gl.uniform1f(program[ShaderDict.uUseTexture],this._currTint);
    gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);


};

CanvasGL.prototype.__setArr = function(a,b){
    var i = -1,l = a.length;
    while(++i< l){
        a[i] = b[i];
    }
};





CanvasGL.prototype.__rgbToHex = function(r,g,b){
    var h = (r << 16 | g << 8 | b).toString(16);
    return "#"+new Array(7-h.length).join("0")+h;
};

CanvasGL.prototype.__np2 = function(n){
    n--;
    n |= n>>1; n |= n>>2; n |= n>>4; n |= n>>8; n |= n>>16;
    n++;
    return n;
};

CanvasGL.prototype.__pp2 = function(n){
    var n2 = n>>1;
    return n2>0 ? this.__np2(n2) : this.__np2(n);
};

CanvasGL.prototype.__p2 = function(n){
    return (n&(n-1))==0;
};

CanvasGL.prototype.__nnp2 = function(n){
    if((n&(n-1))==0)return n;
    var nn = this.__np2(n);
    var pn = this.__pp2(n);
    return (nn-n)>Math.abs(n-pn) ? pn : nn;
};




/*---------------------------------------------------------------------------------------------------------*/

/**
 * @method saveToPNG
 */

CanvasGL.prototype.saveToPNG = function(){
    window.open(this._canvas3d.toDataURL('image/png'));
};


/*---------------------------------------------------------------------------------------------------------*/
// Screen Coords / unproject
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.getScreenCoord = function(x,y){
    x = x || 0;
    y = y || 0;

    var m = this._matrix;
    var s = this._tempScreenCoords;

    s[0] = m[ 0] * x + m[ 3] * y + m[6];
    s[1] = m[ 1] * x + m[ 4] * y + m[7];

    return s
};

/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.getContext3d = function(){return this._context3d;};
CanvasGL.prototype.getContext2d = function(){return this._context2d;};

/*---------------------------------------------------------------------------------------------------------*/
// Class CanvasGLImage
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.Image = function(){
    this._t     = null;
    this._glID  = null;
    this.width  = null;
    this.height = null;
};


CanvasGL.Image.prototype._set = function(t)
{
    this._t = t;
    this.width  = t.image.width;
    this.height = t.image.height;
};

CanvasGL.Image.loadImage = function(path,target,obj,callbackString)
{
    var gl = this._context3d;
    var tex = gl.createTexture();
    tex.image = new Image();

    tex.image.onload = function(){
        var img = tex.image;

        if(!img){
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


/*---------------------------------------------------------------------------------------------------------*/
// Program
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.Program = function(cgl,vertexShader,fragmentShader){
    var gl = cgl.getContext3d();
    var program    = this.program    = gl.createProgram(),
        vertShader = this.vertShader = gl.createShader(gl.VERTEX_SHADER),
        fragShader = this.fragShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertShader,vertexShader);
    gl.compileShader(vertShader);

    if(!gl.getShaderParameter(vertShader,gl.COMPILE_STATUS))
        throw gl.getShaderInfoLog(vertShader);

    gl.shaderSource(fragShader,  fragmentShader);
    gl.compileShader(fragShader);

    if(!gl.getShaderParameter(fragShader,gl.COMPILE_STATUS))
        throw gl.getShaderInfoLog(fragShader);

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram( program);

    var i, paramName;

    //thanks plask
    var uniformsNum   = this._uniformsNum   = gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);
    i = -1;while(++i < uniformsNum){
        paramName = gl.getActiveUniform(program,i).name;
        this[paramName] = gl.getUniformLocation(program,paramName);
    }

    var attributesNum = this._attributesNum = gl.getProgramParameter(program,gl.ACTIVE_ATTRIBUTES);
    var attributes    = this._attributes    = new Array(attributesNum);
    i = -1;while(++i < attributesNum){
        paramName = gl.getActiveAttrib(program,i).name;
        attributes[i] = this[paramName] = gl.getAttribLocation(program,paramName);
    }
};

CanvasGL.Program.prototype.getUniformsNum   = function(){return this._uniformsNum;};
CanvasGL.Program.prototype.getAttributesNum = function(){return this._attributesNum;};

CanvasGL.Program.prototype.enableVertexAttribArrays = function(cgl){
    var i = -1,a = this._attributes,n = this._attributesNum, gl = cgl.getContext3d();
    while(++i < n){gl.enableVertexAttribArray(a[i]);}
};

CanvasGL.Program.prototype.disableVertexAttribArrays = function(cgl){
    var i = -1,a = this._attributes,n = this._attributesNum, gl = cgl.getContext3d();
    while(++i < n){gl.disableVertexAttribArray(a[i]);}
};

/*---------------------------------------------------------------------------------------------------------*/
// Internal
/*---------------------------------------------------------------------------------------------------------*/
CanvasGL.__Utils = {};
CanvasGL.__Utils.isUndefined = function(obj){return typeof obj === 'undefined';}
CanvasGL.__Utils.isFloat32Array   = function(arr){return arr instanceof Float32Array;};
CanvasGL.__Utils.safeFloat32Array = function(arr){return arr instanceof Float32Array ? arr : new Float32Array(arr);};
CanvasGL.__Utils.safeUint16Array  = function(arr){return arr instanceof Uint16Array ? arr : new Uint16Array(arr);};
CanvasGL.__Utils.copyFloat32Array = function(arr){return new Float32Array(arr);};

CanvasGL.__Utils.Value1State = function(a,b){
    a = CanvasGL.__Utils.isUndefined(a) ? null : a;
    b = CanvasGL.__Utils.isUndefined(b) ? null : b;
    this.a=a;
    this.b=b;
};

CanvasGL.__Utils.Value1State.prototype.write      = function(a){this.b=this.a;this.a=a;};
CanvasGL.__Utils.Value1State.prototype.isEqual    = function(){return this.a == this.b;};
CanvasGL.__Utils.Value1State.prototype.writeEmpty = function(){this.write(null);};
CanvasGL.__Utils.Value1State.prototype.toString = function(){return this.a + ' ' + this.b;};


CanvasGL.__Utils.Value2State = function(a0,a1,b0,b1){
    a0 = CanvasGL.__Utils.isUndefined(a0) ? null : a0;
    a1 = CanvasGL.__Utils.isUndefined(a1) ? null : a1;
    b0 = CanvasGL.__Utils.isUndefined(b0) ? null : b0;
    b1 = CanvasGL.__Utils.isUndefined(b1) ? null : b1;
    this.a0 = a0;
    this.a1 = a1;
    this.b0 = b0;
    this.b1 = b1;
};

CanvasGL.__Utils.Value2State.prototype.write = function(a0,a1){this.b0=this.a0;this.b1=this.a1;this.a0=a0;this.a1=a1;};
CanvasGL.__Utils.Value2State.prototype.isEqual = function(){return this.a0 == this.b0 && this.a1 == this.b1;};
CanvasGL.__Utils.Value2State.prototype.writeEmpty = function(){this.write(null,null);};
CanvasGL.__Utils.Value2State.prototype.toString = function(){return this.a0 + ' ' + this.a1 + ' ' + this.b0 + ' ' + this.b1;};


//hm
CanvasGL.__Utils.Float32ArrayMutable = function(reserveSize,autoresize){
    this._reservedSize = reserveSize;
    this.array         = new Float32Array(this._reservedSize);
    this._autoresize   = CanvasGL.__Utils.isUndefined(autoresize) ? false : autoresize;

    this._index = 0;
};

CanvasGL.__Utils.Float32ArrayMutable.MAX = 134217728;

CanvasGL.__Utils.Float32ArrayMutable.prototype.put1f = function(a){
    var size = this._reservedSize;
    if(this._autoresize && (this._index + 1 >= size)){
            this.resize(Math.floor((size + 1) * 1.2));
    }
    var array = this.array;
    array[this._index++] = a;
};

CanvasGL.__Utils.Float32ArrayMutable.prototype.put2f = function(a,b){
    var size  = this._reservedSize;
    if(this._autoresize && (this._index + 2 >= size)){
            this.resize(Math.round((size + 2) * 1.5));
    }
    var array = this.array;
    array[this._index++] = a;
    array[this._index++] = b;
};

CanvasGL.__Utils.Float32ArrayMutable.prototype.put3f = function(a,b,c){
    var size  = this._reservedSize;
    if(this._autoresize && (this._index + 3 >= size)){
        this.resize(Math.round((size + 3) * 1.5));
    }
    var array = this.array;
    array[this._index++] = a;
    array[this._index++] = b;
    array[this._index++] = c;
};

CanvasGL.__Utils.Float32ArrayMutable.prototype.put4f = function(a,b,c,d){
    var size  = this._reservedSize;
    if(this._autoresize && (this._index + 4 >= size)){
        this.resize(Math.round((size + 4) * 1.5));
    }
    var array = this.array;
    array[this._index++] = a;
    array[this._index++] = b;
    array[this._index++] = c;
    array[this._index++] = d;
};

CanvasGL.__Utils.Float32ArrayMutable.prototype.putfv = function(arr,limit){
    var l      = limit  ? arr.length : limit;
    var size   = this._reservedSize;
    if(this._autoresize && (this._index + l >= size)){
        this.resize(Math.round((size + l) * 1.5));
    }
    var array = this.array;
    var i = -1;
    while(++i < l){array[this._index++] = arr[i];}
};

CanvasGL.__Utils.Float32ArrayMutable.prototype.resize = function(size){
    this._reservedSize = size;
    var array = new Float32Array(this._reservedSize);
    array.set(this.array);
    this.array = array;
};

CanvasGL.__Utils.Float32ArrayMutable.prototype.size  = function(){return this._index;};
CanvasGL.__Utils.Float32ArrayMutable.prototype.sizeAllocated = function(){return this.array.length;};
CanvasGL.__Utils.Float32ArrayMutable.prototype.reset = function(){this._index = 0;};



CanvasGL.__Utils.Uint16ArrayMutable = function(reserveSize,autoresize){
    this._reservedSize = reserveSize;
    this.array         = new Uint16Array(this._reservedSize);
    this._autoresize   = CanvasGL.__Utils.isUndefined(autoresize) ? false : autoresize;

    this._index = 0;
};

CanvasGL.__Utils.Uint16ArrayMutable.MAX = 134217728;

CanvasGL.__Utils.Uint16ArrayMutable.prototype.put1f = function(a){
    var size = this._reservedSize;
    if(this._autoresize && (this._index + 1 >= size)){
        this.resize(Math.floor((size + 1) * 1.2));
    }
    var array = this.array;
    array[this._index++] = a;
};

CanvasGL.__Utils.Uint16ArrayMutable.prototype.put2f = function(a,b){
    var size  = this._reservedSize;
    if(this._autoresize && (this._index + 2 >= size)){
        this.resize(Math.round((size + 2) * 1.5));
    }
    var array = this.array;
    array[this._index++] = a;
    array[this._index++] = b;
};

CanvasGL.__Utils.Uint16ArrayMutable.prototype.put3f = function(a,b,c){
    var size  = this._reservedSize;
    if(this._autoresize && (this._index + 3 >= size)){
        this.resize(Math.round((size + 3) * 1.5));
    }
    var array = this.array;
    array[this._index++] = a;
    array[this._index++] = b;
    array[this._index++] = c;
};

CanvasGL.__Utils.Uint16ArrayMutable.prototype.put4f = function(a,b,c,d){
    var size  = this._reservedSize;
    if(this._autoresize && (this._index + 4 >= size)){
        this.resize(Math.round((size + 4) * 1.5));
    }
    var array = this.array;
    array[this._index++] = a;
    array[this._index++] = b;
    array[this._index++] = c;
    array[this._index++] = d;
};

CanvasGL.__Utils.Uint16ArrayMutable.prototype.putiv = function(arr,limit,offset){
    offset = offset ? offset : 0;
    var l      = limit  ? arr.length : limit;
    var size   = this._reservedSize;
    if(this._autoresize && (this._index + l >= size)){
        this.resize(Math.round((size + l) * 1.5));
    }
    var array = this.array;
    var i = -1;
    while(++i < l){array[this._index++] = offset + arr[i];}
};

CanvasGL.__Utils.Uint16ArrayMutable.prototype.resize = function(size){
    this._reservedSize = size;
    var array = new Uint16Array(this._reservedSize);
    array.set(this.array);
    this.array = array;
};

CanvasGL.__Utils.Uint16ArrayMutable.prototype.size  = function(){return this._index;};
CanvasGL.__Utils.Uint16ArrayMutable.prototype.sizeAllocated = function(){return this.array.length;};
CanvasGL.__Utils.Uint16ArrayMutable.prototype.reset = function(){this._index = 0;};







/*

CanvasGL.__VBOPool = function(sizeVertex, sizeColor, sizeTexCoord, reserveSize){
    this._reservedSize = reserveSize;
    this._f32VertexArray   = new Float32Array(reserveSize * sizeVertex);
    this._f32ColorArray    = new Float32Array(reserveSize * sizeColor);
    this._f32TexCoordArray = new Float32Array(reserveSize * sizeTexCoord);
    this._sizeUsed = 0;
};

CanvasGL.__VBOPool.prototype.get = function(objVertexSize, objColorSize, objTexCoordSize){

};

CanvasGL.__VBOPool.prototype.release = function(objIndex, objVertexSize, objColorSize, objTexCoordSize){

}
  */


