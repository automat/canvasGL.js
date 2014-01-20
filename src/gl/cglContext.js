var _Math               = require('../math/cglMath'),
    Util                = require('../util/cglUtil'),
    DataType            = require('../util/cglDataType'),
    Float32ArrayMutable = require('../util/data/cglFloat32ArrayMutable'),
    Uint16ArrayMutable  = require('../util/data/cglUint16ArrayMutable'),
    Uint32ArrayMutable  = require('../util/data/cglUint32ArrayMutable'),
    Value1Stack         = require('../util/data/cglValue1Stack'),
    Value2Stack         = require('../util/data/cglValue2Stack'),
    Value4Stack         = require('../util/data/cglValue4Stack'),
    ValueArrStack       = require('../util/data/cglValueArrStack'),
    Mat33               = require('../math/cglMatrix');

var Program     = require('./cglProgram'),
    Shader      = require('./cglShader'),
    ShaderDict  = require('./cglShaderDict'),
    Framebuffer = require('./cglFramebuffer'),
    Texture     = require('./cglTexture');

var Warning   = require('../common/cglWarning'),
    Extension = require('../common/cglExtension'),
    Common    = require('../common/cglCommon'),
    Default   = require('../common/cglDefault');

var ModelUtil    = require('../geom/cglModelUtil'),
    VertexUtil   = require('../geom/cglVertexUtil'),
    GeomUtil     = require('../geom/cglGeomUtil'),
    BezierUtil   = require('../geom/cglBezierUtil');

var Color  = require('../style/cglColor'),
    _Image = require('../image/cglImage');

/*------------------------------------------------------------------------------------------------------------*/

function Context(element,canvas3d,canvas2d){
    this._canvas3d = canvas3d;
    this._canvas2d = canvas2d;

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
        throw new Error(Warning.WEBGL_NOT_AVAILABLE);
    } //hmm



    canvas3d.tabIndex = '1';

    if(!Extension.Initialized){
        Extension.UintTypeAvailable     = gl.getExtension('OES_element_index_uint') ? true : false;
        Extension.FloatTextureAvailable = gl.getExtension('OES_texture_float') ? true : false;

        if(Extension.UintTypeAvailable){
            DataType.UintArray     = Uint32Array;
            DataType.UintArrayMut  = Uint32ArrayMutable;
            DataType.ElementIndex = gl.UNSIGNED_INT;
        } else {
            DataType.UintArray     = Uint16Array;
            DataType.UintArrayMut  = Uint16ArrayMutable;
            DataType.ElementIndex = gl.UNSIGNED_SHORT;
        }

        Extension.Initialized = true;
    }

    this._canvas2d  = document.createElement('canvas');
    this._context2d = this._canvas2d.getContext('2d');

    var glArrayBuffer        = gl.ARRAY_BUFFER,
        glElementArrayBuffer = gl.ELEMENT_ARRAY_BUFFER;

    // Setup 2d / post shader
    var attributesToBind = {};
    attributesToBind[ShaderDict.aVertPosition] = 0;
    attributesToBind[ShaderDict.aVertColor]    = 1;
    attributesToBind[ShaderDict.aTexCoord]     = 2;

    this._program      = new Program(this, Shader.vert,     Shader.frag, attributesToBind);
    this._programPost  = new Program(this, Shader.vertPost, Shader.fragPost);
    this._stackProgram = new Value1Stack();


    this._width_internal  = null;
    this._height_internal = null;
    this._width  = null;
    this._height = null;
    this._ssaaf  = Common.SSAA_FACTOR;

    this._clearBackground = Default.CLEAR_BACKGROUND;
    this._bColorTemp     = new Array(4);
    this._bColorBg       = new Float32Array(4);
    this._stackColorBg   = new Value4Stack();

    this._fboCanvas    = new Framebuffer(this);
    this._fboPingpong  = new Framebuffer(this);
    this._fboPixelread = gl.createFramebuffer();
    this._fboStack     = new Value1Stack();

    this._setSize(parseInt(element.offsetWidth),parseInt(element.offsetHeight));

    // VBO / IBO

    this._vboShared = gl.createBuffer();
    this._iboShared = gl.createBuffer();

    gl.bindBuffer(glArrayBuffer,        this._vboShared);
    gl.bindBuffer(glElementArrayBuffer, this._iboShared);

    var program = this._program;
    gl.uniform1f(program[ShaderDict.uFlipY],1.0);

    // Create default blank _enableTextureObj and _enableTextureObj coords / use color & set alpha to 1.0
    this._currTint = Default.TINT;

    var glTexture2d = gl.TEXTURE_2D,
        glRGBA      = gl.RGBA;

    this._blankTextureGL = gl.createTexture();
    gl.bindTexture(glTexture2d, this._blankTextureGL);
    gl.texImage2D( glTexture2d, 0, glRGBA, 1, 1, 0, glRGBA, gl.UNSIGNED_BYTE, new Uint8Array([1,1,1,1]));
    gl.bindTexture(glTexture2d,null);

    // Create matrix stack and apply
    this._matrix      = Mat33.make();
    this._matrixTemp  = Mat33.make();
    this._matrixStack = [];
    this.setMatrixUniform();

    // Set draw modes
    this._modeEllipse      = Context.CENTER;
    this._modeCircle       = Context.CENTER;
    this._modeRect         = Context.CORNER;
    this._modePolylineCap = Context.CAP_ROUND;

    this._stackTexture          = new Value1Stack();
    this._stackTexture_internal = new Value1Stack();
    this._texture      = false;
    this._textureCurr  = null;

    this._textureOffset      = false;
    this._textureOffsetX     = this._textureOffsetY = 0;
    this._textureOffsetWidth = this._textureOffsetHeight = 0;


    /*------------------------------------------------------------------------------------------------------------*/
    //  Set vertices/color/texCoord temp buffers
    /*------------------------------------------------------------------------------------------------------------*/

    var ELLIPSE_DETAIL_MAX = Common.ELLIPSE_DETAIL_MAX,
        SPLINE_DETAIL_MAX  = Common.SPLINE_DETAIL_MAX,
        BEZIER_DETAIL_MAX  = Common.BEZIER_DETAIL_MAX;
    var ELLIPSE_DETAIL     = Default.ELLIPSE_DETAIL;

    var SETA_ALLOCATE_MIN = Default.SET_ALLOCATE_MIN;

    this._bVertexPoint     = new Float32Array(2);
    this._bVertexTriangle  = new Float32Array(6);
    this._bVertexQuad      = new Float32Array(8);

    this._bVertexQuad_internal   = new Float32Array(8);
    this._bColorQuad_internal    = new Float32Array(16);
    this._bTexcoordQuad_internal = new Float32Array(8);

    this._bIndexQuad     = new Uint16Array([0,1,2,1,2,3]);


    var bVertexEllipseLen = ELLIPSE_DETAIL_MAX * 2,
        bColorEllipseLen  = ELLIPSE_DETAIL_MAX * 4,
        bIndexEllipseLen  = (ELLIPSE_DETAIL_MAX - 2) * 3;

    /*------------------------------------------------------------------------------------------------------------*/

    // rect set
    this._bVertexRectSet      = new Float32Array(6 * 2);
    this._bColorRectSet       = new Float32Array(4);
    this._bTexcoordRectSet    = new Float32Array([0,0,0,1,1,1,1,1,1,0,0,0]);
    this._bMutVertexRectSet   = new Float32ArrayMutable(4 * 2 * SETA_ALLOCATE_MIN,true);
    this._bMutColorRectSet    = new Float32ArrayMutable(4 * 4 * SETA_ALLOCATE_MIN,true);
    this._bMutTexcoordRectSet = new Float32ArrayMutable(4 * 2 * SETA_ALLOCATE_MIN,true);

    //this._propertyStack

    /*------------------------------------------------------------------------------------------------------------*/

    // circle set
    this._bVertexCircleSet   = new Float32Array(bVertexEllipseLen);
    this._bColorCircleSet    = new Float32Array(4 * ELLIPSE_DETAIL_MAX);
    this._bIndexCircleSet    = new DataType.UintArray(bIndexEllipseLen);
    this._bTexcoordCircleSet = new Float32Array(bVertexEllipseLen);

    this._bMutVertexCircleSet   = new Float32ArrayMutable(bVertexEllipseLen * SETA_ALLOCATE_MIN,true);
    this._bMutColorCircleSet    = new Float32ArrayMutable(bColorEllipseLen  * SETA_ALLOCATE_MIN,true);
    this._bMutTexcoordCircleSet = new Float32ArrayMutable(bVertexEllipseLen * SETA_ALLOCATE_MIN,true);
    this._bMutIndexCircleSet    = new DataType.UintArrayMut( bIndexEllipseLen  * SETA_ALLOCATE_MIN,true);


    /*------------------------------------------------------------------------------------------------------------*/

    // ellipse
    this._bVertexEllipse     = new Float32Array(bVertexEllipseLen); // ellipse vertices from unit
    this._bVertexEllipseS    = new Float32Array(bVertexEllipseLen); // ellipse vertices from unit scaled xy
    this._bVertexEllipseT    = new Float32Array(bVertexEllipseLen); // ellipse vertices from scaled translated
    this._bColorEllipse      = new Float32Array(4 * ELLIPSE_DETAIL_MAX);
    this._stackDetailEllipse = new Value1Stack();
    this._stackRadiusEllipse = new Value2Stack();
    this._stackOriginEllipse = new Value2Stack();

    /*------------------------------------------------------------------------------------------------------------*/

    // circle
    this._bVertexCircle     = new Float32Array(bVertexEllipseLen);  // circle vertices from detail
    this._bVertexCircleS    = new Float32Array(bVertexEllipseLen);  // cirlce vertices from unit scaled
    this._bVertexCircleT    = new Float32Array(bVertexEllipseLen);  // circle vertices from scaled translated
    this._bColorCircle      = new Float32Array(4 * ELLIPSE_DETAIL_MAX);
    this._bIndexCircle      = null;
    this._stackDetailCircle = new Value1Stack();
    this._stackRadiusCircle = new Value1Stack();
    this._stackOriginCircle = new Value2Stack();

    /*------------------------------------------------------------------------------------------------------------*/

    // round rect
    var bVertexRRectLen = ELLIPSE_DETAIL_MAX * 2 + 8;
    this._bVertexRRect     = new Float32Array(bVertexRRectLen); // round rect from corner detail scaled
    this._bVertexRRectT    = new Float32Array(bVertexRRectLen); // round rect from scaled translated
    this._bIndexRRect      = new Uint16Array((((this._bVertexRRect.length) / 2)-2) * 3);
    this._bCornerRRect     = new Float32Array(8);
    this._stackDetailRRect = new Value1Stack();
    this._stackSizeRRect   = new Value2Stack();
    this._stackRadiusRRect = new Value1Stack();
    this._stackOriginRRect = new Value2Stack();

    /*------------------------------------------------------------------------------------------------------------*/

    // arc
    var bVertexArcLen = ELLIPSE_DETAIL_MAX * 2 * 2;
    this._bVertexArc          = new Float32Array(bVertexArcLen);
    this._bVertexArcT         = new Float32Array(bVertexArcLen);
    this._stackDetailArc      = new Value1Stack();
    this._stackRadiusInnerArc = new Value2Stack();
    this._stackRadiusOuterArc = new Value2Stack();
    this._stackAngleArc       = new Value2Stack();
    this._stackOriginArc      = new Value2Stack();
    this._bVertexArcStroke    = new Float32Array(ELLIPSE_DETAIL_MAX * 2);

    /*------------------------------------------------------------------------------------------------------------*/

    // bezier
    this._bVertexBezier     = new Float32Array(BEZIER_DETAIL_MAX  * 2);
    this._bPointBezier      = new Array(2 * 4); // cache
    this._stackDetailBezier = new Value1Stack();

    /*------------------------------------------------------------------------------------------------------------*/

    // curve
    this._stackDetailSpline = new Value1Stack();

    /*------------------------------------------------------------------------------------------------------------*/

    // polyline
    var lineCapDetail = Common.LINE_ROUND_CAP_DETAIL_MAX; //this is constant for now
    var lineCap0Len   = 2 * lineCapDetail;
    this._bVertexLineCap0       = GeomUtil.genVerticesCircle(lineCapDetail, new Float32Array(lineCap0Len));
    this._bVertexLineCap0S      = new Float32Array(lineCap0Len);
    this._bVertexLineCap0T      = new Float32Array(lineCap0Len);
    this._bVertexLineEdge       = new Float32Array(8);
    this._stackPointsLine       = new ValueArrStack();
    this._stackPointsLineLength = new Value1Stack();
    this._bIndexLine            = [];
    this._bColorLine            = [];
    this._bPointLine4           = new Array(4);

    this._bLineCap0Res    = 0;
    this._bIndexLineCap0  = ModelUtil.genFaceIndicesFan(lineCapDetail * 2,[]);

    this._stackWidthLine  = new Value1Stack();
    this._bMutVertexLine  = new Float32ArrayMutable(2 * 100,true);
    this._bMutColorLine   = new Float32ArrayMutable(4 * 100,true);
    this._bMutIndexLine   = new Uint16ArrayMutable((100 - 2) * 3,true);


    this._bTexcoordQuadDefault     = new Float32Array([0.0,0.0,1.0,0.0,0.0,1.0,1.0,1.0]);
    this._bTexcoordQuad            = new Float32Array(this._bTexcoordQuadDefault);
    this._bTexcoordTriangleDefault = new Float32Array([0.0,0.0,1.0,0.0,1.0,1.0]);
    this._bTexcoordTriangle        = new Float32Array(this._bTexcoordTriangleDefault.length);
    this._bTexcoordEllipse         = new Float32Array(this._bVertexEllipse.length);
    this._bTexcoordArc             = new Float32Array(this._bVertexArc.length);

    this._bColorVertex   = new Float32Array(4);
    this._bColorQuad     = new Float32Array(4 * 4);
    this._bColorTriangle = new Float32Array(4 * 3);
    this._bColorLine     = new Float32Array(4 * 2);
    this._bColorPoint    = new Float32Array(4);
    this._bColorArc      = new Float32Array(4 * ELLIPSE_DETAIL_MAX*2);
    this._bColorRRect    = new Float32Array(this._bVertexRRect.length * 2);


    this._bVertexFbo   = new Float32Array(8);
    this._bColorFbo    = new Float32Array(4 * 4);
    this._bTexcoordFbo = new Float32Array([0,0,1,0,0,1,1,1]);

    this._bVertexImg   = new Float32Array(8);
    this._bColorImg    = new Float32Array(4 * 4);
    this._bTexcoordImg = new Float32Array([0,1,1,1,0,0,1,0]);

    this._bIndexTriangle = [0,1,2];


    /*------------------------------------------------------------------------------------------------------------*/
    //  Setup fill props, buffers and cached values
    /*------------------------------------------------------------------------------------------------------------*/

    this._fill        = true;
    this._bColorFill4 = [1.0,1.0,1.0,1.0];
    this._bColorFill  = this._bColorFill4;

    this._stroke             = true;
    this._bColorStroke4      = [1.0,1.0,1.0,1.0];
    this._bColorStroke       = this._bColorStroke4;
    this._stackColorStroke   = new ValueArrStack();
    this._bColorStroke4Temp  = new Array(4);
    this._bColorStrokeIntrpl = [];

    this._tempCurveVertices = [];

    this._modeTexture = Context.CLAMP;

    // batch

    this._batchActive        = false;
    this._batchOffsetVertices = 0;

    this._batchBVertex   = [];
    this._batchBColor    = [];
    this._batchBIndex    = [];
    this._batchBTexcoord = [];

    this._batchLimit = 0;

    this._batchTextureActive = false;


    this._stackEllipseSize = 0;
    this._stackRectSize    = 0;
    this._stackRRectSize   = 0;
    this._stackArcSize     = 0;
    this._stackCircleSize  = 0;
    this._stackQuadSize    = 0;
    this._stackPointSize   = 0;
    this._stackLineSize    = 0;
    this._stackCurveSize   = 0;
    this._stackBezierSize  = 0;

    this._stackDrawFunc = new Value1Stack();

    /*------------------------------------------------------------------------------------------------------------*/

    this._setDrawPropertiesInitial();
}


