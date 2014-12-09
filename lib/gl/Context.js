var _Math               = require('../math/Math'),
    Util                = require('../util/Util'),
    DataType            = require('../util/DataType'),
    Float32ArrayMutable = require('../util/data/Float32ArrayMutable'),
    Uint16ArrayMutable  = require('../util/data/Uint16ArrayMutable'),
    Uint32ArrayMutable  = require('../util/data/Uint32ArrayMutable'),
    Value1Stack         = require('../util/data/Value1Stack'),
    Value2Stack         = require('../util/data/Value2Stack'),
    Value4Stack         = require('../util/data/Value4Stack'),
    ValueArrStack       = require('../util/data/ValueArrStack'),
    Mat33               = require('../math/Matrix');

var gl_ = require('./gl');

var Model = require('./Model');


var glExtension = require('./glExtension'),
    Program     = require('./Program'),
    Shader      = require('./Shader'),
    Framebuffer = require('./Fbo'),
    Texture     = require('./Texture');

var Vbo = require('./Vbo');

var Warning   = require('../common/Warning'),
    Common    = require('../common/Common');

var ModelUtil    = require('../geom/ModelUtil'),
    VertexUtil   = require('../geom/VertexUtil'),
    GeomUtil     = require('../geom/GeomUtil'),
    BezierUtil   = require('../geom/BezierUtil');

var Color  = require('../style/Color'),
    _Image = require('../image/Image');

/*------------------------------------------------------------------------------------------------------------*/
// Utilities
/*------------------------------------------------------------------------------------------------------------*/

var UintArray; // Uint8Array || Uint16Array on extension available
var UNSIGNED_DATA_TYPE, //UNSIGNED_SHORT || UNSIGNED_INT on extension available
    UNSIGNED_DATA_BYTES;

var state = require('../util/State');
var state1Create = state.state1Create, state1Push = state.state1Push, state1Equal = state.state1Equal,
    state1Front = state.state1Front, state1Back = state.state1Back,
    state2Create = state.state2Create, state2Push = state.state2Push, state2Push2 = state.state2Push2,
    state2Equal = state.state2Equal, state2Front = state.state1Front, state2Back = state.state1Back,
    state4Create = state.state4Create, state4Push = state.state4Push, state4Push4 = state.state4Push4,
    state4Equal = state.state4Equal, state4Front = state.state1Front, state4Back = state.state1Back,
    stateArrCreate = state.state1Create, stateArrPush = state.stateArrPush, stateArrEqual = state.stateArrEqual,
    stateArrFront  = state.state1Front, stateArrBack = state.state1Back;


var _255 = 1.0 / 255.0;


function isArray(obj){
    return typeof obj === 'object' &&
           typeof obj.length === 'number' &&
           typeof obj.splice === 'function';
}

/*------------------------------------------------------------------------------------------------------------*/
// Context
/*------------------------------------------------------------------------------------------------------------*/

var Default = {
    CLEAR_BACKGROUND : true,
    TINT:1.0,
    ELLIPSE_MODE : 0,
    RECT_MODE :    1,
    LINE_WIDTH:1,
    CORNER_DETAIL : 5,
    ELLIPSE_DETAIL: 10,
    BEZIER_DETAIL:  30,
    SPLINE_DETAIL:  10,
    BEZIER_DETAIL_MAX : 50,
    ELLIPSE_DETAIL_MAX : 50,
    SPLINE_DETAIL_MAX : 50,
    LINE_ROUND_CAP_DETAIL_MAX :20,
    LINE_ROUND_CAP_DETAIL_MIN :4,
    CORNER_DETAIL_MAX : 10,
    TINT_MAX : 1.0,
    TINT_MIN : 0.0,
    POINT_SIZE : 5.0
};




var ELLIPSE_DETAIL_MAX = 50;


