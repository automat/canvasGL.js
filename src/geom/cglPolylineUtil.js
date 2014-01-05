var Warning    = require('../common/cglWarning'),
    Utils      = require('../utils/cglUtils'),
    VertexUtil = require('../geom/cglVertexUtil');

var PolylineUtil = {};

PolylineUtil.genPolylineGeom = function(points,pointsLength,
                                        verticesCap,verticesCapLength,
                                        width,color,loop,
                                        outVertex,outColor,outIndex){
    var colorLength = color.length;

    if(colorLength != 4 &&
       colorLength != 8 &&
       colorLength != pointsLength * 2){
        throw Warning.POLYLINE_INVALID_COLOR_RANGE;
    }

    loop = Utils.isUndefined(loop) ? false : loop;

    var pointSize   = 2,
        pointsLen   = (Utils.isUndefined(pointsLength) ? points.length : pointsLength) + (loop ? pointSize : 0),
        pointsNum   = pointsLen * 0.5,
        pointsNum_1 = pointsNum - 1,
        pointsNum_2 = pointsNum - 2;

    var capVertexNum = (width <= 2.0) ? 0 : verticesCapLength * 0.5,
        capRadius    = width * 0.5;

    var detail = capVertexNum;

    var edgeVertexLen = 8,
        edgeColorLen  = 16,
        edgeIndexLen  = 18;

    var edgeVertexLenTotal = edgeVertexLen * pointsNum_1,
        edgeColorLenTotal  = edgeColorLen  * pointsNum_1,
        edgeIndexLenTotal  = edgeIndexLen  * pointsNum_1;

    var capVertexLen = capVertexNum * 2,
        capColorLen  = capVertexNum * 4,
        capIndexLen  = (capVertexNum - 2) * 3;

    var capVertexLenTotal = capVertexLen * pointsNum,
        capColorLenTotal  = capColorLen  * pointsNum,
        capIndexLenTotal  = capIndexLen  * pointsNum;

    var vertexLen = edgeVertexLen + capVertexLen,
        colorLen  = edgeColorLen  + capColorLen,
        indexLen  = edgeIndexLen  + capIndexLen;


    var i, j, k;
    var i2;

    var vertexIndex,
        faceIndex;

    var offsetVertex,
        offsetIndex;

    var x, y, nx, ny;
    var slopeX, slopeY,
        slopeLen, temp;










};


module.exports = PolylineUtil;