Context.prototype._setSize = function(width, height){
    var canvas3d = this._canvas3d;
    var gl = this._context3d;

    var ssaaf = this._ssaaf;

    this._width  = width;
    this._height = height;
    canvas3d.style.width  = width  + 'px';
    canvas3d.style.height = height + 'px';

    var iwidth  = canvas3d.width  = this._width_internal  = width  * ssaaf,
        iheight = canvas3d.height = this._height_internal = height * ssaaf;

    this._fboCanvas.setSize(iwidth,iheight);
    this._fboPingpong.setSize(iwidth,iheight);

    var program = this._program;

    this.useProgram(program);
    gl.uniform2f(program[ShaderDict.uViewport],iwidth,iheight);
    gl.viewport(0,0,iwidth,iheight);

    var colorBG = this._bColorBg;

    gl.clearColor(colorBG[0], colorBG[1], colorBG[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
};

/*------------------------------------------------------------------------------------------------------------*/
// Props
/*------------------------------------------------------------------------------------------------------------*/

Context.prototype._setDrawPropertiesInitial = function(){
    var gl = this._context3d;
    gl.enable(gl.BLEND);
    gl.uniform1f(this._program[ShaderDict.uFlipY],-1.0);
    this._resetDrawProperties();
};

Context.prototype._resetDrawProperties = function(){
    this.noStroke();
    this._disableTextureObj();
    this.noFill();
    this.noTint();

    this.setModeRect(Context.CORNER);
    this.setModeEllipse(Context.CENTER);
    this.setModeCircle(Context.CENTER);

    var EMPTY1   = Value1Stack.EMPTY,
        EMPTY2   = Value2Stack.EMPTY,
        EMPTYARR = ValueArrStack.EMPTY;

    //color stroke
    this._stackColorStroke.push(EMPTYARR);

    //progtram
    //this._stackProgram.pushEmpty();
    this._stackDrawFunc.push(Value1Stack.EMPTY);

    // ellipse
    this._stackDetailEllipse.push(EMPTY1);
    this._stackRadiusEllipse.push(EMPTY2);
    this._stackOriginEllipse.push(EMPTY2);
    this.setDetailEllipse(Default.ELLIPSE_DETAIL);

    // circle
    this._stackDetailCircle.push(EMPTY1);
    this._stackRadiusCircle.push(EMPTY1);
    this._stackOriginCircle.push(EMPTY2);
    this.setDetailCircle(Default.ELLIPSE_DETAIL);

    // round rect
    this._stackDetailRRect.push(EMPTY1);
    this._stackOriginRRect.push(EMPTY2);
    this._stackRadiusRRect.push(EMPTY1);
    this._stackSizeRRect.push(EMPTY2);
    this.setDetailCorner(Default.CORNER_DETAIL);


    // arc
    this._stackDetailArc.push(EMPTY1);
    this._stackOriginArc.push(EMPTY2);
    this._stackRadiusInnerArc.push(EMPTY2);
    this._stackRadiusOuterArc.push(EMPTY2);
    this._stackAngleArc.push(EMPTY2);
    this.setDetailArc(Default.ELLIPSE_DETAIL);

    // bezier
    this._stackDetailBezier.push(EMPTY1);
    this.setDetailBezier(Default.BEZIER_DETAIL);

    // curve
    this._stackDetailSpline.push(EMPTY1);
    this.setDetailCurve(Default.SPLINE_DETAIL);

    // polyline
    this._stackWidthLine.push(EMPTY1);
    this._stackPointsLine.push(EMPTYARR);
    this._stackPointsLineLength.push(EMPTY1);

    this.setLineWidth(Default.LINE_WIDTH);

    this._resetDrawFuncStacks();


    this.resetBlend();

    this.resetUVOffset();
    this.resetUVQuad();
    this.resetUVTriangle();
};

Context.prototype._resetDrawFuncStacks = function(){
    this._stackEllipseSize   = 0;
    this._stackRectSize      = 0;
    this._stackRRectSize = 0;
    this._stackArcSize       = 0;
    this._stackCircleSize    = 0;
    this._stackQuadSize      = 0;
    this._stackPointSize     = 0;
    this._stackLineSize      = 0;
    this._stackCurveSize     = 0;
    this._stackBezierSize    = 0;
};


Context.prototype._beginDraw = function(){
    this._resetDrawProperties();

    this.loadIdentity();
    this._context3d.uniform1f(this._program[ShaderDict.uFlipY],-1.0);

    this._fboCanvas.bind();
    this.clearColorBuffer();
    this.scale(this._ssaaf,this._ssaaf);
};


Context.prototype._endDraw = function(){
    var fboCanvas = this._fboCanvas;
    fboCanvas.unbind();

    this._context3d.uniform1f(this._program[ShaderDict.uFlipY],1.0);
    this.loadIdentity();
    fboCanvas.draw();
};



Context.prototype.setModeEllipse = function(mode){
    this._modeEllipse = mode;
};

Context.prototype.getModeEllipse = function(){
    return this._modeEllipse;
};

Context.prototype.setModeCircle = function(mode){
    this._modeCircle = mode;
};

Context.prototype.getModeCircle = function(){
    return this._modeCircle;
};

Context.prototype.setModeRect = function(mode){
    this._modeRect = mode;
};

Context.prototype.getModeRect = function(){
    return this._modeRect;
};

Context.prototype.setModeLineCap = function(mode){
    this._modePolylineCap = mode;
};

Context.prototype.getModeLineCap = function(){
    return this._modePolylineCap;
}

Context.prototype.setTextureWrap = function(mode){
    this._modeTexture = mode;
};

Context.prototype.getTextureWrap = function(){
    return this._modeTexture;
};


Context.prototype.setDetailEllipse = function(a){
    var stack = this._stackDetailEllipse;
    if(stack.peek() == a)return;
    var max = Common.ELLIPSE_DETAIL_MAX;
    stack.push(a > max ? max : a);
};

Context.prototype.getDetailEllipse = function(){
    return this._stackDetailEllipse.peek();
};

Context.prototype.setDetailCircle = function(a){
    var stack = this._stackDetailCircle;
    if(stack.peek() == a)return;
    var max = Common.ELLIPSE_DETAIL_MAX;
    stack.push(a > max ? max : a);
};

Context.prototype.getDetailCircle = function(){
    return this._stackDetailCircle.peek();
};

Context.prototype.setDetailCorner = function(a){
    var stack = this._stackDetailRRect;
    if(stack.peek() == a)return;
    var max = Common.CORNER_DETAIL_MAX;
    stack.push(a > max ? max : a);
};

Context.prototype.getDetailCorner = function(){
    return this._stackDetailRRect.peek();
};

Context.prototype.setDetailArc = function(a){
    var stack = this._stackDetailArc;
    if(stack.peek() == a)return;
    var max = Common.ELLIPSE_DETAIL_MAX;
    stack.push(a > max ? max : a);
};

Context.prototype.getDetailArc = function(){
    return this._stackDetailArc.peek();
};

Context.prototype.setDetailBezier = function(a){
    var stack = this._stackDetailBezier;
    if(stack.peek() == a)return;
    var max = Common.BEZIER_DETAIL_MAX;
    stack.push(a > max ? max : a);
};

Context.prototype.getDetailBezier = function(){
    return this._stackDetailBezier.peek();
};

Context.prototype.setDetailCurve = function(a){
    var stack = this._stackDetailSpline;
    if(stack.peek() == a)return;
    var max = Common.SPLINE_DETAIL_MAX;
    stack.push(a > max ? max : a);
};

Context.prototype.getDetailCurve  = function(){
    return this._stackDetailSpline.peek();
};

Context.prototype.setLineWidth = function(a){
    var stack = this._stackWidthLine;
    if(stack.peek() == a)return;
    stack.push(a < 0 ? 0 : a);
};

Context.prototype.getLineWidth = function(){
    return this._stackWidthLine.peek();
};

Context.prototype.enableBlend  = function(){
    this._context3d.enable(this._context3d.BLEND);
};

Context.prototype.disableBlend = function(){
    this._context3d.disable(this._context3d.BLEND);
};


/*---------------------------------------------------------------------------------------------------------*/
// Shape fill/stroke
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype.fill = function(){
    var f = this._bColorFill = this._bColorFill4;
    f[3] = 1.0;

    switch (arguments.length){
        case 0: f[0] = f[1] = f[2]  = 0.0; break;
        case 1: f[0] = f[1] = f[2]  = arguments[0]; break;
        case 2: f[0] = f[1] = f[2]  = arguments[0];f[3] = arguments[1];break;
        case 3: f[0] = arguments[0]; f[1] = arguments[1]; f[2] = arguments[2]; break;
        case 4: f[0] = arguments[0]; f[1] = arguments[1]; f[2] = arguments[2]; f[3] = arguments[3]; break;
    }

    this._fill = true;
};


Context.prototype.fill1f = function(k){
    var bColor = this._bColorFill = this._bColorFill4;
    bColor[0] = bColor[1] = bColor[2] = k;bColor[3] = 1.0;
    this._fill = true;
};

Context.prototype.fill2f = function(k,a){
    var bColor = this._bColorFill = this._bColorFill4;
    bColor[0] = bColor[1] = bColor[2] = k;bColor[3] = a;
    this._fill = true;
};

Context.prototype.fill3f = function(r,g,b){
    var bColor = this._bColorFill = this._bColorFill4;
    bColor[0] = r;bColor[1] = g; bColor[2] = b;bColor[3] = 1.0;
    this._fill = true;
};

Context.prototype.fill4f = function(r,g,b,a){
    var bColor = this._bColorFill = this._bColorFill4;
    bColor[0] = r;bColor[1] = g; bColor[2] = b;bColor[3] = a;
    this._fill = true;
};

Context.prototype.fillfv = function(a){
    this._bColorFill = a;
    this._fill = true;
};

Context.prototype.noFill = function(){
    this._fill = false;
};

Context.prototype.stroke = function(){
    switch(arguments.length){
        case 0:
            break;
        case 1:
            var arg0 = arguments[0];
            this._stroke4f(arg0,arg0,arg0,1.0);
            break;
        case 2:
            var arg0 = arguments[0];
            this._stroke4f(arg0,arg0,arg0,arguments[1]);
            break;
        case 3:
            this._stroke4f(arguments[0],arguments[1],arguments[2],1.0);
            break;
        case 4:
            this._stroke4f(arguments[0],arguments[1],arguments[2],arguments[3]);
            break;
    }
};

Context.prototype.stroke1f = function(k){
    this._stroke4f(k,k,k,1.0);
};

Context.prototype.stroke2f = function(k,a){
    this._stroke4f(k,k,k,a);
};

Context.prototype.stroke3f = function(r,g,b){
    this._stroke4f(r,g,b,1.0);
};

Context.prototype.stroke4f = function(r,g,b,a){
    this._stroke4f(r,g,b,a);
};

Context.prototype.strokefv = function(a){
    this._strokefv(a);
};

Context.prototype._stroke4f = function(r,g,b,a){
    var bColor = this._bColorStroke4Temp;
        bColor[0] = r;
        bColor[1] = g;
        bColor[2] = b;
        bColor[3] = a;
    this._stackColorStroke.push(Util.copyArray(bColor));
    this._stroke = true;
};

Context.prototype._strokefv = function(arr){
    this._stackColorStroke.push(Util.copyArray(arr));
    this._stroke = true;
};




Context.prototype.noStroke = function(){
    this._stroke = false;
};

Context.prototype.getStroke = function(){
    return this._stroke ? this._bColorStroke : null;
};

Context.prototype.getFill = function(){
    return this._fill ? this._bColorFill : null;
};

/*---------------------------------------------------------------------------------------------------------*/
// _enableTextureObj
/*---------------------------------------------------------------------------------------------------------*/



Context.prototype.setUVOffset = function(offsetU,offsetV,textureWidth,textureHeight){
    this._textureOffsetX      = offsetU;
    this._textureOffsetY      = offsetV;
    this._textureOffsetWidth  = textureWidth-1;
    this._textureOffsetHeight = textureHeight-1;

    this._textureOffset = true;
};

Context.prototype.resetUVOffset = function(){
    this._textureOffsetX = 0;
    this._textureOffsetY = 0;
    this._textureOffsetWidth = 1;
    this._textureOffsetHeight = 1;

    this._textureOffset = false;
};

Context.prototype.setUVQuad = function(u0,v0,u1,v1,u2,v2,u3,v3){
    var bTexcoord = this._bTexcoordQuad;
        bTexcoord[0] = u0;
        bTexcoord[1] = v0;
        bTexcoord[2] = u1;
        bTexcoord[3] = v1;
        bTexcoord[4] = u2;
        bTexcoord[5] = v2;
        bTexcoord[6] = u3;
        bTexcoord[7] = v3;
};

Context.prototype.resetUVQuad = function(){
    Util.setArr(this._bTexcoordQuad,this._bTexcoordQuadDefault);
};

Context.prototype.setUVTriangle = function(u0,v0,u1,v1,u2,v2){
    var bTexCoord = this._bTexcoordTriangle;
        bTexCoord[0] = u0;
        bTexCoord[1] = v0;
        bTexCoord[2] = u1;
        bTexCoord[3] = v1;
        bTexCoord[4] = u2;
        bTexCoord[5] = v2;
};

Context.prototype.resetUVTriangle = function(){
    Util.setArr(this._bTexcoordTriangle,this._bTexcoordTriangleDefault);
};

Context.prototype._bindTexture = function(tex){
    var gl = this._context3d;
    gl.bindTexture(gl.TEXTURE_2D,tex.getGLTexture());
};

Context.prototype._unbindTexture = function(){
    var program = this._stackProgram.peek();
    var gl = this._context3d;
    gl.bindTexture(gl.TEXTURE_2D, this._blankTextureGL);
    gl.vertexAttribPointer(2,2,gl.FLOAT,false,0,0);
    gl.uniform1f(program[ShaderDict.uUseTexture],0.0);
};

Context.prototype._enableTextureObj = function(textureObj){
    var gl = this._context3d;
    var program = this._program;
    var stackTexture = this._stackTexture;
    stackTexture.push(textureObj);
    this._bindTexture(stackTexture.peek());
    gl.uniform1f(program[ShaderDict.uUseTexture],1.0);
    gl.uniform1i(program[ShaderDict.uImage],0);
    this._texture = true;
};

Context.prototype._disableTextureObj = function(){
    this._stackTexture.push(Value1Stack.EMPTY);
    this._unbindTexture();
    this._texture = false;
};

Context.prototype.getCurrTexture = function(){
    return this._stackTexture.peek();
};

Context.prototype.getNullTexture = function(){
    return this._blankTextureGL;
};

Context.prototype.blend = function(src,dest){
    this._context3d.blendFunc(src,dest);
};

Context.prototype.resetBlend = function(){
    var gl = this._context3d;
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
};

Context.prototype.tint = function(a){
    this._currTint = Math.max(Common.TINT_MIN,Math.min(a,Common.TINT_MAX));
};

Context.prototype.noTint = function(){
    this._currTint = Common.TINT_MAX;
};


/*---------------------------------------------------------------------------------------------------------*/
// fbo
/*---------------------------------------------------------------------------------------------------------*/


Context.prototype._drawFbo = function(fbo,x,y,width,height){
    var gl      = this._context3d;
    var program = this._stackProgram.peek();

    x      = x || 0;
    y      = y || 0;
    width  = typeof width === 'undefined' ? fbo.getWidth() : width;
    height = typeof height=== 'undefined' ? fbo.getHeight(): height;

    var xw = x + width,
        yh = y + height;

    var bVertex   = this._bVertexFbo,
        bColor    = this._bColorFbo,
        bTexcoord = this._bTexcoordFbo;

    bVertex[0] = x;
    bVertex[1] = y;

    bVertex[2] = xw;
    bVertex[3] = y;

    bVertex[4] = x;
    bVertex[5] = yh;

    bVertex[6] = xw;
    bVertex[7] = yh;

    this.setMatrixUniform();

    fbo.getTexture().bind();
    this.bufferArrays(bVertex,bColor,bTexcoord);

    gl.uniform1f(program[ShaderDict.uUseTexture],1.0);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

    gl.uniform1f(program[ShaderDict.uUseTexture],0.0);
    fbo.getTexture().unbind();
};

Context.prototype._bindFramebuffer = function(fbo){
    var gl = this._context3d;
    gl.bindFramebuffer(gl.FRAMEBUFFER,fbo.getGLFramebuffer());
    this._fboStack.push(fbo);
};

Context.prototype._unbindFramebuffer = function(){
    var gl = this._context3d;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    this._fboStack.push(Value1Stack.EMPTY);
};

Context.prototype._readPixelsFromTex = function(tex,out){
    var gl = this._context3d;
    gl.bindFramebuffer(gl.FRAMEBUFFER,this._fboPixelread);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex.getGLTexture(), 0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE){
        var format = tex.getFormat();
        gl.readPixels(0,0,tex.getWidth(),tex.getHeight(),format.dataFormat,format.dataType,out);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER,this._fboStack.peek());
};

Context.prototype._writePixelsToTex = function(tex,x,y,width,height,format,type,pixels){
    var gl = this._context3d;
    var stack = this._stackTexture;
    gl.bindTexture(gl.TEXTURE_2D,tex.getGLTexture());
    gl.texSubImage2D(gl.TEXTURE_2D,0,x,y,width,height,format,type,pixels);
    gl.bindTexture(gl.TEXTURE_2D,stack.peek() ? stack.peek().getGLTexture() : this._blankTextureGL);
};

Context.prototype.bindDefaultFramebuffer = function(){
    this._bindFramebuffer(this._fboCanvas);
};

Context.prototype.getCurrFramebuffer = function(){
    return this._fboStack.peek();
};


/*---------------------------------------------------------------------------------------------------------*/
// clear / background
/*---------------------------------------------------------------------------------------------------------*/


Context.prototype.backgroundfv = function(){
    var bColor  = this._bColorTemp;
    bColor[3] = 1.0;

    switch (arguments.length){
        case 0: bColor[0]=bColor[1]=bColor[2]=0.0;break;
        case 1: bColor[0]=bColor[1]=bColor[2]=arguments[0];break;
        case 2: bColor[0]=bColor[1]=bColor[2]=arguments[0];bColor[3]=arguments[1];break;
        case 3: bColor[0]=arguments[0];bColor[1]=arguments[1];bColor[2]=arguments[2];break;
        case 4: bColor[0]=arguments[0];bColor[1]=arguments[1];bColor[2]=arguments[2];bColor[3]=arguments[3];break;
    }

    this._clearBackground = (bColor[3] == 1.0);
    this._stackColorBg.push(this._bColorTemp);
};


Context.prototype.clearColorBuffer = function(){
    var gl = this._context3d;

    var stackColor = this._stackColorBg;
    var color = stackColor.peek();
    var bColor = this._bColorBg;
    bColor[0] = color[0];
    bColor[1] = color[1];
    bColor[2] = color[2];
    bColor[3] = color[3];

    var i_255 = 1.0 / 255.0;

    if(this._clearBackground){
        gl.clearColor(bColor[0],bColor[1],bColor[2],1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
    else{
        if(!stackColor.isEqual()){
            var c0 = bColor[0] * i_255,
                c1 = bColor[1] * i_255,
                c2 = bColor[2] * i_255;

            gl.clearColor(c0,c1,c2,1.0);
            gl.clear(gl.COLOR_BUFFER_BIT );

            stackColor.push(stackColor.peek());
        }

        this.fill(bColor[0],bColor[1],bColor[2],bColor[3]);
        this.rect(0,0,this._width_internal,this._height_internal);
        this.noFill();
    }
};


/*---------------------------------------------------------------------------------------------------------*/
// Drawing primitives
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype.quad = function(x0,y0,x1,y1,x2,y2,x3,y3)
{
    if(!this._fill && !this._stroke && !this._texture)return;

    this._quad_internal(x0,y0,x1,y1,x2,y2,x3,y3);

    this._stackDrawFunc.push(this.quad);
};

Context.prototype._quad_internal = function(x0,y0,x1,y1,x2,y2,x3,y3){
    var gl = this._context3d;
    var bVertex = this._bVertexQuad_internal,
        bColor;

    bVertex[ 0] = x0;
    bVertex[ 1] = y0;
    bVertex[ 2] = x1;
    bVertex[ 3] = y1;
    bVertex[ 4] = x3;
    bVertex[ 5] = y3;
    bVertex[ 6] = x2;
    bVertex[ 7] = y2;

    if(this._fill && !this._texture){
        bColor = this.bufferColors(this._bColorFill,this._bColorQuad_internal);

        if(this._batchActive){}
        else{
            this.bufferArrays(bVertex,bColor,null);
            this.setMatrixUniform();
            gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        }
    }

    if(this._texture){
        bColor = this.bufferColors(this._bColorFill,this._bColorQuad_internal);

        var bTexcoord        = this._bTexcoordQuad,
            bTexcoordDefault = this._bTexcoordQuadDefault;

        if(this._textureOffset){
            var offsetX      = this._textureOffsetX,
                offsetY      = this._textureOffsetY,
                offsetWidth  = this._textureOffsetWidth,
                offsetHeight = this._textureOffsetHeight;

            bTexcoord[0] = bTexcoordDefault[0] + offsetX;
            bTexcoord[1] = bTexcoordDefault[1] + offsetY;

            bTexcoord[2] = bTexcoordDefault[2] + offsetX + offsetWidth;
            bTexcoord[3] = bTexcoordDefault[3] + offsetY;

            bTexcoord[4] = bTexcoordDefault[4] + offsetX;
            bTexcoord[5] = bTexcoordDefault[5] + offsetY + offsetHeight;

            bTexcoord[6] = bTexcoordDefault[6] + offsetX + offsetWidth;
            bTexcoord[7] = bTexcoordDefault[7] + offsetY + offsetHeight;
        }

        if(this._batchActive){}
        else{
            this.bufferArrays(bTexcoord,bColor,bTexcoord);
            this.setMatrixUniform();
            gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        }
    }

    if(this._stroke){
        bVertex[ 0] = x0;
        bVertex[ 1] = y0;
        bVertex[ 2] = x1;
        bVertex[ 3] = y1;
        bVertex[ 4] = x2;
        bVertex[ 5] = y2;
        bVertex[ 6] = x3;
        bVertex[ 7] = y3;

        this._polyline(bVertex,bVertex.length,true);
    }
};


Context.prototype.rect = function(x,y,width,height){
    this._rect_internal(x,y,width,height);
    this._stackDrawFunc.push(this.rect);
};

Context.prototype._rect_internal = function(x,y,width,height){
    var cm = this._modeRect == Context.CENTER,
        rectX,rectY,rectWidth,rectHeight;

    if(cm){
        var width_2  = width  * 0.5,
            height_2 = height * 0.5;

        rectX      = x - width_2;
        rectY      = y - height_2;
        rectWidth  = x + width_2;
        rectHeight = y + height_2;
    }
    else{
        rectX      = x;
        rectY      = y;
        rectWidth  = x + width;
        rectHeight = y + height;

    }

    this._quad_internal(rectX,rectY,rectWidth,rectY,rectWidth,rectHeight,rectX,rectHeight);
};


Context.prototype.roundRect = function(x,y,width,height,radius){
    if(!this._fill && !this._stroke && !this._texture)return;

    var modeOrigin  = this._modeRect;
    var stackOrigin = this._stackOriginRRect,
        stackRadius = this._stackRadiusRRect,
        stackDetail = this._stackDetailRRect,
        stackSize   = this._stackSizeRRect;

    var detail = stackDetail.peek();

    var originX = modeOrigin == 0 ? x - width  * 0.5 : x,
        originY = modeOrigin == 0 ? y - height * 0.5 : y;

    stackOrigin.push(originX,originY);
    stackSize.push(width,height);
    stackRadius.push(radius);

    var originDiffers = !stackOrigin.isEqual(),
        radiusDiffers = !stackRadius.isEqual(),
        detailDiffers = !stackDetail.isEqual(),
        sizeDiffers   = !stackSize.isEqual();

    /*
     console.log('detail: ' + detailDiffers + '\n' +
     'radius: ' + radiusDiffers + '\n' +
     'origin: ' + originDiffers + '\n' +
     'size:   ' + sizeDiffers);
     */


    if(radius == 0){
        var ox = originX + radius,
            oy = originY + radius,
            ow = originX + width  - radius,
            oh = originY + height - radius;
        this.quad(ox,oy,ow,oy,ow,oh,ox,oh);
        stackDetail.push(detail);
        return;
    }

    var bVertex  = this._bVertexRRect,
        bVertexT = this._bVertexRRectT;
    var bIndex   = this._bIndexRRect;
    var bCorner  = this._bCornerRRect;

    if(sizeDiffers || radiusDiffers){
        bCorner[0] = bCorner[6] = width  - radius;
        bCorner[1] = bCorner[3] = height - radius;
        bCorner[2] = bCorner[4] =
        bCorner[5] = bCorner[7] = radius;
    }

    var vertices,
        indices,
        colors;

    if(sizeDiffers || radiusDiffers || detailDiffers){
        GeomUtil.genVerticesRoundRect(bCorner,radius,detail,bVertex);
    }

    if(radiusDiffers || detailDiffers){
        GeomUtil.genIndicesRoundRect(bCorner,radius,detail,bIndex);
    }

    if(originDiffers){
        VertexUtil.translate(bVertex,originX,originY,bVertexT);
    }

    vertices = bVertexT;
    indices  = bIndex;

    var indicesLength = ((detail * 2 + 2) * 2 + 2) * 3;
    var gl = this._context3d;

    if(this._fill && !this._texture){
        colors = this.bufferColors(this._bColorFill4,this._bColorRRect);
        if(this._batchActive){}
        else{
            this.bufferArrays(vertices,colors,null,gl.DYNAMIC_DRAW);
            this.setMatrixUniform();
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.DYNAMIC_DRAW);
            gl.drawElements(gl.TRIANGLES, indicesLength,gl.UNSIGNED_SHORT,0);
        }
    }

    if(this._texture){
        if(this._batchActive){}
        else{}
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

    stackDetail.push(detail);
    this._stackDrawFunc.push(this.roundRect);
};


Context.prototype.ellipse = function(x,y,radius_x,radius_y){
    if(!this._fill && !this._stroke && !this._texture)return;
    var gl = this._context3d;

    var mode_origin  = this._modeEllipse;
    var stack_origin = this._stackOriginEllipse,
        stack_radius = this._stackRadiusEllipse,
        stack_detail = this._stackDetailEllipse;

    var origin_x = mode_origin == 0 ? x : x + radius_x,
        origin_y = mode_origin == 0 ? y : y + radius_y;

    stack_radius.push(radius_x,radius_y);
    stack_origin.push(origin_x,origin_y);

    var origin_differs = !stack_origin.isEqual(),
        radius_differs = !stack_radius.isEqual(),
        detail_differs = !stack_detail.isEqual();

    var detail = stack_detail.peek();
    var length = detail * 2;

    var vertices,
        colors;

    var b_vertex   = this._bVertexEllipse,
        b_vertex_s = this._bVertexEllipseS,
        b_vertex_t = this._bVertexEllipseT;

    if(detail_differs){
        GeomUtil.genVerticesCircle(detail,b_vertex);
    }

    if(detail_differs || radius_differs){
        VertexUtil.scale(b_vertex,radius_x,radius_y,b_vertex_s);
    }

    if(detail_differs || radius_differs || origin_differs){
        VertexUtil.translate(b_vertex_s,origin_x,origin_y,b_vertex_t);
    }

    vertices = b_vertex_t;

    /*
     console.log('detail: ' + stackDetailChanged  + '\n' +
     'radius: ' + stackRadiusChanged  + '\n' +
     'origin: ' + stackOriginChanged);
     */


    if(this._fill && !this._texture){
        colors = this.bufferColors(this._bColorFill,this._bColorEllipse);

        this.bufferArrays(vertices,colors,null);
        this.setMatrixUniform();
        gl.drawArrays(gl.TRIANGLE_FAN,0,detail);
    }

    if(this._texture){
        colors = this.bufferColors(this._bColorFill,this._bColorEllipse);
        var texCoords = this._bTexcoordEllipse;

        if(detail_differs || this._textureOffset){
            GeomUtil.genTexCoordsCircle(detail,
                this._textureOffsetX,this._textureOffsetY,
                this._textureOffsetWidth,this._textureOffsetHeight,
                texCoords);
        }

        this.bufferArrays(vertices,colors,texCoords);
        this.setMatrixUniform();
        gl.drawArrays(gl.TRIANGLE_FAN,0,detail);
    }

    if(this._stroke){
        this._polyline(vertices,length,true);
    }

    stack_detail.push(stack_detail.peek());
    this._stackDrawFunc.push(this.ellipse);
};



Context.prototype.circle = function(x,y,radius){
    if(!this._fill && !this._stroke && !this._texture)return;
    var gl = this._context3d;

    var mode_origin  = this._modeCircle;
    var stack_origin = this._stackOriginCircle,
        stack_radius = this._stackRadiusCircle,
        stack_detail = this._stackDetailCircle;

    var origin_x = mode_origin == 0 ? x : x + radius,
        origin_y = mode_origin == 0 ? y : y + radius;

    stack_origin.push(origin_x,origin_y);
    stack_radius.push(radius);

    var origin_differs = !stack_origin.isEqual(),
        radius_differs = !stack_radius.isEqual(),
        detail_differs = !stack_detail.isEqual();

    var detail = stack_detail.peek();
    var length = detail * 2;

    var vertices,
        colors;

    var b_vertex   = this._bVertexCircle,
        b_vertex_s = this._bVertexCircleS,
        b_vertex_t = this._bVertexCircleT;

    if(detail_differs){
        GeomUtil.genVerticesCircle(detail,b_vertex);
    }

    if(detail_differs || radius_differs){
        VertexUtil.scale(b_vertex,radius,radius,b_vertex_s);
    }

    if(detail_differs || radius_differs || origin_differs){
        VertexUtil.translate(b_vertex_s,origin_x,origin_y,b_vertex_t);
    }

    vertices = b_vertex_t;


    if(this._fill && !this._texture){
        colors = this.bufferColors(this._bColorFill,this._bColorCircle);

        this.bufferArrays(vertices,colors,null);
        this.setMatrixUniform();
        gl.drawArrays(gl.TRIANGLE_FAN,0,detail);
    }

    if(this._texture){
        colors = this.bufferColors(this._bColorFill,this._bColorCircle);
        var texCoords = this._bTexcoordEllipse;

        if(detail_differs || this._textureOffset){
            GeomUtil.genTexCoordsCircle(detail,
                this._textureOffsetX,this._textureOffsetY,
                this._textureOffsetWidth,this._textureOffsetHeight,
                texCoords);
        }

        this.bufferArrays(vertices,colors,texCoords);
        this.setMatrixUniform();
        gl.drawArrays(gl.TRIANGLE_FAN,0,detail);
    }

    if(this._stroke){
        this._polyline(vertices,length,true);
    }


    stack_detail.push(stack_detail.peek());

    this._stackDrawFunc.push(this.ellipse);
};


Context.prototype.arc = function(x, y, radius_x, radius_y, angle_start, angle_stop, radius_x_inner, radius_y_inner){
    if(!this._fill && !this._stroke && !this._texture)return;

    radius_x_inner = radius_x_inner || 0;
    radius_y_inner = radius_y_inner || 0;

    var gl = this._context3d;

    var mode_origin        = this._modeEllipse;
    var stack_origin       = this._stackOriginArc,
        stack_radius_inner = this._stackRadiusInnerArc,
        stack_radius_outer = this._stackRadiusOuterArc,
        stack_angle        = this._stackAngleArc,
        stack_detail       = this._stackDetailArc;

    var origin_x = mode_origin == 0 ? x : x + radius_x,
        origin_y = mode_origin == 0 ? y : y + radius_y;

    stack_radius_inner.push(radius_x_inner,radius_y_inner);
    stack_radius_outer.push(radius_x,radius_y);
    stack_angle.push(angle_start,angle_stop);
    stack_origin.push( origin_x,origin_y);

    var origin_differs       = !stack_origin.isEqual(),
        radius_inner_differs = !stack_radius_inner.isEqual(),
        radius_outer_differs = !stack_radius_outer.isEqual(),
        angle_differs = !stack_angle.isEqual(),
        detai_differs = !stack_detail.isEqual();

    var detail = stack_detail.peek();
    var vertices;

    var b_vertex   = this._bVertexArc,
        v_certex_t = this._bVertexArcT;

    if(radius_inner_differs || radius_outer_differs || angle_differs || detai_differs){
        GeomUtil.genVerticesArc(radius_x,radius_y,
            radius_x_inner,radius_y_inner,
            angle_start,angle_stop,
            detail,b_vertex);
    }

    if(origin_differs){
        VertexUtil.translate(b_vertex,origin_x,origin_y,v_certex_t);
    }

    vertices = v_certex_t;

    if(this._fill && !this._texture){
        var colors = this.bufferColors(this._bColorFill,this._bColorArc);

        if(this._batchActive){}
        else {
            this.bufferArrays(vertices,colors,null);
            this.setMatrixUniform();
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, detail * 2);
        }
    }

    if(this._texture){
        if(this._batchActive){}
        else {
        }
    }

    if(this._stroke){
        var b_vertex_stroke = this._bVertexArcStroke;
        if(radius_inner_differs || radius_outer_differs || angle_differs || detai_differs){
            GeomUtil.genVerticesArcStroke(v_certex_t,detail,b_vertex_stroke);
        }
        this._polyline(b_vertex_stroke,detail * 2,false);
    }

    stack_detail.push(detail);
    this._stackDrawFunc.push(this.arc);
};


Context.prototype.line = function(){
    if(!this._stroke)return;

    switch (arguments.length){
        case 1:
            if(arguments[0].length == 0)return;
            this._polyline(arguments[0]);
            break;
        case 4:
            var v = this._bPointLine4;

            v[0] = arguments[0];
            v[1] = arguments[1];
            v[2] = arguments[2];
            v[3] = arguments[3];

            this._polyline(v);
            break;
    }

    this._stackDrawFunc.push(this.line);
};

Context.prototype.lineSet = function(pointArr,widthArr,colorArr)
{


    this._stackDrawFunc.push(this.lineSet);
};

Context.prototype.bezier = function(x0,y0,x1,y1,x2,y2,x3,y3){
    var detail_bezier = this._stackDetailBezier;

    var detail   = detail_bezier.peek(),
        b_point  = this._bPointBezier,
        b_vertex = this._bVertexBezier;

    if(b_point[0] != x0 || b_point[1] != y0 ||
        b_point[2] != x2 || b_point[3] != y2 ||
        b_point[4] != x1 || b_point[5] != y1 ||
        b_point[6] != x3 || b_point[7] != y3 ||
        !detail_bezier.isEqual()){
        BezierUtil.genPoints(x0,y0,x1,y1,x2,y2,x3,y3,detail,b_vertex);
    }

    this._polyline(b_vertex,detail,false);

    detail_bezier.push(detail);
    this._stackDrawFunc.push(this.bezier);
};

Context.prototype.bezierPoint = function(d,out){
    var b_point = this._bPointBezier;
    var x0 = b_point[0],
        y0 = b_point[1],
        x2 = b_point[2],
        y2 = b_point[3],
        x1 = b_point[4],
        y1 = b_point[5],
        x3 = b_point[6],
        y3 = b_point[7];

    return BezierUtil.getPoint(x0,y0,x1,y1,x2,y2,x3,y3,d,out);
};


Context.prototype.bezierTangentAngle = function(d){
    var b_point = this._bPointBezier;
    var x0 = b_point[0],
        y0 = b_point[1],
        x2 = b_point[2],
        y2 = b_point[3],
        x1 = b_point[4],
        y1 = b_point[5],
        x3 = b_point[6],
        y3 = b_point[7];

    return BezierUtil.getTangentAngle(x0,y0,x1,y1,x2,y2,x3,y3,d);
};

Context.prototype.curve = function(points){
    var stack_detail = this._stackDetailSpline;
    var detail   = stack_detail.peek(),
        detail_2 = detail - 2;

    var i = 0, j,t;

    var vertices = this._tempCurveVertices = [];
    var pl = points.length;
    var ni;

    var catmullrom = _Math.catmullrom;

    while(i < pl-2){
        j = 0;
        while(j < detail){
            t  = j / detail_2;
            ni = i+1;

            vertices.push(catmullrom(points[Math.max(0,i-2)],
                points[i],
                points[Math.min(i+2,pl-2)],
                points[Math.min(i+4,pl-2)],t),
                catmullrom(points[Math.max(1,ni-2)],
                    points[ni],
                    points[Math.min(ni+2,pl-1)],
                    points[Math.min(ni+4,pl-1)],t));
            j+=2;
        }
        i+=2;
    }

    this._polyline(vertices);
    this._stackDrawFunc.push(this.curve);
};

Context.prototype.beginCurve =  function(out){
    this._tempCurveVertices = out || [];
};

Context.prototype.endCurve =  function(){
    this.curve(this._tempCurveVertices);
};

Context.prototype.getCurvePoints = function(){
    return this._tempCurveVertices;
}

Context.prototype.curveVertex = function(x,y){
    this._tempCurveVertices.push(x,y)
};

Context.prototype.triangle = function(x0,y0,x1,y1,x2,y2){
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
            this.bufferArrays(v,c,null);
            gl.drawArrays(gl.TRIANGLES,0,3);
        }
    }

    if(this._texture)
    {
        c = this.bufferColors(this._bColorFill,this._bColorTriangle);

        var t = this._bTexcoordTriangle;

        if(this._textureOffset)
        {
            var tox = this._textureOffsetX,
                toy = this._textureOffsetY,
                tow = this._textureOffsetWidth,
                toh = this._textureOffsetHeight;

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

            var offset_vertex   = 0,
                offset_color    = offset_vertex + vblen,
                offset_texcoord = vblen + cblen;


            var program = this._stackProgram.peek();

            //_context3d.bindBuffer(glArrayBuffer,this._vboShared);
            gl.bufferData(glArrayBuffer,tlen,gl.DYNAMIC_DRAW);

            gl.bufferSubData(glArrayBuffer,0,v);
            gl.bufferSubData(glArrayBuffer,offset_color,c);
            gl.bufferSubData(glArrayBuffer,offset_texcoord,t);

            gl.vertexAttribPointer(0, 2, glFloat, false, 0, offset_vertex);
            gl.vertexAttribPointer(1, 4, glFloat, false, 0, offset_color);
            gl.vertexAttribPointer(2, 2, glFloat, false, 0, offset_texcoord);

            gl.uniform1f(program[ShaderDict.uUseTexture],this._currTint);
            gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);
            gl.uniform1f(program[ShaderDict.uImage],0);
            gl.drawArrays(gl.TRIANGLES,0,1);

            this._unbindTexture();
        }
    }

    if(this._stroke){
        this._polyline(v, v.length,true);
    }

    this._stackDrawFunc.push(this.triangle);
};


