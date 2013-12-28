var PrimitiveUtil = {};

PrimitiveUtil.getTexCoordsCircle = function(detail,
                                            textureOffsetX,textureOffsetY,
                                            textureOffsetW,textureOffsetH,
                                            out){
    var l = detail * 2;
    var oxx = textureOffsetX,
        oyy = textureOffsetY,
        ow  = (1+textureOffsetW) * 0.5 ,
        oh  = (1+textureOffsetH) * 0.5 ;

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

PrimitiveUtil.getVerticesCircle = function(detail,out){
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


module.exports = PrimitiveUtil;