function Context(element,canvas3d,canvas2d){
    {
        this._canvas3d = canvas3d;
        this._canvas2d = canvas2d;

        var options = {
            alpha:false,
            depth:false,
            stencil:false,
            antialias: false,
            premultipliedAlpha:false,
            preserveDrawingBuffer:true };

        var gl = this._gl = canvas3d.getContext('webkit-3d',options) ||
                            canvas3d.getContext('webgl',options) ||
                            canvas3d.getContext('experimental-webgl',options);
        if(!gl){
            throw new Error(Warning.WEBGL_NOT_AVAILABLE);
        } //hmm
        canvas3d.tabIndex = '1';
        gl_.set(gl);

        for(var e in glExtension){
            glExtension[e] = gl.getExtension(glExtension[e]);
        }

        if(glExtension.OES_ELEMENT_INDEX_UINT){
            UintArray = Uint32Array;
            UNSIGNED_DATA_TYPE = gl.UNSIGNED_INT;
            UNSIGNED_DATA_BYTES  = 4;
        } else {
            UintArray = Uint16Array;
            UNSIGNED_DATA_TYPE = gl.UNSIGNED_SHORT;
            UNSIGNED_DATA_BYTES = 2;
        }

        this._canvas2d  = document.createElement('canvas');
        this._context2d = this._canvas2d.getContext('2d');

        gl.enable(gl.DEPTH_TEST);
    }

    /*---------------------------------------------------------------------------------------------------------*/
    // Program
    /*---------------------------------------------------------------------------------------------------------*/

    {
        var program = this._program = new Program(require('./Shader'));

        program.bind();
        program.uniform1f('uPointSize',Default.POINT_SIZE);
        program.uniform1f('uUseTexture',0.0);
    }

    /*---------------------------------------------------------------------------------------------------------*/
    // canvas initial state
    /*---------------------------------------------------------------------------------------------------------*/

    {
        this._width_internal  = null;
        this._height_internal = null;
        this._width  = null;
        this._height = null;
        this._ssaaf  = Common.SSAA_FACTOR;

        this._clearBackground = Default.CLEAR_BACKGROUND;
        this._bColorTemp     = new Array(4);
        this._bColorBg       = new Float32Array(4);
        this._stackColorBg   = new Value4Stack();
        this._stateColorBg   = state4Create();

        this._setSize(parseInt(element.offsetWidth),parseInt(element.offsetHeight));
    }

    /*---------------------------------------------------------------------------------------------------------*/
    // Transformation
    /*---------------------------------------------------------------------------------------------------------*/

    {
        this._matrix      = Mat33.make();
        this._matrixTemp  = Mat33.make();
        this._matrixStack = [];
    }

    /*---------------------------------------------------------------------------------------------------------*/
    // Fills, buffers, cached values
    /*---------------------------------------------------------------------------------------------------------*/

    {
        this._fill        = true;
        this._bColorFill4 = [1.0,1.0,1.0,1.0];
        this._bColorFill  = this._bColorFill4;

        this._stroke             = true;
        this._bColorStroke4      = [1.0,1.0,1.0,1.0];
        this._bColorStroke       = this._bColorStroke4;
        this._stackColorStroke   = state1Create();
        this._bColorStroke4Temp  = new Array(4);
        this._bColorStrokeIntrpl = [];
    }

    /*---------------------------------------------------------------------------------------------------------*/
    // Primitives
    /*---------------------------------------------------------------------------------------------------------*/

    // Model data utils

    var numPoints;
    var bufferDataLength;
    var model;

    function addBufferData(length){
        var data =  {
            data   : new Float32Array(length),
            offset : bufferDataLength,
            dirty  : true
        };
        bufferDataLength += length * 4;
        return data;
    }

    //Point
    {
        numPoints = 1;  bufferDataLength = 0;

        this._pointSize = Default.POINT_SIZE;
        this._stateOriginPoint = state2Create();
        this._stateColorPoint  = state4Create();

        this._point = {
            vertex : {
                data : {
                    vertex : addBufferData(numPoints * 2),
                    color  : addBufferData(numPoints * 4)
                },
                buffer : new Vbo(gl.ARRAY_BUFFER,bufferDataLength,gl.DYNAMIC_DRAW)
            }
        }
    }

    //Points
    {
        numPoints = 0; bufferDataLength = 0;

        this._stateColorPoints = state4Create();

        this._points = {
            vertex : {
                data : {
                    vertex : addBufferData(0),
                    color  : addBufferData(0)
                },
                buffer : new Vbo(gl.ARRAY_BUFFER,bufferDataLength,gl.DYNAMIC_DRAW)
            }
        }
    }

    // Circle
    {
        numPoints = ELLIPSE_DETAIL_MAX; bufferDataLength = 0;

        this._modeCircle = Context.CENTER;
        this._stateOriginCircle = state2Create();
        this._stateRadiusCircle = state1Create();
        this._stateDetailCircle = state1Create();
        this._stateColorCircle  = state4Create();

        this._circle = {
            vertex : {
                data : {
                    vertex   : addBufferData(numPoints * 2),
                    vertexS  : addBufferData(numPoints * 2),
                    vertexT  : addBufferData(numPoints * 2),
                    color    : addBufferData(numPoints * 4),
                    texcoord : addBufferData(numPoints * 2)
                },
                buffer : new Vbo(gl.ARRAY_BUFFER,bufferDataLength,gl.DYNAMIC_DRAW)
            }
        };

        var vertexData = this._circle.vertex.data;
        var lengthTotal = vertexData.vertex.data.length;

        this.circleDetail(Default.ELLIPSE_DETAIL);
    }

    //Polyline
    {
        numPoints = Default.LINE_ROUND_CAP_DETAIL_MAX * 2; bufferDataLength = 0;

        this._stateWeightStroke = state1Create();
        this._stateColorStroke  = stateArrCreate();
        this._stateDetailStroke = state1Create(numPoints);

        this._modeStrokeCap = Context.ROUND;

        //all line components edges + caps
        model = this._lineComponents = {};
        //Round line cap unit
        model.vertexCap = GeomUtil.genVerticesCircle(numPoints / 2, new Float32Array(numPoints));
        //Round line cap scaled
        model.vertexCapS = new Float32Array(numPoints);
        //Round line cap translated
        model.vertexCapT = new Float32Array(numPoints);
        //color cap
        model.colorCap = new Float32Array(model.vertexCap.length * 2);
        //rectangle edge of the line
        model.vertexEdge = new Float32Array(4 * 2);
        //indices for cap scheme
        model.indexCap   = ModelUtil.genFaceIndicesFan(numPoints);
        //indices for cap translated
        model.indexCapT  = new Array((numPoints / 2 - 2) * 3);
        //indices for edge scheme
        model.indexEdge  = new UintArray([0,1,2,1,2,3]);
        //indices for edge translated
        model.indexEdgeT = new UintArray(6);
        //color edge
        model.colorEdge = new Float32Array(16);

        this._linePointsTemp = new Array(4);

        //a single line
        //this._line = {
        //    stateDetail : state1Create(),
        //    stateWeight : state1Create(),
        //    stateColor  : stateArrCreate(),
        //    stateLength : state1Create(),
        //    offsetEdges : 0,
        //    numIndexOffsetEdges  : 0,
        //    lenVertexOffsetEdges : 0,
        //    offsetIndexEdges  : 0,
        //    vertex : {
        //        data : {
        //            vertex : new Float32Array(0),
        //            color  : new Float32Array(0)
        //        },
        //        buffer : new Vbo(gl.ARRAY_BUFFER,0,gl.DYNAMIC_DRAW)
        //    },
        //    index : {
        //        data : {
        //            index : new UintArray(0)
        //        },
        //        buffer : new Vbo(gl.ELEMENT_ARRAY_BUFFER,0,gl.DYNAMIC_DRAW)
        //    }
        //};

        function createPolylineModel(){
            var model = {};
            //current & previous detail
            model.stateDetail = state1Create();
            //current & previous weight
            model.stateWeight = state1Create();
            //current & previous color
            model.stateColor  = stateArrCreate();
            //current & previous length, fill
            model.stateLength = state1Create();
            //offsets
            model.offsetEdges  = 0;
            model.offsetIndexEdges = 0;
            //vertices caps & edges
            model.vertex = new Float32Array(0);
            //colors caps & edges
            model.color = new Float32Array(0);
            //vertex buffer vertices & colors caps & edges
            model.vbo = new Vbo(gl.ARRAY_BUFFER,0,gl.DYNAMIC_DRAW);
            //indices caps & edges
            model.index = new UintArray(0);
            //index buffer caps & edge
            model.ibo = new Vbo(gl.ELEMENT_ARRAY_BUFFER,0,gl.DYNAMIC_DRAW);
            return model;
        }


        //A single line
        this._line = createPolylineModel();

        //A set of lines
        this._lines = createPolylineModel();

        //Polyline for strokes
        this._linep = createPolylineModel();



        //
        //
        ////a set of lines
        //this._lines = {
        //    stateDetail : state1Create(),
        //    stateWeight : state1Create(),
        //    stateColor  : stateArrCreate(),
        //    stateLength : state1Create(),
        //    offsetEdges : 0,
        //    numIndexOffsetEdges  : 0,
        //    lenVertexOffsetEdges : 0,
        //    offsetIndexEdges  : 0,
        //    vertex : {
        //        data : {
        //            vertex : new Float32Array(0),
        //            color  : new Float32Array(0)
        //        },
        //        buffer : new Vbo(gl.ARRAY_BUFFER,0,gl.DYNAMIC_DRAW)
        //    },
        //    index : {
        //        data : {
        //            index : new UintArray(0)
        //        },
        //        buffer : new Vbo(gl.ELEMENT_ARRAY_BUFFER,0,gl.DYNAMIC_DRAW)
        //    }
        //};


        //polyline for strokes
        //this._linep = {
        //    stateDetail : state1Create(),
        //    stateWeight : state1Create(),
        //    stateColor  : stateArrCreate(),
        //    stateLength : state1Create(),
        //    offsetEdges : 0,
        //    numIndexOffsetEdges  : 0,
        //    lenVertexOffsetEdges : 0,
        //    offsetIndexEdges  : 0,
        //    vertex : {
        //        data : {
        //            //constructed line from components * points
        //            vertex : new Float32Array(0),
        //            color  : new Float32Array(0)
        //        },
        //        buffer : new Vbo(gl.ARRAY_BUFFER,0,gl.DYNAMIC_DRAW)
        //    },
        //    index : {
        //        data : {
        //            index : new UintArray(0)
        //        },
        //        buffer : new Vbo(gl.ELEMENT_ARRAY_BUFFER,0,gl.DYNAMIC_DRAW)
        //    }
        //};



        stateArrPush(this._stateColorStroke,[1,1,1,1]);
        this.strokeWeight(Default.LINE_WIDTH);
    }
}