Context.prototype.point = function(x,y)
{
    if(!this._fill)return;

    var v  = this._bVertexPoint,
        c  = this.bufferColors(this._bColorFill4,this._bColorPoint);

    v[0] = x;
    v[1] = y;

    this.setMatrixUniform();
    this.bufferArrays(v,c,null);
    this._context3d.drawArrays(this._context3d.POINTS,0,1);

    this._stackDrawFunc.push(this.point);
};


Context.prototype.pointSet = function(vertexArrOrFloat32Arr){
    if(!this._fill)return;
    var gl  = this._context3d;

    this.setMatrixUniform();
    this.bufferArrays(Util.safeFloat32Array(vertexArrOrFloat32Arr),
        this.bufferColors(this._bColorFill,new Float32Array(vertexArrOrFloat32Arr.length*2)));
    gl.drawArrays(gl.POINTS,0,vertexArrOrFloat32Arr.length*0.5);

    this._stackDrawFunc.push(this.pointSet);
};

/*------------------------------------------------------------------------------------------------------------*/
//  Polyline
/*------------------------------------------------------------------------------------------------------------*/

Context.prototype._polyline = function(points,length,loop){
    var stack_width = this._stackWidthLine,
        width = stack_width.peek();

    if(!this._stroke || width <= 0.0){
        return;
    }

    var width_2 = width * 0.5;

    var stack_color_stroke = this._stackColorStroke,
        color_stroke       = stack_color_stroke.peek(),
        color_stoke_length = color_stroke.length;

    if(color_stoke_length != 4 &&
       color_stoke_length != 8 &&
       color_stoke_length != length * 2){
        throw Warning.POLYLINE_INVALID_COLOR_RANGE;
    }

    loop   = Util.isUndefined(loop) ? false : loop;
    length = ((Util.isUndefined(length) || length == null) ? points.length : length) + (loop ? 2 : 0);

    /*------------------------------------------------------------------------------------------------------------*/

    var stack_points             = this._stackPointsLine,
        stack_points_length = this._stackPointsLineLength;

    if(!stack_width.isEqual()){
        VertexUtil.scale(this._bVertexLineCap0,width_2,width_2,this._bVertexLineCap0S);
    }

    var points_equal =  Util.equalArrContent(points,stack_points.peek());

    var b_mut_vertex = this._bMutVertexLine, //float32 vertices
        b_mut_color  = this._bMutColorLine,  //float32 colors
        b_mut_index  = this._bMutIndexLine;  //uint16  indices

    /*------------------------------------------------------------------------------------------------------------*/

    var b_vertex_cap   = this._bVertexLineCap0S, //float32 unicap vertices
        b_vertex_cap_t = this._bVertexLineCap0T,//float32 cap translateVertices
        b_index_cap    = this._bIndexLineCap0;  //uint16 cap indices

    var cap_vertex_len = b_vertex_cap.length,
        cap_color_len  = b_vertex_cap.length * 2,
        cap_index_len  = b_index_cap.length ;

    var b_vertex_edge = this._bVertexLineEdge; //8 edge vertices

    var edge_vertex_len = 8,
        edge_color_len  = 16,
        edge_index_len  = 18;

    var point_size  = 2,
        point_num   = length * 0.5,
        point_num_1 = point_num - 1,
        point_num_2 = point_num - 2;

    var edge_color_len_total = edge_color_len * point_num_1,
        edge_index_len_total = edge_index_len * point_num_1;

    var cap_color_len_total = cap_color_len * point_num,
        cap_index_len_total = cap_index_len * point_num;

    var edge_cap_vertex_len = edge_vertex_len + cap_vertex_len,
        edge_cap_color_len  = edge_color_len + cap_color_len,
        edge_cap_index_len  = edge_index_len + cap_index_len;

    var i, j, k, i2;

    /*------------------------------------------------------------------------------------------------------------*/

    // Recalc cap and edge vertices if points or linewidth differ
    if(!points_equal || !stack_width.isEqual()){
        b_mut_vertex.reset(edge_vertex_len * point_num_1 + cap_vertex_len * point_num); //total vertex lengtg

        var face_index,
            offset_vertex,
            offset_index;

        var x, y, nx, ny;
        var slope_x, slope_y, slope_len, temp;

        i = -1;
        while (++i < point_num){
            i2 = i * 2;

            x = points[i2    ];
            y = points[i2 + 1];

            if (loop && (i == point_num_1)){
                x = points[0];
                y = points[1];
            }

            // Set cap vertices
            VertexUtil.translate(b_vertex_cap, x, y, b_vertex_cap_t); //translate uni cap to pos
            //bMutVertex.set(bVertexCapT, bMutVertex.size(), capVertexLen); //send to float32
            b_mut_vertex.unsafePush(b_vertex_cap_t);

            // Set edge vertices
            if (i < point_num_1){
                nx = points[i2 + 2];
                ny = points[i2 + 3];

                if (loop && (i == point_num_2)){
                    nx = points[0];
                    ny = points[1];
                }

                slope_x = nx - x;
                slope_y = ny - y;

                slope_len = 1 / Math.sqrt(slope_x * slope_x + slope_y * slope_y);

                slope_x *= slope_len;
                slope_y *= slope_len;

                temp   = slope_x;
                slope_x = slope_y;
                slope_y = -temp;

                temp = width_2 * slope_x;

                offset_vertex = j = edge_cap_vertex_len * i + cap_vertex_len;

                b_vertex_edge[0] = x  + temp;
                b_vertex_edge[2] = x  - temp;
                b_vertex_edge[4] = nx + temp;
                b_vertex_edge[6] = nx - temp;

                temp = width_2 * slope_y;

                b_vertex_edge[1] = y  + temp;
                b_vertex_edge[3] = y  - temp;
                b_vertex_edge[5] = ny + temp;
                b_vertex_edge[7] = ny - temp;

                //bMutVertex.set(bVertexEdge, bMutVertex.size()); //send to float32
                b_mut_vertex.unsafePush(b_vertex_edge);
            }
        }
    }

    /*------------------------------------------------------------------------------------------------------------*/

    // Recalc face indices if pointsLength changed
    if(!stack_points_length.isEqual()){
        var b_index = Util.arrayResized(this._bIndexLine,edge_index_len_total + cap_index_len_total);

        i = -1;
        while (++i < point_num){
            i2 = i * 2;

            // Set cap face indices
            offset_index  = j = edge_cap_index_len * i;
            offset_vertex = edge_cap_vertex_len * i;
            face_index    = offset_vertex / point_size;

            k = 0;
            while (j < offset_index + cap_index_len){
                b_index[j++] = b_index_cap[k++] + face_index;
            }

            // Set edge face indices
            if (i < point_num_1){
                offset_vertex = edge_cap_vertex_len * i + cap_vertex_len;
                face_index    = offset_vertex / point_size;
                j             = offset_index + cap_index_len;

                b_index[j    ] = face_index;
                b_index[j + 1] = b_index[j + 3] = face_index + 1;
                b_index[j + 2] = b_index[j + 4] = face_index + 2;
                b_index[j + 5] = face_index + 3;
            }
        }
        //send faces to uint16
        b_mut_index.reset(b_index.length);
        b_mut_index.unsafePush(b_index);
    }

    /*------------------------------------------------------------------------------------------------------------*/

    var b_color_length = edge_color_len_total + cap_color_len_total;
    var b_color       = Util.arrayResized(this._bColorLine,b_color_length);

    b_mut_color.reset(b_color_length);


    if( color_stoke_length != 4){
        if(color_stoke_length != length * 2){
            var b_color_intrpl = Color.colorvLerped(color_stroke,Util.arrayResized(point_num * 4, this._bColorStrokeIntrpl));

            i = 0;

            while(i < b_color_length){
                j = i;
                k = i/edge_cap_color_len * 4;

                while(j < i + cap_color_len){
                    b_color[j  ] = b_color_intrpl[k  ];
                    b_color[j+1] = b_color_intrpl[k+1];
                    b_color[j+2] = b_color_intrpl[k+2];
                    b_color[j+3] = b_color_intrpl[k+3];
                    j+=4;
                }

                b_color[j   ] = b_color[j+4 ] = b_color_intrpl[k  ];
                b_color[j+1 ] = b_color[j+5 ] = b_color_intrpl[k+1];
                b_color[j+2 ] = b_color[j+6 ] = b_color_intrpl[k+2];
                b_color[j+3 ] = b_color[j+7 ] = b_color_intrpl[k+3];

                b_color[j+8 ] = b_color[j+12] = b_color_intrpl[k+4];
                b_color[j+9 ] = b_color[j+13] = b_color_intrpl[k+5];
                b_color[j+10] = b_color[j+14] = b_color_intrpl[k+6];
                b_color[j+11] = b_color[j+15] = b_color_intrpl[k+7];

                i+=edge_cap_color_len;
            }
        } else{

        }

        b_mut_color.set(b_color,b_mut_color.size());
    }
    else{
        this.bufferColors(color_stroke,b_mut_color.array);
    }


    if(this._batchActive){}
    else{
        var gl = this._context3d;
        this.bufferArrays(b_mut_vertex.array,b_mut_color.array,null,gl.DYNAMIC_DRAW);
        this.setMatrixUniform();
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,b_mut_index.array,gl.DYNAMIC_DRAW);
        gl.drawElements(gl.TRIANGLES,b_mut_index.size(),gl.UNSIGNED_SHORT,0);

    }

    stack_color_stroke.push(Util.copyArray(color_stroke));
    stack_points.push(Util.copyArray(points));
    stack_points_length.push(length);
    stack_width.push(width);
};

