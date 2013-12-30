var _Math               = require('../math/cglMath'),
    Utils               = require('../utils/cglUtils'),
    Float32ArrayMutable = require('../utils/cglFloat32ArrayMutable'),
    Uint16ArrayMutable  = require('../utils/cglUint16ArrayMutable'),
    Value1Stack         = require('../utils/cglValue1Stack'),
    Value2Stack         = require('../utils/cglValue2Stack'),
    Value4Stack         = require('../utils/cglValue4Stack'),
    Mat33               = require('../math/cglMatrix');

var Program     = require('./cglProgram'),
    Shader      = require('./cglShader'),
    ShaderDict  = require('./cglShaderDict'),
    Framebuffer = require('./cglFramebuffer');

var Warning   = require('../common/cglWarning'),
    Extension = require('../common/cglExtension'),
    Common    = require('../common/cglCommon'),
    Default   = require('../common/cglDefault');

var ModelUtil     = require('../geom/cglModelUtil'),
    VertexUtil    = require('../geom/cglVertexUtil'),
    PrimitiveUtil = require('../geom/cglPrimitiveUtil');

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
        Extension.UintTypeAvailable = gl.getExtension('OES_element_index_uint');
        Extension.Initialized = true;
    }

    this._canvas2d  = document.createElement('canvas');
    this._context2d = this._canvas2d.getContext('2d');

    var glTexture2d          = gl.TEXTURE_2D,
        glRGBA               = gl.RGBA,
        glArrayBuffer        = gl.ARRAY_BUFFER,
        glElementArrayBuffer = gl.ELEMENT_ARRAY_BUFFER;

    // Setup 2d / post shader
    this._program      = new Program(this, Shader.vert,     Shader.frag);
    this._programPost  = new Program(this, Shader.vertPost, Shader.fragPost);
    this._stackProgram = new Value1Stack();

    this._bColorTemp   = new Array(4);
    this._bColorBg     = new Float32Array(4);
    this._stackColorBg = new Value4Stack();

    //this._bColorBg        = new Float32Array([1.0,1.0,1.0,1.0]);
    //this._bColorBgOld     = new Float32Array([-1.0,-1.0,-1.0,-1.0]);



    this._backgroundClear = Default.CLEAR_BACKGROUND;

    this._width_internal  = null;
    this._height_internal = null;
    this._width  = null;
    this._height = null;
    this._ssaaf = Common.SSAA_FACTOR;

    this._fboCanvas   = new Framebuffer(gl);
    this._fboPingPong = new Framebuffer(gl);
    this._fboRef      = new Value1Stack();

    this._setSize(parseInt(element.offsetWidth),parseInt(element.offsetHeight));

    // VBO / IBO

    this._vboShared = gl.createBuffer();
    this._iboShared = gl.createBuffer();
    this._vboSelected = null;
    this._iboSelected = null;

    gl.bindBuffer(glArrayBuffer,        this._vboShared);
    gl.bindBuffer(glElementArrayBuffer, this._iboShared);

    var program = this._program;
    gl.uniform1f(program[ShaderDict.uFlipY],1.0);


    // Create default blank texture and texture coords / use color & set alpha to 1.0
    this._currTint     = Default.TINT;
    this._blankTexture = gl.createTexture();

    gl.bindTexture(glTexture2d,this._blankTexture);
    gl.texImage2D( glTexture2d, 0, glRGBA, 1, 1, 0, glRGBA, gl.UNSIGNED_BYTE, new Uint8Array([1,1,1,1]));
    gl.uniform1f(program[ShaderDict.uUseTexture],0.0);

    // Create matrix stack and apply
    this._matrix      = Mat33.make();
    this._matrixTemp  = Mat33.make();
    this._matrixStack = [];
    this.setMatrixUniform();




    // Set draw modes
    this._modeEllipse = Context.CENTER;
    this._modeCircle  = Context.CENTER;
    this._modeRect    = Context.CORNER;

    this._texture     = false;
    this._textureCurr = null;

    this._textureOffset = false;

    this._textureOffsetX = this._textureOffsetY = 0;
    this._textureOffsetW = this._textureOffsetH = 0;

    /*------------------------------------------------------------------------------------------------------------*/
    //  Set vertices/color/texCoord temp buffers
    /*------------------------------------------------------------------------------------------------------------*/

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
    this._stackDetailEllipse = new Value1Stack();
    this._stackRadiusEllipse = new Value2Stack();
    this._stackOriginEllipse = new Value2Stack();

    // circle

    this._bVertexCircle     = new Float32Array(bVertexEllipseLen);  // circle vertices from detail
    this._bVertexCirlceS    = new Float32Array(bVertexEllipseLen);  // cirlce vertices from unit scaled
    this._bVertexCircleT    = new Float32Array(bVertexEllipseLen);  // circle vertices from scaled translated
    this._stackDetailCircle = new Value1Stack();
    this._stackRadiusCircle = new Value1Stack();
    this._stackOriginCircle = new Value2Stack();

    // circle set

    this._bVertexCircleSetS    = new Float32Array(bVertexEllipseLen); // circle set vertices from unit scaled
    this._bVertexCircleSetT    = new Float32Array(bVertexEllipseLen); // circle set vertices from scaled translated
    this._bVertexCircleSetM    = new Float32Array(bVertexEllipseLen); // cricle set vertices from scaled translated multiplied by matrix
    this._bIndexCircleSet      = new Uint16Array( bIndexEllipseLen);
    this._bTexCoordsCircleSet  = new Float32Array(bVertexEllipseLen);

    this._bVertexCircleSetArr   = new Float32ArrayMutable(bVertexEllipseLen * SET_ALLOCATE_SIZE,true);
    this._bColorCircleSetArr    = new Float32ArrayMutable(bColorEllipseLen  * SET_ALLOCATE_SIZE,true);
    this._bIndexCircleSetArr    = new Uint16ArrayMutable( bIndexEllipseLen  * SET_ALLOCATE_SIZE,true);
    this._bTexCoordCircleSetArr = new Float32ArrayMutable(bVertexEllipseLen * SET_ALLOCATE_SIZE,true);
    this._stackRadiusCircleSet  = new Value1Stack();
    this._stackOriginCircleSet  = new Value2Stack();


    //

    var bVertexRoundRectLen = ELLIPSE_DETAIL_MAX * 2 + 8;
    this._bVertexRoundRect  = new Float32Array(bVertexRoundRectLen); // round rect from corner detail scaled
    this._bVertexRoundRectT = new Float32Array(bVertexRoundRectLen); // round rect from scaled translated
    this._bCornerRoundRect  = new Float32Array(8);
    this._stackDetailRRect  = new Value1Stack();
    this._stackSizeRRect    = new Value2Stack();
    this._stackRadiusRRect  = new Value1Stack();
    this._stackOriginRRect  = new Value2Stack();

    /*
    this._prevDetailRRect   = -1;
    this._currDetailRRect   = Default.CORNER_DETAIL;
    this._prevWidthRRect    = -1;
    this._prevHeightRRect   = -1;
    this._prevPosRRect      = [null,null];
    */

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

    this._bVertexFbo  = new Float32Array(8);
    this._bColorFbo   = new Float32Array(4 * 4);
    this._bTexCoordFbo= new Float32Array([0,0,1,0,0,1,1,1]);

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

    this._currDetailBezier = Default.BEZIER_DETAIL;
    this._currDetailSpline = Default.SPLINE_DETAIL;
    this._currLineWidth    = Default.LINE_WIDTH;

    this._modeTexture = Context.CLAMP;

    // batch

    this._batchActive             = false;
    this._batchOffsetVertices     = 0;

    this._batchBVertex     = [];
    this._batchBColor = [];
    this._batchBIndex      = [];
    this._batchBTexCoord    = [];

    this._batchLimit = 0;

    this._batchTextureActive = false;

    this._stackDrawFunc = new Value1Stack();

    gl.enable(gl.BLEND);
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
    this._fboPingPong.setSize(iwidth,iheight);

    var program = this._program;

    this.useProgram(program);
    gl.uniform2f(program[ShaderDict.uResolution],iwidth,iheight);
    gl.viewport(0,0,iwidth,iheight);

    var colorBG = this._bColorBg;
    var i_255 = 1.0 / 255.0;

    gl.clearColor(colorBG[0] * i_255,
        colorBG[1] * i_255,
        colorBG[2] * i_255,1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //stackProgram.push(programPre);
};