/*---------------------------------------------------------------------------------------------------------*/
// Background
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype.background = function(){
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
    state4Push(this._stateColorBg,this._bColorTemp);
    //this._stackColorBg.push(this._bColorTemp);

};

Context.prototype.clearColorBuffer = function(){
    var gl = this._gl;
    var stateColor = this._stateColorBg,
        color      = state4Front(stateColor),
        buffer     = this._bColorBg;

    buffer[0] = color[0];
    buffer[1] = color[1];
    buffer[2] = color[2];
    buffer[3] = color[3];

    var i_255 = 1.0 / 255.0;

    //if(this._clearBackground){
    //    gl.clearColor(buffer[0],buffer[1],buffer[1],1.0);
    //    gl.clear(gl.COLOR_BUFFER_BIT);
    //} else {
    //
    //}
    gl.clearColor(buffer[0],buffer[1],buffer[1],1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
};

/*---------------------------------------------------------------------------------------------------------*/
// Draw loop states & handling
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype._setDrawPropertiesInitial = function(){
    var gl = this._gl;
    gl.enable(gl.BLEND);
    this._resetDrawProperties();
};

Context.prototype._resetDrawProperties = function(){
    var _fill    = this._fill,
        _stroke  = this._stroke,
        _texture = this._texture;

    if(!_fill && !_stroke && !_texture){
        return;
    }

    var gl = this._gl;
};

Context.prototype._preDraw = function(){


    this.clearColorBuffer();
    this.loadIdentity();
    this.scale(this._ssaaf,this._ssaaf);
};


/*---------------------------------------------------------------------------------------------------------*/
// Draw properties
/*---------------------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------------------*/
// Draw methods
/*---------------------------------------------------------------------------------------------------------*/

//Utilities

Context.prototype.bufferColors = function(color,buffer){
    var cl = color.length,
        bl = buffer.length;
    var i = 0;

    if(cl == 4){
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
    }

    return buffer;
};

Context.prototype._updateModelVbo = function(model){
    var vertex = model.vertex;
    var data   = vertex.data;

    var d, dirty = false;
    for(d in data){
        if(data[d].dirty){
            dirty = true;
            break;
        }
    }
    if(!dirty){
        return;
    }

    var vbo = vertex.buffer;
    var obj;
    for(d in data){
        obj = data[d];
        if(!obj.dirty){
            continue;
        }
        vbo.bufferSubData(obj.offset,obj.data);
        obj.dirty = false;
    }
};

Context.prototype._setAttribPointer = function(position,color,texcoord){
    var program = this._program;
    var glFLOAT = this._gl.FLOAT;

    program.vertexAttribPointer('aVertexPosition',2,glFLOAT,false,0,position);

    if(color != null && color !== undefined){
        program.vertexAttribPointer('aVertexColor',4,glFLOAT,false,0,color);
    }
    if(texcoord != null && texcoord !== undefined){
        program.vertexAttribPointer('aTexcoord',2,glFLOAT,false,0,texcoord);
    }
};

Context.prototype._enableAttribPosition = function(bool){
    bool ? this._program.enableVertexAttribArray('aVertexPosition') : this._program.disableVertexAttribArray('aVertexPosition');
};

Context.prototype._enableAttribColor = function(bool){
    bool ? this._program.enableVertexAttribArray('aVertexColor') : this._program.disableVertexAttribArray('aVertexColor');
};

Context.prototype._enableAttribTexcoord = function(bool){
    bool ? this._program.enableVertexAttribArray('aTexcoord') : this._program.disableVertexAttribArray('aTexcoord');
};

//models

/**
 * Sets the point size.
 * @param a
 */

Context.prototype.pointSize = function(a){
    this._program.uniform1f('uPointSize',a);
};

/**
 * Returns the current point size.
 * @returns {number|*}
 */

Context.prototype.getPointSize = function(){
    return this._pointSize
};

/**
 * Draws a point.
 * @param x
 * @param y
 */

Context.prototype.point = function(x,y){
    if(!this._fill){
        return;
    }
    var gl = this._gl;

    var model = this._point,
        modelVertex = model.vertex,
        modelVertexData = modelVertex.data,
        modelVertexBuffer = modelVertex.buffer;

    var dataVertex = modelVertexData.vertex,
        dataColor  = modelVertexData.color;

    var stateOrigin = this._stateOriginPoint,
        stateColor  = this._stateColorPoint;

    state2Push2(stateOrigin,x,y);

    if(!state2Equal(stateOrigin)){
        dataVertex.data[0] = x;
        dataVertex.data[1] = y;
        dataVertex.dirty = true;
    }

    var color = this._bColorFill4;
    state4Push(stateColor,color);

    if(!state4Equal(stateColor)){
        this.bufferColors(color,dataColor.data);
        dataColor.dirty = true;
    }

    modelVertexBuffer.bind();
    this._updateModelVbo(model);
    this._enableAttribTexcoord(false);
    this._setAttribPointer(dataVertex.offset,dataColor.offset);

    this.applyMatrixUniform();
    gl.drawArrays(gl.POINTS,0,1);

    this._enableAttribTexcoord(true);
    modelVertexBuffer.unbind();
};

/**
 * Draws a set of points.
 * @param points
 * @param [colors]
 */

Context.prototype.points = function(points){
    if(!this._fill){
        return;
    }
    var gl = this._gl;

    var model = this._points,
        modelVertex = model.vertex,
        modelVertexData = modelVertex.data,
        modelVertexBuffer = modelVertex.buffer;

    var dataVertex = modelVertexData.vertex,
        dataColor  = modelVertexData.color;

    var color = this._bColorFill4;

    modelVertexBuffer.bind();

    if(points.length > dataVertex.data.length){
        var len_ = points.length;
        dataVertex.data = (new Float32Array(len_  ));
        dataVertex.data.set(points);

        dataColor.data = (new Float32Array(len_*2));

        if(colors){
            dataColor.data.set(colors);
        } else {
            this.bufferColors(color,dataColor.data);
        }
        dataVertex.offset = 0;
        dataColor.offset  = dataVertex.data.byteLength;

        dataVertex.dirty = dataColor.dirty = true;
        modelVertexBuffer.bufferData(len_ * 4 + len_ * 2 * 4,gl.DYNAMIC_DRAW);

    } else {
        dataVertex.data.set(points);

        if(colors){
            dataColor.data.set(colors);
        } else {
            this.bufferColors(color,dataColor.data);
        }
        dataVertex.dirty = dataColor.dirty = true;
    }

    this._updateModelVbo(model);
    this._enableAttribTexcoord(false);
    this._setAttribPointer(dataVertex.offset,dataColor.offset);

    this.applyMatrixUniform();
    gl.drawArrays(gl.POINTS,0,points.length / 2);

    this._enableAttribTexcoord(true);
    modelVertexBuffer.unbind();
};

//Circle

/**
 * Sets the current circle detail.
 * @param a
 */

Context.prototype.circleDetail = function(a){
    var state = this._stateDetailCircle;
    if(state1Front(state) == a){
        return;
    }
    state1Push(state,Math.min(a,Common.ELLIPSE_DETAIL_MAX));
};

/**
 * Returns the current circle detail.
 * @returns {*}
 */

Context.prototype.getDetailCircle = function(){
    return state1Front(this._stateDetailCircle);
};

/**
 * Sets the current circle mode.
 * @param mode
 */

Context.prototype.circleMode = function(mode){
    this._modeCircle = mode;
};

/**
 * Returns the current circle mode.
 * @returns {number|*|Context._modeCircle}
 */

Context.prototype.getModeCircle = function(){
    return this._modeCircle;
};

/**
 * Draws a circle
 * @param {Number} x
 * @param {Number} y
 * @param {Number} radius
 */

Context.prototype.circle = function(x,y,radius){
    var _fill = this._fill, _stroke = this._stroke, _texture = this._texture;
    if(!_fill && !_stroke && !_texture){
        return;
    }
    if(!_stroke && radius == 0){
        return;
    }
    if(_fill && !_stroke && radius == 1 ){
        this.point(x,y);
        return;
    }

    var gl = this._gl;

    var mode        = this._modeCircle,
        stateOrigin = this._stateOriginCircle,
        stateRadius = this._stateRadiusCircle,
        stateDetail = this._stateDetailCircle,
        stateColor  = this._stateColorCircle;

    var color = this._bColorFill;

    var originX = x,
        originY = y;

    if(mode == Context.CENTER){
        originX += radius;
        originY += radius;
    }

    state2Push2(stateOrigin,originX,originY);
    state1Push( stateRadius,radius);
    state4Push( stateColor, color);

    var originDiffers = !state2Equal(stateOrigin),
        radiusDiffers = !state1Equal(stateRadius),
        detailDiffers = !state1Equal(stateDetail),
        colorDiffers  = !state4Equal(stateColor);

    var detail = state1Front(stateDetail),
        length = detail * 2;

    var model             = this._circle,
        modelVertex       = model.vertex,
        modelVertexData   = modelVertex.data,
        modelVertexBuffer = modelVertex.buffer;

    var dataVertex   = modelVertexData.vertex,
        dataVertexS  = modelVertexData.vertexS,
        dataVertexT  = modelVertexData.vertexT,
        dataColor    = modelVertexData.color,
        dataTexcoord = modelVertexData.texcoord;

    if(detailDiffers){ //update the geometry
        GeomUtil.genVerticesCircle(detail, dataVertex.data);
        dataVertex.dirty = true;
    }

    if(detailDiffers || radiusDiffers){ //rescale
        VertexUtil.scale(dataVertex.data,radius,radius,dataVertexS.data);
        dataVertexS.dirty = true;
    }

    if(detailDiffers || radiusDiffers || originDiffers){ // translate
        VertexUtil.translate(dataVertexS.data,originX,originY,dataVertexT.data);
        dataVertexT.dirty = true;
    }

    if(colorDiffers || detailDiffers){
        this.bufferColors(color,dataColor.data);
        dataColor.dirty = true;
    }

    modelVertexBuffer.bind();

    if(_fill && !_texture){
        this._updateModelVbo(model);
        this._enableAttribTexcoord(false);
        this._setAttribPointer(dataVertexT.offset,dataColor.offset);

        this.applyMatrixUniform();
        gl.drawArrays(gl.TRIANGLE_FAN,0,detail);

        this._enableAttribTexcoord(true);
    }

    modelVertexBuffer.unbind();

    state1Push(stateDetail,state1Front(stateDetail));
};

//Line

/**
 * Sets the weight used by lines and strokes.
 * @param a
 */

Context.prototype.strokeWeight = function(a){
    var state;

    state = this._stateWeightStroke;
    if(state1Front(state) != a){
        state1Push(state,Math.max(0,a));
    }

    state = this._line.stateWeight;
    if(state1Front(state) != a){
        state1Push(state,Math.max(0,a));
    }

    state = this._lines.stateWeight;
    if(state1Front(state) != a){
        state1Push(state,Math.max(0,a));
    }

    state = this._linep.stateWeight;
    if(state1Front(state) != a){
        state1Push(state,Math.max(0,a));
    }
};

/**
 * Return the current stroke weight.
 * @returns {*}
 */

Context.prototype.getStrokeWeight = function(){
    return state1Front(this._stateWeightStroke);
};

/**
 * Sets the cap used by lines and strokes.
 * @param cap
 */

Context.prototype.strokeCap = function(cap){
    this._modeStrokeCap = cap;
};

/**
 * Returns the current stroke cap.
 * @returns {number|*}
 */

Context.prototype.getStrokeCap = function(){
    return this._modeStrokeCap;
};

//shim
Context.prototype.strokeJoin = Context.prototype.strokeCap;
Context.prototype.getStrokeJoin = Context.prototype.getStrokeCap;

/**
 * Sets the current cap stroke cap detail.
 * @param a
 */

Context.prototype.strokeCapDetail = function(a){
    var state = this._stateDetailStroke;
    if(state1Front(state) == a){
        return;
    }
    state1Push(state,Math.max(0,a));
};

/**
 * Returns the current stroke detail.
 * @returns {*}
 */

Context.prototype.getStrokeDetail = function(){
    return state1Front(this._stateDetailStroke);
};

Context.prototype.line = function(x0,y0,x1,y1){
    if(!this._stroke){
        return;
    }
    var temp = this._linePointsTemp;
    temp[0] = x0;
    temp[1] = y0;
    temp[2] = x1;
    temp[3] = y1;

    this._polyline(this._line,temp);
};

Context.prototype.lines = function(points,loop){
    if(!this._stroke){
        return;
    }
    //TODO(hw):Process points with POLYLINE_SPLIT as merged data
    //for now just process seperated
    var i = -1, l = points.length;
    var model  = this._linep;
    var first = points[0];

    if(isArray(first)){
        var line;
        while(++i < l){
            line = points[i];
            this._polyline(model,line,line.length,loop);
        }
    } else {
        this._polyline(model,points,points.length,loop);
    }
};

/*---------------------------------------------------------------------------------------------------------*/
// Polyline
/*---------------------------------------------------------------------------------------------------------*/

/**
 * Constructs a polyline for a specific model.
 *
 * Realisation:
 * Currently two modes are implemented:  ... & ROUND
 * Both are based on indexed triangles. The second one uses disks as joints
 * and basically creates a 'unit' disk every time the stroke weight changes,
 * which later on gets scaled to a 'scaled unit' disk which itself gets translated
 * to the supplied point positions and copied into the line buffer.
 *
 * Line edges are made of 4 points with 2 indexed triangles, the first one
 * uses the same vertex data as the first one, but just draw the data
 * with an offset.
 *
 * TODO(hw): implement CORNER & ... style, those would be easier to implement,both TRIANGLE_STRIPS
 * TODO(hw): change drwing order to cap,edge,cap,... instead of cap,cap,edge,edge, as this would prevent overlaps of edges on top of caps
 *
 * Unit cap update, mode ROUND:
 * If the overall cap detail gets changed the stroke cap scheme gets updated,
 * index data & buffer of model will only reloaded if either the cap detail
 * has changed or the vertex buffer length increased. The vertex reinits to
 * max length.
 *
 * @param model
 * @param points
 * @param length
 * @param loop
 * @private
 */

Context.prototype._polyline = function(model,points,length,loop){
    var stateWeight = model.stateWeight,
        weight      = state1Front(stateWeight);

    if(!weight){
        return;
    }
    var weight_2 = weight * 0.5;

    var stateColor   = model.stateColor,
        color        = state1Front(stateColor),
        colorLength  = color.length,
        colorDiffers = state1Equal(stateColor);

    if(colorLength != 4 &&          //single color
       colorLength != 8 &&          //two colors to interpolate
       colorLength != length * 2){  //color for every point
        throw Warning.POLYLINE_INVALID_COLOR_RANGE;
    }
    loop   = (loop === undefined) ? false : loop;
    length = (length === undefined || length == null) ? points.length : length;

    var stateDetail = this._stateDetailStroke,
        detailDiffers = !state1Equal(stateDetail);

    var comp = this._lineComponents;

    //cap detail changed, recalculate the scheme
    if(detailDiffers){
        var lenCapVertex_ = stateDetail * 2;
        comp.vertexCap  = GeomUtil.genVerticesCircle(stateDetail,new Float32Array(lenCapVertex_));
        comp.vertexCapS = new Float32Array(lenCapVertex_);
        comp.vertexCapT = new Float32Array(lenCapVertex_);
        comp.colorCap   = new Float32Array(lenCapVertex_ * 2);
        comp.indexCap   = new UintArray((lenCapVertex_ / 2 - 2) * 3);
    }

    var statePointsLength   = model.stateLength,
        pointsLengthDiffers = state1Equal(statePointsLength);

    //if the stroke width changed, rescale the cap scheme accordingly
    if(!state1Equal(stateWeight)){
        VertexUtil.scale(comp.vertexCap,weight_2,weight_2,comp.vertexCapS);
    }

    //component cap data
    var vertexCap  = comp.vertexCapS, // vertex cap scaled to weight
        vertexCapT = comp.vertexCapT, // container cap vertices translated
        vertexEdge = comp.vertexEdge, // container edge vertices
        colorCap   = comp.colorCap,   // container cap colors
        colorEdge  = comp.colorEdge,  // container edge colors
        indexCap   = comp.indexCap,   // index cap unit
        indexCapT  = comp.indexCapT,  // index cap translated
        indexEdge  = comp.indexEdge,  // index unit edge
        indexEdgeT = comp.indexEdgeT; // index edge translated

    var lenVertexCap  = vertexCap.length,
        lenVertexEdge = 8;
    var lenColorCap   = colorCap.length,
        lenColorEdge  = colorEdge.length;
    var numVertexCap  = lenVertexCap * 0.5,
        numVertexEdge = lenVertexEdge * 0.5;

    var lenIndexCap  = indexCap.length,
        lenIndexEdge = indexEdge.length;


    //
    //    Structure vertices & indices
    //
    //       + ------- + ------- +
    // BEGIN | caps    | edges   | END
    //       + ------- + ------- +
    //
    //                 |
    //                 | offset
    //                 | edges
    //
    //
    //    If loop : total vertices + edge vertices
    //
    //       C Edge    C Edge    C       If loop
    // BEGIN o ------- o ------- o END o ------- o BEGIN
    //
    //

    var numPoints = length * 0.5,
        numEdges  = numPoints - !loop; //if loop edgeLength++

    //offsets

    var vertexData = model.vertex,
        colorData  = model.color,
        indexData  = model.index;

    var gl  = this._gl,
        vbo = model.vbo.bind(),
        ibo = model.ibo.bind();

    var lenVertexData = (numVertexCap  * numPoints + numVertexEdge * numEdges) * 2,
        lenColorData  = lenVertexData * 2;

    //true if the new calculated length exceeds the previous length
    var lengthExceeded = (lenVertexData + lenColorData) > vertexData.length;

    //increase data and buffer length is length is larger than before
    if(lengthExceeded){
        model.offsetEdges       = numVertexCap * numPoints;
        model.offsetIndexEdges  = lenIndexCap * numPoints;

        vertexData = model.vertex = new Float32Array(lenVertexData);
        colorData  = model.color  = new Float32Array(lenColorData);
        indexData  = model.index  = new UintArray(model.offsetIndexEdges + lenIndexEdge * numEdges);

        vbo.bufferData(vertexData.byteLength + colorData.byteLength,gl.DYNAMIC_DRAW);
        ibo.bufferData(indexData.byteLength, gl.DYNAMIC_DRAW);
    }

    var offsetEdges       = model.offsetEdges,
        offsetVertexEdges = offsetEdges * 2,
        offsetColorEdges  = offsetEdges * 4;


    var x, y,   //point position
        nx,ny;  //next point position

    var slopeX,slopeY,
        slopeLen,
        temp;

    var i, j, k, m;

    i = -1;
    while(++i < numPoints){
        j = i * 2;

        //current point
        x = points[j  ];
        y = points[j+1];

        //translate the scaled cap to the new position
        VertexUtil.translate(vertexCap,x,y,vertexCapT);

        //copy the cap into buffer data, 0 ++
        vertexData.set(vertexCapT, i * lenVertexCap);

        //process edges with offset
        if(i < numEdges){
            j = (i + 1) % numPoints * 2;

            //next point
            nx = points[j  ];
            ny = points[j+1];

            //get the slope
            slopeX   = nx - x;
            slopeY   = ny - y;
            slopeLen = 1.0 / Math.sqrt(slopeX * slopeX + slopeY * slopeY);
            slopeX  *= slopeLen;
            slopeY  *= slopeLen;

            temp   = slopeX;
            slopeX = slopeY;
            slopeY = -temp;

            ////perpendicular vertices
            temp = weight_2 * slopeX;
            vertexEdge[0] = x  + temp;
            vertexEdge[2] = x  - temp;
            vertexEdge[4] = nx + temp;
            vertexEdge[6] = nx - temp;

            temp = weight_2 * slopeY;
            vertexEdge[1] = y  + temp;
            vertexEdge[3] = y  - temp;
            vertexEdge[5] = ny + temp;
            vertexEdge[7] = ny - temp;

            //copy the edge into the buffer, offsetEdges ++
            vertexData.set(vertexEdge,offsetVertexEdges + i * lenVertexEdge);
        }
    }
    vbo.bufferSubData(0,vertexData);

    //Recalculate & reassign & buffer colors on either cap detail changed,
    //the source points array exceeds the previous ones or the color changed.
    if(detailDiffers || lengthExceeded || colorDiffers || pointsLengthDiffers){
        var numColors = colorLength * 0.25;
        var r, g, b, a;
        i = -1;

        //single color
        if(colorLength == 4){
            r = color[0];
            g = color[1];
            b = color[2];
            a = color[3];

            while(++i < numPoints){
                k = 0;
                while(k < lenColorCap){
                    colorCap[k  ] = r;
                    colorCap[k+1] = g;
                    colorCap[k+2] = b;
                    colorCap[k+3] = a;
                    k+=4;
                }
                colorData.set(colorCap,i * lenColorCap);
                if(i < numEdges){
                    colorEdge[0] = colorEdge[4] = colorEdge[ 8] = colorEdge[12] = r;
                    colorEdge[1] = colorEdge[5] = colorEdge[ 9] = colorEdge[13] = g;
                    colorEdge[2] = colorEdge[6] = colorEdge[10] = colorEdge[14] = b;
                    colorEdge[3] = colorEdge[7] = colorEdge[11] = colorEdge[15] = a;
                    colorData.set(colorEdge,offsetColorEdges + i * lenColorEdge);
                }
            }
        //two colors
        } else if(colorLength == 8){
            var _numPoints = 1.0 / (numPoints - 1);
            var r1, g1, b1, a1,
                r2, g2, b2, a2;

            r = color[0];
            g = color[1];
            b = color[2];
            a = color[3];

            r2 = color[4];
            g2 = color[5];
            b2 = color[6];
            a2 = color[7];

            while(++i < numPoints){
                j = i * _numPoints;
                m = 1.0 - j;

                r1 = r * m + r2 * j;
                g1 = g * m + g2 * j;
                b1 = b * m + b2 * j;
                a1 = a * m + a2 * j;

                k = 0;
                while(k < lenColorCap){
                    colorCap[k  ] = r1;
                    colorCap[k+1] = g1;
                    colorCap[k+2] = b1;
                    colorCap[k+3] = a1;
                    k+=4;
                }
                colorData.set(colorCap,i * lenColorCap);
                if(i < numEdges){
                    colorEdge[0] = colorEdge[4] = r1;
                    colorEdge[1] = colorEdge[5] = g1;
                    colorEdge[2] = colorEdge[6] = b1;
                    colorEdge[3] = colorEdge[7] = a1;

                    j = (i+1) % numPoints * _numPoints;
                    m = 1.0 - j;

                    r1 = r * m + r2 * j;
                    g1 = g * m + g2 * j;
                    b1 = b * m + b2 * j;
                    a1 = a * m + a2 * j;

                    colorEdge[ 8] = colorEdge[12] = r1;
                    colorEdge[ 9] = colorEdge[13] = g1;
                    colorEdge[10] = colorEdge[14] = b1;
                    colorEdge[11] = colorEdge[15] = a1;

                    colorData.set(colorEdge,offsetColorEdges + i * lenColorEdge);
                }
            }
        //single color for every point
        } else {
            while(++i < numPoints){
                j = i * 4;
                r = color[j  ];
                g = color[j+1];
                b = color[j+2];
                a = color[j+3];

                k = 0;
                while(k < lenColorCap){
                    colorCap[k  ] = r;
                    colorCap[k+1] = g;
                    colorCap[k+2] = b;
                    colorCap[k+3] = a;
                    k+=4;
                }

                colorData.set(colorCap,i * lenColorCap);
                if(i < numEdges){
                    j = (i+1) % numColors * 4;

                    colorEdge[0] = colorEdge[4] = r;
                    colorEdge[1] = colorEdge[5] = g;
                    colorEdge[2] = colorEdge[6] = b;
                    colorEdge[3] = colorEdge[7] = a;

                    r = color[j  ];
                    g = color[j+1];
                    b = color[j+2];
                    a = color[j+3];

                    colorEdge[ 8] = colorEdge[12] = r;
                    colorEdge[ 9] = colorEdge[13] = g;
                    colorEdge[10] = colorEdge[14] = b;
                    colorEdge[11] = colorEdge[15] = a;

                    colorData.set(colorEdge,offsetColorEdges + i * lenColorEdge);
                }
            }
        }
        vbo.bufferSubData(vertexData.byteLength,colorData);
    }

    var offsetIndexEdges = numPoints * lenIndexCap;
    var indexLength      = offsetIndexEdges + numEdges * lenIndexEdge;

    //Recalculate indices if either cap detail changed, or
    //the new vertex length exceeds the previous one
    if(detailDiffers || pointsLengthDiffers || lengthExceeded){
        i = -1;
        while(++i < numPoints){
            j = i * numVertexCap;

            //translate cap indices
            k = -1;
            while(++k < lenIndexCap){
                indexCapT[k] = indexCap[k] + j;
            }
            indexData.set(indexCapT,i * lenIndexCap);

            //translate edge indices
            if(i < numEdges){
                j = offsetEdges + i * numVertexEdge;

                indexEdgeT[0] = j + indexEdge[0];
                indexEdgeT[1] = j + indexEdge[1];
                indexEdgeT[2] = j + indexEdge[2];
                indexEdgeT[3] = j + indexEdge[3];
                indexEdgeT[4] = j + indexEdge[4];
                indexEdgeT[5] = j + indexEdge[5];

                indexData.set(indexEdgeT,offsetIndexEdges + i * lenIndexEdge);
            }
        }
        ibo.bufferSubData(0,indexData);
    }

    this._enableAttribTexcoord(false);
    this._setAttribPointer(0,vertexData.byteLength);

    var offset       = (this._modeStrokeCap == Context.ROUND) ? 0 : offsetIndexEdges;
    var offsetIndex  = offset * UNSIGNED_DATA_BYTES,
        offsetLength = indexLength - offset;

    this.applyMatrixUniform();
    gl.drawElements(gl.TRIANGLES,offsetLength, UNSIGNED_DATA_TYPE, offsetIndex);

    this._enableAttribTexcoord(true);

    ibo.unbind();
    vbo.unbind();

    state1Push(stateDetail);
    state1Push(statePointsLength, length);
    stateArrPush(stateColor, Util.copyArray(color));
    state1Push(stateWeight, weight);
};

/*---------------------------------------------------------------------------------------------------------*/
// Fill & stroke state
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
    bColor[0] = bColor[1] = bColor[2] = k;
    bColor[3] = 1.0;
    this._fill = true;
};