Context.prototype._genPolylineSet = function(points){

};

Context.prototype._polylineSet = function(models){







};


/*---------------------------------------------------------------------------------------------------------*/
// sets
/*---------------------------------------------------------------------------------------------------------*/

/*
 *
 * rectSet
 *
 */

Context.prototype.rectSet = function(posArr, dimArr, fillColorArr, strokeColorArr, texcoordArr){
    if(!fillColorArr   && !this._fill &&
       !strokeColorArr && !this._stroke &&
       !texcoordArr    && !this._texture)return;

    if((posArr.length == 0) || (posArr.length != dimArr.length) ||
        (fillColorArr   && fillColorArr.length   * 0.5 != posArr.length) ||
        (strokeColorArr && strokeColorArr.length * 0.5 != posArr.length)){
        return;
    }

    var modeOrigin = this._modeRect;

    var shift = modeOrigin == Context.CENTER ? 0 : 1;

    var bVertex     = this._bVertexRectSet,
        bColor      = this._bColorRectSet,
        bTexcoord   = this._bTexcoordRectSet;
    var bMutVertex   = this._bMutVertexRectSet,
        bMutColor    = this._bMutColorRectSet,
        bMutTexcoord = this._bMutTexcoordRectSet;

    bMutVertex.reset();
    bMutColor.reset();
    bMutTexcoord.reset();


    var bColor4;
    var posX,posY;
    var width_2,height_2;
    var shift_w,shift_h;
    var rx,ry,rw,rh;

    var gl = this._context3d;
    var length = posArr.length * 0.5;
    var i,i2,i4;
    var j;
    i = -1;

    if(!this._texture){
        if(fillColorArr){
            while(++i < length){
                i2 = i * 2;
                i4 = i * 4;

                posX     = posArr[i2  ];
                posY     = posArr[i2+1];
                width_2  = dimArr[i2  ] * 0.5;
                height_2 = dimArr[i2+1] * 0.5;
                shift_w  = width_2  * shift;
                shift_h  = height_2 * shift;

                rx = posX - width_2  + shift_w;
                ry = posY - height_2 + shift_h;
                rw = posX + width_2  + shift_w;
                rh = posY + height_2 + shift_h;

                // 0     5---4
                // | \    \  |
                // |  \    \ |
                // 1---2     3

                bVertex[ 0] = bVertex[ 2] = bVertex[10] = rx;
                bVertex[ 1] = bVertex[ 9] = bVertex[11] = ry;
                bVertex[ 4] = bVertex[ 6] = bVertex[ 8] = rw;
                bVertex[ 3] = bVertex[ 5] = bVertex[ 7] = rh;

                bColor[0] = fillColorArr[i4  ];
                bColor[1] = fillColorArr[i4+1];
                bColor[2] = fillColorArr[i4+2];
                bColor[3] = fillColorArr[i4+3];

                bMutVertex.set(bVertex,bMutVertex.size());

                j = -1;
                while(++j < 6){
                    bMutColor.set( bColor, bMutColor.size());
                }

            }

            this.bufferArrays(bMutVertex.array,bMutColor.array,null,gl.DYNAMIC_DRAW);
            this.setMatrixUniform();
            gl.drawArrays(gl.TRIANGLES,0,length * 6);
        }
        else if(!fillColorArr && this._fill){
            bColor4 = this._bColorFill4;

            bColor[0] = bColor4[0];
            bColor[1] = bColor4[1];
            bColor[2] = bColor4[2];
            bColor[3] = bColor4[3];

            while(++i < length){
                i2 = i * 2;
                i4 = i * 4;

                posX     = posArr[i2  ];
                posY     = posArr[i2+1];
                width_2  = dimArr[i2  ] * 0.5;
                height_2 = dimArr[i2+1] * 0.5;
                shift_w  = width_2  * shift;
                shift_h  = height_2 * shift;

                rx = posX - width_2  + shift_w;
                ry = posY - height_2 + shift_h;
                rw = posX + width_2  + shift_w;
                rh = posY + height_2 + shift_h;

                bVertex[ 0] = bVertex[ 2] = bVertex[10] = rx;
                bVertex[ 1] = bVertex[ 9] = bVertex[11] = ry;
                bVertex[ 4] = bVertex[ 6] = bVertex[ 8] = rw;
                bVertex[ 3] = bVertex[ 5] = bVertex[ 7] = rh;

                bMutVertex.set(bVertex,bMutVertex.size());

                j = -1;
                while(++j < 6){
                    bMutColor.set( bColor, bMutColor.size());
                }
            }

            this.bufferArrays(bMutVertex.array,bMutColor.array,null,gl.DYNAMIC_DRAW);
            this.setMatrixUniform();
            gl.drawArrays(gl.TRIANGLES,0,length * 6);
        }
    } else {
        if(this._currTint = 1.0){
            while(++i < length){
                i2 = i * 2;
                i4 = i * 4;

                posX     = posArr[i2  ];
                posY     = posArr[i2+1];
                width_2   = dimArr[i2  ] * 0.5;
                height_2  = dimArr[i2+1] * 0.5;
                shift_w   = width_2  * shift;
                shift_h   = height_2 * shift;

                rx = posX - width_2  + shift_w;
                ry = posY - height_2 + shift_h;
                rw = posX + width_2  + shift_w;
                rh = posY + height_2 + shift_h;

                bVertex[ 0] = bVertex[ 2] = bVertex[10] = rx;
                bVertex[ 1] = bVertex[ 9] = bVertex[11] = ry;
                bVertex[ 4] = bVertex[ 6] = bVertex[ 8] = rw;
                bVertex[ 3] = bVertex[ 5] = bVertex[ 7] = rh;

                bMutVertex.set(bVertex,bMutVertex.size());
                bMutTexcoord.set(bTexcoord,bMutTexcoord.size());
            }

            this.bufferArrays(bMutVertex.array,null,bMutTexcoord.array,gl.DYNAMIC_DRAW);
            this.setMatrixUniform();
            gl.drawArrays(gl.TRIANGLES,0,length * 6);
        } else {
            if(fillColorArr){
                while(++i < length){
                    i2 = i * 2;
                    i4 = i * 4;

                    posX     = posArr[i2  ];
                    posY     = posArr[i2+1];
                    width_2  = dimArr[i2  ] * 0.5;
                    height_2 = dimArr[i2+1] * 0.5;
                    shift_w  = width_2  * shift;
                    shift_h  = height_2 * shift;

                    rx = posX - width_2  + shift_w;
                    ry = posY - height_2 + shift_h;
                    rw = posX + width_2  + shift_w;
                    rh = posY + height_2 + shift_h;

                    bVertex[ 0] = bVertex[ 2] = bVertex[10] = rx;
                    bVertex[ 1] = bVertex[ 9] = bVertex[11] = ry;
                    bVertex[ 4] = bVertex[ 6] = bVertex[ 8] = rw;
                    bVertex[ 3] = bVertex[ 5] = bVertex[ 7] = rh;

                    bColor[0] = fillColorArr[i4  ];
                    bColor[1] = fillColorArr[i4+1];
                    bColor[2] = fillColorArr[i4+2];
                    bColor[3] = fillColorArr[i4+3];

                    bMutVertex.set(bVertex,bMutVertex.size());

                    j = -1;
                    while(++j < 6){
                        bMutColor.set( bColor, bMutColor.size());
                    }

                    bMutTexcoord.set(bTexcoord,bMutTexcoord.size());

                }

                this.bufferArrays(bMutVertex.array,bMutColor.array,bMutTexcoord.array,gl.DYNAMIC_DRAW);
                this.setMatrixUniform();
                gl.drawArrays(gl.TRIANGLES,0,length * 6);
            }
            else if(!fillColorArr && this._fill){
                bColor4 = this._bColorFill4;

                bColor[0] = bColor4[0];
                bColor[1] = bColor4[1];
                bColor[2] = bColor4[2];
                bColor[3] = bColor4[3];

                while(++i < length){
                    i2 = i * 2;
                    i4 = i * 4;

                    posX     = posArr[i2  ];
                    posY     = posArr[i2+1];
                    width_2  = dimArr[i2  ] * 0.5;
                    height_2 = dimArr[i2+1] * 0.5;
                    shift_w  = width_2  * shift;
                    shift_h  = height_2 * shift;

                    rx = posX - width_2  + shift_w;
                    ry = posY - height_2 + shift_h;
                    rw = posX + width_2  + shift_w;
                    rh = posY + height_2 + shift_h;

                    bVertex[ 0] = bVertex[ 2] = bVertex[10] = rx;
                    bVertex[ 1] = bVertex[ 9] = bVertex[11] = ry;
                    bVertex[ 4] = bVertex[ 6] = bVertex[ 8] = rw;
                    bVertex[ 3] = bVertex[ 5] = bVertex[ 7] = rh;

                    bMutVertex.set(bVertex,bMutVertex.size());

                    j = -1;
                    while(++j < 6){
                        bMutColor.set( bColor, bMutColor.size());
                    }

                    bMutTexcoord.set(bTexcoord,bMutTexcoord.size());
                }

                this.bufferArrays(bMutVertex.array,bMutColor.array,bMutTexcoord.array,gl.DYNAMIC_DRAW);
                this.setMatrixUniform();
                gl.drawArrays(gl.TRIANGLES,0,length * 6);
            }

        }
    }

    if(this._stroke && !strokeColorArr){


    } else if(strokeColorArr){

    }

    this._stackDrawFunc.push(this.rectSet);
};

