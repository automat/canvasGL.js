var VertexUtil = {};

VertexUtil.scale = function(src,x,y,out){
    var i = 0, l = src.length;
    while(i < l){
        out[i  ] = src[i  ] * x;
        out[i+1] = src[i+1] * y;
        i+=2;
    }
    return out;
};

VertexUtil.translate = function(src,x,y,out){
    var i = 0, l = src.length;
    while(i < l){
        out[i  ] = src[i  ] + x;
        out[i+1] = src[i+1] + y;
        i+=2;
    }
    return out;
};

module.exports = VertexUtil;