Context.prototype.fill2f = function(k,a){
    var bColor = this._bColorFill = this._bColorFill4;
    bColor[0] = bColor[1] = bColor[2] = k;
    bColor[3] = a;
    this._fill = true;
};

Context.prototype.fill3f = function(r,g,b){
    var bColor = this._bColorFill = this._bColorFill4;
    bColor[0] = r;
    bColor[1] = g;
    bColor[2] = b;
    bColor[3] = 1.0;
    this._fill = true;
};

Context.prototype.fill4f = function(r,g,b,a){
    var bColor = this._bColorFill = this._bColorFill4;
    bColor[0] = r;
    bColor[1] = g;
    bColor[2] = b;
    bColor[3] = a;
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
            if(isArray(arg0)){
                this.strokefv(arg0);
            } else {
                this._stroke4f(arg0,arg0,arg0,1.0);
            }
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
    var state = this._stackColorStroke;
    state1Push(state,Util.copyArray(bColor));

    state1Push(this._line.stateColor, state1Front(state));
    state1Push(this._lines.stateColor,state1Front(state));
    state1Push(this._linep.stateColor,state1Front(state));
    this._stroke = true;
};

Context.prototype._strokefv = function(arr){
    var state  = this._stackColorStroke;
    state1Push(this._stackColorStroke,Util.copyArray(arr));

    state1Push(this._line.stateColor, state1Front(state));
    state1Push(this._lines.stateColor,state1Front(state));
    state1Push(this._linep.stateColor,state1Front(state));
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
// Transformation
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype.applyMatrixUniform = function(){
    this._program.uniformMatrix3fv('uMatrix',false,this._matrix);
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
// Canvas Utilities
/*---------------------------------------------------------------------------------------------------------*/

Context.prototype._setSize = function(width, height){
    var canvas3d = this._canvas3d,
        gl       = this._gl;

    this._width  = width;
    this._height = height;

    canvas3d.style.width  = width  + 'px';
    canvas3d.style.height = height + 'px';

    var ssaaf   = this._ssaaf,
        width_  = canvas3d.width  = this._width_internal  = width  * ssaaf,
        height_ = canvas3d.height = this._height_internal = height * ssaaf;

    this._program.uniform2f('uViewport',width_,height_);
    gl.viewport(0,0,width_,height_);

    var color = this._bColorBg;
    gl.clearColor(color[0], color[1], color[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
};

Context.prototype._getWidth_internal = function () {
    return this._width;
};

Context.prototype._getHeight_internal = function () {
    return this._height;
};

/*---------------------------------------------------------------------------------------------------------*/
// Export
/*---------------------------------------------------------------------------------------------------------*/

Context.POLYLINE_SPLIT = Number.MAX_VALUE;



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

Context.SQUARE = 5;
Context.ROUND  = 6;

Context.ARRAY_BUFFER = WebGLRenderingContext.ARRAY_BUFFER;
Context.ELEMENT_ARRAY_BUFFER = WebGLRenderingContext.ELEMENT_ARRAY_BUFFER;

module.exports = Context;