/*
 *
 * circleSet
 *
 */

Context.prototype.circleSet = function(posArr,radiusArr,fillColorArr,strokeColorArr,texcoordArr){
    if(!fillColorArr   && !this._fill &&
       !strokeColorArr && !this._stroke &&
       !texcoordArr    && !this._texture)return;

    var modeOrigin  = this._modeCircle;
    var stackDetail = this._stackDetailCircle;

    var length = posArr.length * 0.5;
    var detail = stackDetail.peek();

    if(!stackDetail.isEqual()){
        GeomUtil.genVerticesCircle(detail,this._bVertexCircle);
        this._bTexcoordCircleSet = new Float32Array(ModelUtil.genTexCoordsLinearCW(detail * 2));
        this._bIndexCircle       = new Uint16Array(ModelUtil.genFaceIndicesFan(detail * 2));
        this._bIndexCircleSet    = new DataType.UintArray(this._bIndexCircle);
    }

    var bVertex      = this._bVertexCircle,
        bVertexSet   = this._bVertexCircleSet,
        bIndexSet    = this._bIndexCircleSet,
        bColorSet    = this._bColorCircleSet,
        bTexCoordSet = this._bTexcoordCircleSet;

    var bMutVertex   = this._bMutVertexCircleSet,
        bMutColor    = this._bMutColorCircleSet,
        bMutTexCoord = this._bMutTexcoordCircleSet,
        bMutIndex    = this._bMutIndexCircleSet;

    var bColorFill4 = this._bColorFill4;


    var gl = this._context3d;
    var i,i2, j,j4;

    var radius,originX,originY;

    var shift = modeOrigin == 0 ? 0 : 1;
    var shiftRadius;

    var indexLen    = bIndexSet.length,
        vertexLen   = detail * 2,
        colorLen    = detail * 4,
        texCoordLen = detail * 2;

    bMutVertex.reset(vertexLen * length);
    bMutColor.reset(colorLen * length);
    bMutTexCoord.reset(texCoordLen * length);
    bMutIndex.reset(indexLen * length);


    if(!this._texture){
        if(!fillColorArr){
            this.bufferColors(bColorFill4,bColorSet);

            i = -1;
            while(++i < length){
                i2 = i * 2;

                radius      = radiusArr[i];
                shiftRadius = shift * radius;
                originX     = posArr[i2  ] + shiftRadius;
                originY     = posArr[i2+1] + shiftRadius;

                VertexUtil.scaleTranslate(bVertex,radius,radius,originX,originY,bVertexSet);

                bMutVertex.unsafePush(bVertexSet,vertexLen);
                bMutColor.unsafePush( bColorSet, colorLen);


                if(i > 0){
                    Util.setArrOffsetIndex(bIndexSet,detail,indexLen);
                }

                bMutIndex.unsafePush(bIndexSet,indexLen);
            }
        } else {
            var i4;
            i = -1;
            while(++i < length){
                i2 = i * 2;
                i4 = i * 4;
                radius      = radiusArr[i];
                shiftRadius = shift * radius;
                originX     = posArr[i2  ] + shiftRadius;
                originY     = posArr[i2+1] + shiftRadius;

                VertexUtil.scaleTranslate(bVertex,radius,radius,originX,originY,bVertexSet);

                bMutVertex.unsafePush(bVertexSet,vertexLen);

                j = 0;
                while(j < colorLen){
                    bColorSet[j+0] = fillColorArr[i4  ];
                    bColorSet[j+1] = fillColorArr[i4+1];
                    bColorSet[j+2] = fillColorArr[i4+2];
                    bColorSet[j+3] = fillColorArr[i4+3];
                    j+=4;
                }

                bMutColor.unsafePush( bColorSet, colorLen);


                if(i > 0){
                    Util.setArrOffsetIndex(bIndexSet,detail,indexLen);
                }

                bMutIndex.unsafePush(bIndexSet,indexLen);

            }
        }

        this.bufferArrays(bMutVertex.array, bMutColor.array, null, gl.DYNAMIC_DRAW);
        this.setMatrixUniform();
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,bMutIndex.array,gl.DYNAMIC_DRAW);
        gl.drawElements(gl.TRIANGLES,bMutIndex.size(),DataType.ElementIndex,0);



    } else {
        if(!fillColorArr){
            var colorFill4f = this._bColorFill4;

            j = -1;
            while(++j < detail){
                j4 = j * 4;
                bColorSet[j4+0] = colorFill4f[0];
                bColorSet[j4+1] = colorFill4f[1];
                bColorSet[j4+2] = colorFill4f[2];
                bColorSet[j4+3] = colorFill4f[3];
            }

            i = -1;
            while(++i < length){
                i2 = i * 2;

                radius      = radiusArr[i];
                shiftRadius = shift * radius;
                originX     = posArr[i2  ] + shiftRadius;
                originY     = posArr[i2+1] + shiftRadius;

                VertexUtil.scaleTranslate(bVertex,radius,radius,originX,originY,bVertexSet);

                bMutVertex.set(bVertexSet,bMutVertex.size(),vertexLen);
                bMutColor.set(bColorSet,bMutColor.size(),colorLen);
                bMutTexCoord.set(bTexCoordSet,bMutTexCoord.size(),texCoordLen);

                if(i > 0){
                    Util.setArrOffsetIndex(bIndexSet,detail,indexLen);
                }

                bMutIndex.set(bIndexSet,bMutIndex.size());
            }


        } else {
            i = -1;
            while(++i < length){
                i2 = i * 2;

                radius      = radiusArr[i];
                shiftRadius = shift * radius;
                originX     = posArr[i2  ] + shiftRadius;
                originY     = posArr[i2+1] + shiftRadius;

                VertexUtil.scaleTranslate(bVertex,radius,radius,originX,originY,bVertexSet);

                bMutVertex.set(bVertexSet,bMutVertex.size(),vertexLen);
                bMutColor.set(bColorSet,bMutColor.size(),colorLen);
                bMutTexCoord.set(bTexCoordSet,bMutTexCoord.size(),texCoordLen);

                if(i > 0){
                    Util.setArrOffsetIndex(bIndexSet,detail,indexLen);
                }

                bMutIndex.set(bIndexSet,bMutIndex.size());
            }




        }

        this.bufferArrays(bMutVertex.array, bMutColor.array, bMutTexCoord.array, gl.DYNAMIC_DRAW);
        this.setMatrixUniform();
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,bMutIndex.array,gl.DYNAMIC_DRAW);
        gl.drawElements(gl.TRIANGLES,bMutIndex.size(),DataType.ElementIndex,0);
    }

    stackDetail.push(detail);
    this._stackDrawFunc.push(this.circleSet);
};