Context.prototype.createImageData = function(){};
Context.prototype.getImageData = function(){};

/*------------------------------------------------------------------------------------------------------------*/
// Props
/*------------------------------------------------------------------------------------------------------------*/

Context.prototype._resetDrawProperties = function(){
    this.noStroke();
    this.noTexture();
    this.noFill();
    this.noTint();

    //this._stackProgram.pushEmpty();
    this._stackDrawFunc.pushEmpty();

    // ellipse

    this._stackDetailEllipse.pushEmpty();
    this._stackOriginEllipse.pushEmpty();
    this._stackRadiusEllipse.pushEmpty();
    this.setDetailEllipse(Default.ELLIPSE_DETAIL);

    // circle

    this._stackDetailCircle.pushEmpty();
    this._stackOriginCircle.pushEmpty();
    this._stackRadiusCircle.pushEmpty();
    this.setDetailCircle(Default.ELLIPSE_DETAIL);

    // round rect
    this._stackDetailRRect.pushEmpty();
    this._stackOriginRRect.pushEmpty();
    this._stackRadiusRRect.pushEmpty();
    this._stackSizeRRect.pushEmpty();
    this.setDetailCorner(Default.CORNER_DETAIL);



    this.setModeRect(Context.CORNER);
    this.setModeEllipse(Context.CENTER);
    this.setModeCircle(Context.CENTER);



    this.setLineWidth(Default.LINE_WIDTH);

    this.setDetailBezier(Default.BEZIER_DETAIL);
    this.setDetailCurve(Default.SPLINE_DETAIL);



    this.resetBlend();

    this.resetUVOffset();
    this.resetUVQuad();
    this.resetUVTriangle();
};