/*---------------------------------------------------------------------------------------------------------*/
// drawArrays / drawELements
/*---------------------------------------------------------------------------------------------------------*/


Context.prototype.drawArrays = function(verticesArrOrFloat32Arr, colorArrOrFloat32Arr, mode){
    if(!this._fill)return;

    var vertices = Util.safeFloat32Array(verticesArrOrFloat32Arr),
        colors   = this.bufferColors((colorArrOrFloat32Arr || this._bColorFill4),
            new Float32Array(verticesArrOrFloat32Arr.length * 2));

    var gl  = this._context3d;

    if(this._batchActive){
        this._batchPush(vertices,
            mode == Context.TRIANGLE_STRIP ?
                ModelUtil.genFaceIndicesLinearCW(vertices.length) :
                ModelUtil.genFaceIndicesFan(vertices.length),
            colors,null);

    } else {
        this.bufferArrays(vertices,colors,null);
        gl.drawArrays(mode,0,vertices.length*0.5);
    }

    this._stackDrawFunc.push(this.drawArrays);
};



Context.prototype.drawElements = function(vertices,indices,colors,mode,length){
    vertices = Util.safeFloat32Array(vertices);
    indices  = indices ?
        Util.safeUint16Array(indices) :
        new Uint16Array(ModelUtil.genFaceIndicesLinearCW(vertices.length));

    //TODO: fix me
    var colorsExpLength = vertices.length * 2;

    colors = colors ? (colors.length == colorsExpLength ?
        Util.safeFloat32Array(colors) :
        this.bufferColors(colors, new Float32Array(colorsExpLength))) :
        this.bufferColors(this._bColorFill4, new Float32Array(colorsExpLength));

    if(colors){
        colors = colors.length == colorsExpLength ?
            Util.safeFloat32Array(colors) :
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
        gl.drawElements(gl.TRIANGLES,length || indices.length,gl.UNSIGNED_SHORT,0);
    }

    this._stackDrawFunc.push(this.drawElements);
};

Context.prototype._bindDefaultGLArrayBuffer = function(){
    var gl = this._context3d;
    gl.bindBuffer(gl.ARRAY_BUFFER,this._vboShared);
};

/*---------------------------------------------------------------------------------------------------------*/
// Draw Func stack
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype._flushDrawCalls = function(){


};


/*---------------------------------------------------------------------------------------------------------*/
// Batch internal
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype.beginBatch = function()
{
    this._batchActive = true;

    this._batchBVertex     = [];
    this._batchBIndex      = [];
    this._batchBColor = [];
    this._batchBTexcoord    = [];

    this._batchOffsetVertices = 0;
};


Context.prototype._batchPush = function(vertices,indices,colors,texCoords,limit)
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
        bt = this._batchBTexcoord;

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




Context.prototype.drawBatch = function()
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
            t = new Float32Array(this._batchBTexcoord);
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

    var program = this._stackProgram.peek();

    if(textured){
        gl.bufferData(glArrayBuffer,tlen,glDynamicDraw);
        gl.bufferSubData(glArrayBuffer,0,    v);
        gl.bufferSubData(glArrayBuffer,vblen,c);
        gl.bufferSubData(glArrayBuffer,vblen+cblen,t);
        gl.vertexAttribPointer(0,2,glFloat,false,0,0);
        gl.vertexAttribPointer(1,4,glFloat,false,0,vblen);
        gl.vertexAttribPointer(2,2,glFloat,false,0,vblen + cblen);
        gl.uniform1f(program[ShaderDict.uUseTexture],this._currTint);
        gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);
        gl.uniform1f(program[ShaderDict.uImage],0);

    }
    else{
        gl.bufferData(glArrayBuffer,tlen,glDynamicDraw);
        gl.bufferSubData(glArrayBuffer,0,    v);
        gl.bufferSubData(glArrayBuffer,vblen,c);
        gl.vertexAttribPointer(0,2,glFloat,false,0,0);
        gl.vertexAttribPointer(1,4,glFloat,false,0,vblen);
    }

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,i,glDynamicDraw);
    gl.drawElements(gl.TRIANGLES, i.length,gl.UNSIGNED_SHORT,0);

    this._stackDrawFunc.push(this.drawBatch);
};