Context.prototype._beginDraw = function(){
    this._resetDrawProperties();

    this._context3d.uniform1f(this._program[ShaderDict.uFlipY],1.0);
    this.loadIdentity();

    this._fboCanvas.bind();
    this.clearColorBuffer();
    this.scale(this._ssaaf,this._ssaaf);
};


Context.prototype._endDraw = function(){
    var fboCanvas = this._fboCanvas;
    fboCanvas.unbind();

    this._context3d.uniform1f(this._program[ShaderDict.uFlipY],-1.0);
    this.loadIdentity();
    this.drawFbo(fboCanvas);
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

Context.prototype.setTextureWrap = function(mode){
    this._modeTexture = mode;
};

Context.prototype.getTextureWrap = function(){
    return this._modeTexture;
};


Context.prototype.setDetailEllipse = function(a){
    var stackDetailEllipse = this._stackDetailEllipse;
    if(stackDetailEllipse.peek() == a)return;
    var max = Common.ELLIPSE_DETAIL_MAX;
    stackDetailEllipse.push(a > max ? max : a);
};

Context.prototype.getDetailEllipse = function(){
    return this._stackDetailEllipse.peek();
};

Context.prototype.setDetailCircle = function(a){
    var stackDetailCircle = this._stackDetailCircle;
    if(stackDetailCircle.peek() == a)return;
    var max = Common.ELLIPSE_DETAIL_MAX;
    stackDetailCircle.push(a > max ? max : a);
};

Context.prototype.getDetailCircle = function(){
    return this._stackDetailCircle.peek();
};

Context.prototype.setDetailCorner = function(a){
    var stackDetailRRect = this._stackDetailRRect;
    if(stackDetailRRect.peek() == a)return;
    var max = Common.CORNER_DETAIL_MAX;
    stackDetailRRect.push(a > max ? max : a);
};

Context.prototype.getDetailCorner = function(){
    return this._stackDetailRRect.peek();
};





Context.prototype.setDetailBezier = function(a){
    var md = Common.BEZIER_DETAIL_MAX;
    this._currDetailBezier = a > md ? md : a;
};

Context.prototype.getDetailBezier = function(){return this._currDetailBezier;};

Context.prototype.setDetailCurve = function(a){
    var md = Common.SPLINE_DETAIL_MAX;
    this._currDetailSpline = a  > md ? md : a;
};

Context.prototype.getDetailCurve  = function(){return this._currDetailSpline;};




Context.prototype.setLineWidth = function(a){ this._currLineWidth = a;};
Context.prototype.getLineWidth = function() { return this._currLineWidth;};

Context.prototype.enableBlend  = function(){this._context3d.enable(this._context3d.BLEND);};
Context.prototype.disableBlend = function(){this._context3d.disable(this._context3d.BLEND);};


/*---------------------------------------------------------------------------------------------------------*/
// Shape fill/stroke/texture
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype.fill = function(){
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

Context.prototype.fill1i = function(k){
    var f = this._bColorFill = this._bColorFill4;
    f[0] = f[1] = f[2] = k/255;f[3] = 1.0;
    this._fill = true;
};

Context.prototype.fill2i = function(k,a){
    var f = this._bColorFill = this._bColorFill4;
    f[0] = f[1] = f[2] = k/255;f[3] = a;
    this._fill = true;
};

Context.prototype.fill3i = function(r,g,b){
    var f = this._bColorFill = this._bColorFill4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = 1.0;
    this._fill = true;
};

Context.prototype.fill4i = function(r,g,b,a){
    var f = this._bColorFill = this._bColorFill4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = a;
    this._fill = true;
};

Context.prototype.fill1f = function(k){
    var f = this._bColorFill = this._bColorFill4;
    f[0] = f[1] = f[2] = k;f[3] = 1.0;
    this._fill = true;
};

Context.prototype.fill2f = function(k,a){
    var f = this._bColorFill = this._bColorFill4;
    f[0] = f[1] = f[2] = k;f[3] = a;
    this._fill = true;
};

Context.prototype.fill3f = function(r,g,b){
    var f = this._bColorFill = this._bColorFill4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = 1.0;
    this._fill = true;
};

Context.prototype.fill4f = function(r,g,b,a){
    var f = this._bColorFill = this._bColorFill4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = a;
    this._fill = true;
};

Context.prototype.fillv =  function(a){
    this.filliv(a);
};

Context.prototype.filliv = function(a){
    var i = 0;
    var i_255 = 1.0 / 255.0;
    while(i < a.length){
        a[i  ] *= i_255; a[i+1] *= i_255;a[i+2] *= i_255;
        i+=4;
    }

    this._bColorFill = a;
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

Context.prototype.stroke1i = function(k){
    var f = this._bColorStroke = this._bColorStroke4;
    f[0] = f[1] = f[2] = k/255;f[3] = 1.0;
    this._stroke = true;
};

Context.prototype.stroke2i = function(k,a){
    var f = this._bColorStroke = this._bColorStroke4;
    f[0] = f[1] = f[2] = k/255;f[3] = a;
    this._stroke = true;
};

Context.prototype.stroke3i = function(r,g,b){
    var f = this._bColorStroke = this._bColorStroke4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = 1.0;
    this._stroke = true;
};

Context.prototype.stroke4i = function(r,g,b,a){
    var f = this._bColorStroke = this._bColorStroke4;
    f[0] = r/255;f[1] = g/255; f[2] = b/255;f[3] = a;
    this._stroke = true;
};

Context.prototype.stroke1f = function(k){
    var f = this._bColorStroke = this._bColorStroke4;
    f[0] = f[1] = f[2] = k;f[3] = 1.0;
    this._stroke = true;
};

Context.prototype.stroke2f = function(k,a){
    var f = this._bColorStroke = this._bColorStroke4;
    f[0] = f[1] = f[2] = k;f[3] = a;
    this._stroke = true;
};

Context.prototype.stroke3f = function(r,g,b){
    var f = this._bColorStroke = this._bColorStroke4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = 1.0;
    this._stroke = true;
};

Context.prototype.stroke4f = function(r,g,b,a){
    var f = this._bColorStroke = this._bColorStroke4;
    f[0] = r;f[1] = g; f[2] = b;f[3] = a;
    this._stroke = true;
};

Context.prototype.strokev = function(a){
    this._bColorStroke = a;
    this._stroke = true;
};

Context.prototype.strokeiv = function(a){
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

Context.prototype.strokefv = function(a){
    this._bColorStroke = a;
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

Context.prototype.bufferColors = function(color,buffer){
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
            throw Warning.UNEQUAL_ARR_LENGTH_COLOR_BUFFER;
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



Context.prototype.tint = function(a){
    this._currTint = Math.max(Common.TINT_MIN,Math.min(a,Common.TINT_MAX));
};

Context.prototype.noTint = function(){
    this._currTint = Common.TINT_MAX;
};


// Texture

Context.prototype._applyTexture = function(){
    var gl = this._context3d;
    var program = this._stackProgram.peek();
    gl.uniform1f(program[ShaderDict.uUseTexture],1.0);
    //gl.uniform1f(this._uniformLocationUseTexture,1.0);
    gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);
    gl.uniform1f(program[ShaderDict.uImage],0);
    //gl.uniform1f(this._uniformLocationImage,0);
};

Context.prototype._disableTexture = function(){
    var gl = this._context3d;
    var program = this._stackProgram.peek();
    gl.bindTexture(gl.TEXTURE_2D, this._blankTexture);
    gl.vertexAttribPointer(program[ShaderDict.aTexCoord],Common.SIZE_OF_T_COORD,gl.FLOAT,false,0,0);
    gl.uniform1f(program[ShaderDict.uUseTexture],0.0);
    this._texture = false;
};

Context.prototype.setUVOffset = function(offsetU,offsetV,textureWidth,textureHeight){
    this._textureOffsetX = offsetU;
    this._textureOffsetY = offsetV;
    this._textureOffsetW = textureWidth-1;
    this._textureOffsetH = textureHeight-1;

    this._textureOffset = true;
};

Context.prototype.resetUVOffset = function(){
    this._textureOffsetX = 0;
    this._textureOffsetY = 0;
    this._textureOffsetW = 1;
    this._textureOffsetH = 1;

    this._textureOffset = false;
};

Context.prototype.setUVQuad = function(u0,v0,u1,v1,u2,v2,u3,v3){
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

Context.prototype.resetUVQuad = function(){
    Utils.setArr(this._bTexCoordsQuad,this._bTexCoordsQuadDefault);
};

Context.prototype.setUVTriangle = function(u0,v0,u1,v1,u2,v2){
    var t = this._bTexCoordsTriangle;

    t[0] = u0;
    t[1] = v0;
    t[2] = u1;
    t[3] = v1;
    t[4] = u2;
    t[5] = v2;
};

Context.prototype.resetUVTriangle = function(){
    Utils.setArr(this._bTexCoordsTriangle,this._bTexCoordsTriangleDefault);
};

Context.prototype.texture = function(img){
    this._bindTexture(img._t);
};

Context.prototype._bindTexture = function(tex){
    this._textureCurr = tex;
    var gl = this._context3d;
    gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);
    this._texture = true;
};


Context.prototype.noTexture = function(){
    this._disableTexture();
    this._texture = false;
};


Context.prototype.blend = function(src,dest){
    this._context3d.blendFunc(src,dest);
};


Context.prototype.resetBlend = function(){
    var gl = this._context3d;
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
};


Context.prototype.backgroundfv = function(){
    var col  = this._bColorTemp;
    col[3] = 1.0;

    switch (arguments.length){
        case 0: col[0]=col[1]=col[2]=0.0;break;
        case 1: col[0]=col[1]=col[2]=arguments[0];break;
        case 2: col[0]=col[1]=col[2]=arguments[0];col[3]=arguments[1];break;
        case 3: col[0]=arguments[0];col[1]=arguments[1];col[2]=arguments[2];break;
        case 4: col[0]=arguments[0];col[1]=arguments[1];col[2]=arguments[2];col[3]=arguments[3];break;
    }

    this._backgroundClear = (col[3] == 1.0);
    this._stackColorBg.push(this._bColorTemp);
};

Context.prototype.backgroundiv = function(){
    var col  = this._bColorTemp;
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
    this._stackColorBg.push(this._bColorTemp);
};

Context.prototype.drawFbo = function(fbo,width,height){
    var gl      = this._context3d;
    var program = this._stackProgram.peek();

    width = typeof width === 'undefined' ? fbo._getWidth() : width;
    height= typeof height=== 'undefined' ? fbo._getHeight(): height;

    var bVertex   = this._bVertexFbo,
        bColor    = this._bColorFbo,
        bTexCoord = this._bTexCoordFbo;

    bVertex[0] = bVertex[1] = bVertex[3] = bVertex[4] =0;
    bVertex[2] = bVertex[6] = width;
    bVertex[5] = bVertex[7] = height;

    this.setMatrixUniform();

    this._bindTexture(fbo.getTexture().getGLTexture());
    //fbo.getTexture().bind();
    this.__fillBufferTexture(bVertex,bColor,bTexCoord);

    gl.uniform1f(program[ShaderDict.uUseTexture],1.0);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

    gl.uniform1f(program[ShaderDict.uUseTexture],0.0);
    //fbo.getTexture().unbind();
    this._bindTexture(this._blankTexture);
};


Context.prototype.clearColorBuffer = function(){
    var gl = this._context3d;

    var stackColorBg    = this._stackColorBg;
    var stackColorBgTop = stackColorBg.peek();
    var color = this._bColorBg;
        color[0] = stackColorBgTop[0];
        color[1] = stackColorBgTop[1];
        color[2] = stackColorBgTop[2];
        color[3] = stackColorBgTop[3];

    var i_255 = 1.0 / 255.0;

    if(this._backgroundClear){
        gl.clearColor(color[0],color[1],color[2],1.0);
        gl.clear(gl.COLOR_BUFFER_BIT  );
    }
    else{
        if(!stackColorBg.isEqual()){
            var c0 = color[0] * i_255,
                c1 = color[1] * i_255,
                c2 = color[2] * i_255;

            gl.clearColor(c0,c1,c2,1.0);
            gl.clear(gl.COLOR_BUFFER_BIT );

            stackColorBg.push(stackColorBg.peek());
        }

        this.fill(color[0],color[1],color[2],color[3]);
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

    this._stackDrawFunc.push(this.quad);
};


Context.prototype.rect = function(x,y,width,height){
    var cm = this._modeRect == Context.CENTER,
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

    this._stackDrawFunc.push(this.rect);
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

    var bVertex  = this._bVertexRoundRect,
        bVertexT = this._bVertexRoundRectT;
    var bIndex   = this._bIndexRoundRect;
    var bCorner  = this._bCornerRoundRect;

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
        PrimitiveUtil.getVerticesRoundRect(bCorner,radius,detail,bVertex);
    }

    if(radiusDiffers || detailDiffers){
        PrimitiveUtil.getIndicesRoundRect(bCorner,radius,detail,bIndex);
    }

    if(originDiffers){
        VertexUtil.translate(bVertex,originX,originY,bVertexT);
    }

    vertices = bVertexT;
    indices  = bIndex;

    var indicesLength = ((detail * 2 + 2) * 2 + 2) * 3;
    var gl = this._context3d;

    if(this._fill && !this._texture){
        colors = this.bufferColors(this._bColorFill4,this._bColorRoundRect);
        if(this._batchActive){

        }
        else{
            this.bufferArrays(vertices,colors,null,gl.DYNAMIC_DRAW);
            this.setMatrixUniform();
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.DYNAMIC_DRAW);
            gl.drawElements(gl.TRIANGLES, indicesLength,gl.UNSIGNED_SHORT,0);

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

    stackDetail.push(detail);
    this._stackDrawFunc.push(this.roundRect);
};


Context.prototype.ellipse = function(x,y,radiusX,radiusY){
    if(!this._fill && !this._stroke && !this._texture)return;
    var gl = this._context3d;

    var modeOrigin  = this._modeEllipse;
    var stackOrigin = this._stackOriginEllipse,
        stackRadius = this._stackRadiusEllipse,
        stackDetail = this._stackDetailEllipse;

    var originX = modeOrigin == 0 ? x : x + radiusX,
        originY = modeOrigin == 0 ? y : y + radiusY;

    stackRadius.push(radiusX,radiusY);
    stackOrigin.push(originX,originY);

    var originDiffers = !stackOrigin.isEqual(),
        radiusDiffers = !stackRadius.isEqual(),
        detailDiffers = !stackDetail.isEqual();

    var detail = stackDetail.peek();
    var length = detail * 2;

    var vertices,
        colors;

    var bVertex  = this._bVertexEllipse,
        bVertexS = this._bVertexEllipseS,
        bVertexT = this._bVertexEllipseT;

    if(detailDiffers){
        PrimitiveUtil.getVerticesCircle(detail,bVertex);
    }

    if(detailDiffers || radiusDiffers){
        VertexUtil.scale(bVertex,radiusX,radiusY,bVertexS);
    }

    if(!detailDiffers && !radiusDiffers && !originDiffers){
        vertices = bVertexT;
    } else {
        vertices = VertexUtil.translate(bVertexS,originX,originY,bVertexT);
    }

    /*
    console.log('detail: ' + stackDetailChanged  + '\n' +
                'radius: ' + stackRadiusChanged  + '\n' +
                'origin: ' + stackOriginChanged);
    */

    this.setMatrixUniform();

    if(this._fill && !this._texture){
        colors = this.bufferColors(this._bColorFill,this._bColorEllipse);

        this.bufferArrays(vertices,colors);
        gl.drawArrays(gl.TRIANGLE_FAN,0,detail);
    }

    if(this._texture){
        colors = this.bufferColors(this._bColorFill,this._bColorEllipse);
        var texCoords = this._bTexCoordsEllipse;

        if(detailDiffers || this._textureOffset){
            PrimitiveUtil.getTexCoordsCircle(detail,
                this._textureOffsetX,this._textureOffsetY,
                this._textureOffsetW,this._textureOffsetH,
                texCoords);
        }

        this.__fillBufferTexture(vertices,colors,texCoords);
        gl.drawArrays(gl.TRIANGLE_FAN,0,detail);
    }

    if(this._stroke){
        this._polyline(vertices,length,true);
    }

    stackDetail.push(stackDetail.peek());
    this._stackDrawFunc.push(this.ellipse);
};



Context.prototype.circle = function(x,y,radius){
    if(!this._fill && !this._stroke && !this._texture)return;
    var gl = this._context3d;

    var modeOrigin  = this._modeCircle;
    var stackOrigin = this._stackOriginCircle,
        stackRadius = this._stackRadiusCircle,
        stackDetail = this._stackDetailCircle;

    var originX = modeOrigin == 0 ? x : x + radius,
        originY = modeOrigin == 0 ? y : y + radius;

    stackOrigin.push(originX,originY);
    stackRadius.push(radius);

    var originDiffers = !stackOrigin.isEqual(),
        radiusDiffers = !stackRadius.isEqual(),
        detailDiffers = !stackDetail.isEqual();

    var detail = stackDetail.peek();
    var length = detail * 2;

    var vertices,
        colors;

    var bVertex  = this._bVertexCircle,
        bVertexS = this._bVertexCirlceS,
        bVertexT = this._bVertexCircleT;

    if(detailDiffers){
        PrimitiveUtil.getVerticesCircle(detail,bVertex);
    }

    if(detailDiffers || radiusDiffers){
        VertexUtil.scale(bVertex,radius,radius,bVertexS);
    }

    if(originDiffers){
        vertices = VertexUtil.translate(bVertexS,originX,originY,bVertexT);
    } else {
        vertices = bVertexT;
    }

    /*
     console.log('detail: ' + stackDetailChanged  + '\n' +
                 'radius: ' + stackRadiusChanged  + '\n' +
                 'origin: ' + stackOriginChanged);
     */

    this.setMatrixUniform();

    if(this._fill && !this._texture){
        colors = this.bufferColors(this._bColorFill,this._bColorCircle);

        this.bufferArrays(vertices,colors);
        gl.drawArrays(gl.TRIANGLE_FAN,0,detail);
    }

    if(this._texture){
        colors = this.bufferColors(this._bColorFill,this._bColorCircle);
        var texCoords = this._bTexCoordsEllipse;

        if(detailDiffers || this._textureOffset){
            PrimitiveUtil.getTexCoordsCircle(detail,
                this._textureOffsetX,this._textureOffsetY,
                this._textureOffsetW,this._textureOffsetH,
                texCoords);
        }

        this.__fillBufferTexture(vertices,colors,texCoords);
        gl.drawArrays(gl.TRIANGLE_FAN,0,detail);
    }

    if(this._stroke){
        this._polyline(vertices,length,true);
    }


    stackDetail.push(stackDetail.peek());
    this._stackDrawFunc.push(this.ellipse);
};


Context.prototype.circleSet = function(positions,radii){
    if(!this._fill && !this._stroke && !this._texture)return;
    if(positions.length == 0 || radii.length == 0 || positions.length * 0.5 != radii.length)return;
    var gl = this._context3d;

    var modeOrigin  = this._modeCircle;
    var stackOrigin = this._stackOriginCircleSet,
        stackRadius = this._stackRadiusCircleSet,
        stackDetail = this._stackDetailCircle;

    stackRadius.pushEmpty();
    stackOrigin.pushEmpty();

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

    var stackDetailChanged = !stackDetail.isEqual(),
        stackRadiusChanged,
        stackOriginChanged;

    var num = positions.length * 0.5;
    var detail = stackDetail.peek(),
        length = detail * 2;

    if(stackDetailChanged){
        PrimitiveUtil.getVerticesCircle(detail,bVertex);
        bIndex = this._bIndexCircleSet = new Uint16Array(ModelUtil.getFaceIndicesFan(length));
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

        stackOrigin.push(originX,originY);
        stackRadius.push(radius);

        stackOriginChanged = !stackOrigin.isEqual();
        stackRadiusChanged = !stackRadius.isEqual();
        /*
         if(stackRadiusChanged){
         vertices = this._scaleVertices(bVertex,radius,radius,bVertexS);
         } else {
         vertices = bVertexS;
         }

         if(stackOriginChanged){
         vertices = this._translateVertices(bVertex,originX,originY,bVertexT);
         } else {
         vertices = bVertexT
         }
         */

        VertexUtil.scale(bVertex,radius,radius,bVertexS);
        VertexUtil.translate(bVertexS,originX,originY,bVertexT);

        Mat33.applyVecfv(bVertexT,matrix,bVertexM);

        bVertexArr.putfv(bVertexM,length);
        bIndexArr.putiv(bIndex, detail, num);
        bColorArr.put4f(r,g,b,a);












    }


    console.log(detail);
    console.log(bVertexArr);
    console.log(bIndexArr);
    console.log(bColorArr);



    stackDetail.push(stackDetail.peek());
    this._stackDrawFunc.push(this.circleSet);
};


Context.prototype.arc = function(centerX,centerY,radiusX,radiusY,startAngle,stopAngle,innerRadiusX,innerRadiusY){
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
            this._batchPush(v,ModelUtil.getFaceIndicesLinearCW(v,l), c,null,l);
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

    this._stackDrawFunc.push(this.arc);
};

/**
 * Draws a line.
 * @method line
 */

Context.prototype.line = function(){
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

    this._stackDrawFunc.push(this.line);
};

Context.prototype.lineSet = function(lines,strokeColors,lineWidths)
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

    this._stackDrawFunc.push(this.lineSet);
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

Context.prototype.bezier = function(x0,y0,x1,y1,x2,y2,x3,y3){
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
    this._stackDrawFunc.push(this.bezier);
};

Context.prototype.bezierPoint = function(d)
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


Context.prototype.bezierTangentAngle = function(d){
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

Context.prototype.curve = function(points){
    var d = this._currDetailSpline,
        d_2 = d - 2;

    var i = 0, j,t;

    var vertices = this._tempCurveVertices = [];
    var pl = points.length;
    var ni;

    var catmullrom = _Math.catmullrom;

    while(i < pl-2){
        j = 0;
        while(j < d){
            t  = j / d_2;
            ni = i+1;

            vertices.push(catmullrom(points[Math.max(0,i-2)],
                points[i],
                points[Math.min(i+2,pl-2)],
                points[Math.min(i+4,pl-2)],
                t),
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


            var program = this._stackProgram.peek();

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
    this.bufferArrays(v,c);
    this._context3d.drawArrays(this._context3d.POINTS,0,1);

    this._stackDrawFunc.push(this.point);
};


Context.prototype.pointSet = function(vertexArrOrFloat32Arr){
    if(!this._fill)return;
    var gl  = this._context3d;

    this.setMatrixUniform();
    this.bufferArrays(Utils.safeFloat32Array(vertexArrOrFloat32Arr),
        this.bufferColors(this._bColorFill,new Float32Array(vertexArrOrFloat32Arr.length*2)));
    gl.drawArrays(gl.POINTS,0,vertexArrOrFloat32Arr.length*0.5);

    this._stackDrawFunc.push(this.pointSet);
};

Context.prototype._polyline = function(joints,length,loop){
    if(!this._stroke || this._currLineWidth <= 0.0)return;

    var color    = this._bColorStroke,
        colorLen = color.length;

    if(colorLen!= 4 && colorLen!=8){
        throw ("Color array length not valid.");
    }

    loop = Boolean(loop);

    var pvcol = color.length != 4;

    var lineWidth = this._currLineWidth;


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
        var colIArr = Color.colorvLerped(color,new Array(jointNum*4));
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
        var program = this._stackProgram.peek();

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



Context.prototype.drawArrays = function(verticesArrOrFloat32Arr,
                                         colorArrOrFloat32Arr,
                                         mode){
    if(!this._fill)return;

    var vertices = Utils.safeFloat32Array(verticesArrOrFloat32Arr),
        colors   = this.bufferColors((colorArrOrFloat32Arr || this._bColorFill4),
            new Float32Array(verticesArrOrFloat32Arr.length * 2));

    var gl  = this._context3d;

    if(this._batchActive){
        this._batchPush(vertices,
            mode == 5 ? ModelUtil.getFaceIndicesLinearCW(vertices) : ModelUtil.getFaceIndicesFan(vertices.length),
            colors,null);

    } else {
        this.bufferArrays(vertices,colors,null);
        gl.drawArrays(mode,0,vertices.length*0.5);
    }

    this._stackDrawFunc.push(this.drawArrays);
};



Context.prototype.drawElements = function(vertices,indices,colors){
    if(!this._fill)return;

    vertices = Utils.safeFloat32Array(vertices);
    indices  = indices ?
        Utils.safeUint16Array(indices) :
        new Uint16Array(ModelUtil.getFaceIndicesLinearCW(vertices));

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

    this._stackDrawFunc.push(this.drawElements);
};

/**
 * @method beginBatch
 */

Context.prototype.beginBatch = function()
{
    this._batchActive = true;

    this._batchBVertex     = [];
    this._batchBIndex      = [];
    this._batchBColor = [];
    this._batchBTexCoord    = [];

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

    var program = this._stackProgram.peek();

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

    this._stackDrawFunc.push(this.drawBatch);
};

Context.prototype.endBatch = function(){
    this._batchActive = false;
};

Context.prototype.getBatch = function(out){

    if(out){
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

Context.prototype.beginBatchToTexture = function(){
    this._batchTextureActive = true;
};

Context.prototype.endBatchToTexture = function(){
    this._batchTextureActive = false;

};




/*---------------------------------------------------------------------------------------------------------*/
// Image & Texture
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype.image = function(image, x, y, width, height)
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

    this._stackDrawFunc.push(this.image);
};

/**
 * @method getImagePixel
 * @param img
 * @return {*}
 */

Context.prototype.getImagePixel = function(img)
{
    this._context2DSetImage(img);
    return this._context2DGetPixelData();
};

/*---------------------------------------------------------------------------------------------------------*/
// Program
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype.useProgram = function(program){
    var stackProgram = this._stackProgram;
    if(program == stackProgram.peek())return;
    this._context3d.useProgram(program.program);
    program.enableVertexAttribArrays();
    stackProgram.push(program);
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
        throw Context.__Warning.INVALID_STACK_POP;
    }

    this._matrix = stack.pop();
    return this._matrix;
};


/*---------------------------------------------------------------------------------------------------------*/
// Helper
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype.bufferArrays = function(vertexFloat32Array,colorFloat32Array,texCoord32Array,glDrawMode){
    var ta = texCoord32Array ? true : false;

    var program    = this._stackProgram.peek();

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

Context.prototype.__fillBufferTexture = function(vertexArray,colorArray,coordArray)
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

    var program = this._stackProgram.peek();

    gl.vertexAttribPointer(program[ShaderDict.aVertPosition], Common.SIZE_OF_VERTEX, glFloat,false,0,offSetV);
    gl.vertexAttribPointer(program[ShaderDict.aVertColor],    Common.SIZE_OF_COLOR,  glFloat,false,0,offSetC);
    gl.vertexAttribPointer(program[ShaderDict.aTexCoord],     Common.SIZE_OF_T_COORD,glFloat,false,0,offSetT);

    gl.uniform1f(program[ShaderDict.uUseTexture],this._currTint);
    gl.bindTexture(gl.TEXTURE_2D,this._textureCurr);


};

Context.prototype.getScreenCoord = function(x,y){
    x = x || 0;
    y = y || 0;

    var m = this._matrix;
    var s = this._tempScreenCoords;

    s[0] = m[ 0] * x + m[ 3] * y + m[6];
    s[1] = m[ 1] * x + m[ 4] * y + m[7];

    return s
};

Context.prototype._getContext3d = function(){return this._context3d;};
Context.prototype._getContext2d = function(){return this._context2d;};

Context.prototype._getWidth  = function(){return this._width;};
Context.prototype._getHeight = function(){return this._height;};

/*---------------------------------------------------------------------------------------------------------*/
//
/*---------------------------------------------------------------------------------------------------------*/

Context.CENTER = 0;
Context.CORNER = 1;
Context.WRAP   = 2;
Context.CLAMP  = 3;
Context.REPEAT = 4;

Context.FUNC_ADD = "";
Context.FUNC_SUBSTRACT = "";
Context.FUNC_REVERSER_SUBSTRACT = "";

Context.ZERO = "";
Context.ONE = "";

Context.SRC_ALPHA = 770;
Context.SRC_COLOR = 768;

Context.ONE_MINUS_SRC_ALPHA = 771;
Context.ONE_MINUS_SRC_COLOR = 769;

Context.TRIANGLE_STRIP = 5;
Context.TRIANGLE_FAN   = 6;

Context.TOP    = "top";
Context.MIDDLE = "middle";
Context.BOTTOM = "bottom";

Context.THIN   = "thin";
Context.REGULAR= "normal";
Context.BOLD   = "bold";

/*---------------------------------------------------------------------------------------------------------*/
// Exports
/*---------------------------------------------------------------------------------------------------------*/

module.exports = Context;