Context.prototype.endBatch = function(){
    this._batchActive = false;
};

Context.prototype.getBatch = function(out){

    if(out){
        out[0] = Util.copyFloat32Array(this._batchBVertex);
        out[1] = Util.copyFloat32Array(this._batchBColor);
        out[2] = Util.copyFloat32Array(this._batchBIndex);
        out[3] = Util.copyFloat32Array(this._batchBTexcoord);
        return out;
    }

    return [this._batchBVertex,
        this._batchBColor,
        this._batchBIndex,
        this._batchBTexcoord];
};

Context.prototype.beginBatchToTexture = function(){
    this._batchTextureActive = true;
};

Context.prototype.endBatchToTexture = function(){
    this._batchTextureActive = false;

};




/*---------------------------------------------------------------------------------------------------------*/
// Image & Texture
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype._drawImage = function(img,x,y,width,height){
    var gl      = this._context3d;
    var program = this._stackProgram.peek();

    var originMode = this._modeRect;

    width  = typeof width === 'undefined' ? img.getWidth() : width;
    height = typeof height=== 'undefined' ? img.getHeight(): height;
    x      = x || 0;
    y      = y || 0;

    var rectX,rectY,rectWidth,rectHeight;

    if(originMode == Context.CENTER){
        var width_2  = width  * 0.5,
            height_2 = height * 0.5;

        rectX      = x - width_2;
        rectY      = y - height_2;
        rectWidth  = x + width_2;
        rectHeight = y + height_2;
    }
    else{
        rectX      = x;
        rectY      = y;
        rectWidth  = x + width;
        rectHeight = y + height;
    }

    var bVertex   = this._bVertexImg,
        bColor    = this._bColorImg,
        bTexcoord = this._bTexcoordImg;

    bVertex[0] = rectX;
    bVertex[1] = rectY;

    bVertex[2] = rectWidth;
    bVertex[3] = rectY;

    bVertex[4] = rectX;
    bVertex[5] = rectHeight;

    bVertex[6] = rectWidth;
    bVertex[7] = rectHeight;

    this.setMatrixUniform();

    img.getTexture().bind();
    this.bufferArrays(bVertex,bColor,bTexcoord);

    gl.uniform1f(program[ShaderDict.uUseTexture],1.0);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

    gl.uniform1f(program[ShaderDict.uUseTexture],0.0);
    img.getTexture().unbind();
};

Context.prototype.getImagePixel = function(img){
    var prevFrameBuffer = this._fboStack.peek();

};

/*---------------------------------------------------------------------------------------------------------*/
// Program
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype.useProgram = function(program){
    var stack = this._stackProgram;
    if(program == stack.peek())return;
    this._context3d.useProgram(program.program);
    program.enableVertexAttribArrays();
    stack.push(program);
};

Context.prototype.restoreDefaultProgram = function(){
    this.useProgram(this._program);
};

Context.prototype.getProgram = function(){
    return this._stackProgram.peek();
};


/*---------------------------------------------------------------------------------------------------------*/
// Matrix
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype.setMatrixUniform = function(){
    var program = this._stackProgram.peek();
    this._context3d.uniformMatrix3fv(program[ShaderDict.uMatrix],false,this._matrix);
};

Context.prototype.loadIdentity = function(){
    Mat33.identity(this._matrix);
};

Context.prototype.translate = function(x,y){
    Mat33.multPost(this._matrix, Mat33.makeTranslate(x,y,Mat33.identity(this._matrixTemp)), this._matrix);
};

Context.prototype.scale = function(x,y){
    Mat33.multPost(this._matrix, Mat33.makeScale(x,y,Mat33.identity(this._matrixTemp)), this._matrix);
};

Context.prototype.rotate = function(a){
    Mat33.multPost(this._matrix, Mat33.makeRotate(a,Mat33.identity(this._matrixTemp)), this._matrix);
};

Context.prototype.multMatrix = function(m){
    Mat33.multPost(this._matrix, m, this._matrix);
};

Context.prototype.pushMatrix = function(){
    this._matrixStack.push(Mat33.copy(this._matrix));
};

Context.prototype.popMatrix = function(){
    var stack = this._matrixStack;
    if(stack.length == 0){
        throw Warning.INVALID_STACK_POP;
    }

    this._matrix = stack.pop();
    return this._matrix;
};

Context.prototype.getPoint2fTransformed = function(x,y,out){
    out = out || new Float32Array(2);
    out[0] = x;
    out[1] = y;
    return Mat33.applyVec2f(out,this._matrix);
};

Context.prototype.getPoint2fvTransformed = function(p,out){
    out = out || new Float32Array(2);
    return  Mat33.applyVec2f(p,this._matrix,out);
};

/*---------------------------------------------------------------------------------------------------------*/
// buffer arrays / colors
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype.bufferArrays = function(vertexFloat32Array,colorFloat32Array,texCoord32Array,drawMode){
    var ta = texCoord32Array   ? true : false,
        ca = colorFloat32Array ? true : false;

    var program = this._stackProgram.peek();

    var paVertexPosition = program[ShaderDict.aVertPosition],
        paVertexColor    = program[ShaderDict.aVertColor],
        paVertexTexCoord = program[ShaderDict.aTexCoord];

    var gl            = this._context3d,
        glArrayBuffer = gl.ARRAY_BUFFER,
        glFloat       = gl.FLOAT;

    var glDrawMode = drawMode || gl.STATIC_DRAW;

    var vblen = vertexFloat32Array.byteLength,
        cblen = ca ? colorFloat32Array.byteLength : 0,
        tblen = ta ? texCoord32Array.byteLength   : 0;

    var offsetV = 0,
        offsetC = offsetV + vblen,
        offsetT = offsetC + cblen;

    gl.bufferData(glArrayBuffer,vblen + cblen + tblen, glDrawMode);

    gl.bufferSubData(glArrayBuffer, offsetV, vertexFloat32Array);
    gl.vertexAttribPointer(paVertexPosition,2,glFloat,false,0,offsetV);

    if(paVertexColor !== undefined){
        if(!ca){
            gl.disableVertexAttribArray(paVertexColor);
        } else {
            gl.enableVertexAttribArray(paVertexColor);
            gl.bufferSubData(glArrayBuffer, offsetC, colorFloat32Array);
            gl.vertexAttribPointer(paVertexColor, 4, glFloat, false, 0, offsetC);
        }
    }

    if(paVertexTexCoord !== undefined){
        if(!ta){
            gl.disableVertexAttribArray(paVertexTexCoord);
        } else {
            gl.enableVertexAttribArray(paVertexTexCoord);
            gl.bufferSubData(glArrayBuffer,offsetT,texCoord32Array);
            gl.vertexAttribPointer(paVertexTexCoord,2,glFloat,false,0,offsetT);
        }
    }
};

//TODO(hw) performance set vs set index loop test
Context.prototype.bufferColors = function(color,buffer){
    var cl = color.length,
        bl = buffer.length;
    var i = 0;

    if(cl == 4){
        /*
        while(i < bl){
            buffer[i]  =color[0];
            buffer[i+1]=color[1];
            buffer[i+2]=color[2];
            buffer[i+3]=color[3];
            i+=4;
        }
        */
        while(i < bl){
            buffer.set(color,i);
            i+=4;
        }

    }
    else{
        if(cl != bl){
            throw Warning.UNEQUAL_ARR_LEN_COLOR_BUFFER;
        }

        buffer.set(color);
        /*
        while(i < bl){
            buffer[i]   = color[i];
            buffer[i+1] = color[i+1];
            buffer[i+2] = color[i+2];
            buffer[i+3] = color[i+3];
            i+=4;
        }
        */
    }

    return buffer;
};

/*---------------------------------------------------------------------------------------------------------*/
// misc
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype.getContext3d = function(){return this._context3d;};
Context.prototype.getContext2d = function(){return this._context2d;};

Context.prototype._getWidth_internal  = function(){return this._width;};
Context.prototype._getHeight_internal = function(){return this._height;};

/*---------------------------------------------------------------------------------------------------------*/
// props
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype._getSSAAFactor = function(){
    return this._ssaaf;
};

Context.__POLYLINE_SPLIT = 0x1;

Context.CENTER = 0;
Context.CORNER = 1;
Context.WRAP   = 2;
Context.CLAMP  = 3;
Context.REPEAT = 4;

Context.FUNC_ADD = WebGLRenderingContext.FUNC_ADD;
Context.FUNC_SUBTRACT = WebGLRenderingContext.FUNC_SUBTRACT;
Context.FUNC_REVERSE_SUBTRACT = WebGLRenderingContext.FUNC_REVERSE_SUBTRACT;

Context.ZERO = WebGLRenderingContext.ZERO;
Context.ONE  = WebGLRenderingContext.ONE;

Context.SRC_ALPHA = WebGLRenderingContext.SRC_ALPHA;
Context.SRC_COLOR = WebGLRenderingContext.SRC_COLOR;

Context.ONE_MINUS_SRC_ALPHA = WebGLRenderingContext.ONE_MINUS_SRC_ALPHA;
Context.ONE_MINUS_SRC_COLOR = WebGLRenderingContext.ONE_MINUS_SRC_COLOR;

Context.TRIANGLE_STRIP = WebGLRenderingContext.TRIANGLE_STRIP;
Context.TRIANGLE_FAN   = WebGLRenderingContext.TRIANGLE_FAN;

Context.RGBA = WebGLRenderingContext.RGBA;
Context.RGB = WebGLRenderingContext.RGB;
Context.UNSIGNED_BYTE = WebGLRenderingContext.UNSIGNED_BYTE;
Context.FLOAT = WebGLRenderingContext.FLOAT;

Context.TOP    = "top";
Context.MIDDLE = "middle";
Context.BOTTOM = "bottom";

Context.THIN    = "thin";
Context.REGULAR = "normal";
Context.BOLD    = "bold";

Context.CAP_NONE  = 5;
Context.CAP_ROUND = 6;

Context.ARRAY_BUFFER = WebGLRenderingContext.ARRAY_BUFFER;
Context.ELEMENT_ARRAY_BUFFER = WebGLRenderingContext.ELEMENT_ARRAY_BUFFER;

/*---------------------------------------------------------------------------------------------------------*/
// Exports
/*---------------------------------------------------------------------------------------------------------*/

module.exports = Context;