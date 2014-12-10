var ModelUtil = {};

ModelUtil.genTriangleFan = function(length,out){
    out = out || [];
    var l = out.length = (length / 2 - 2) * 3,
        i = 0,
        j = 0;

    while(i < l){
        out[i]   = 0;
        out[i+1] = 1 + j;
        out[i+2] = 2 + j++;
        i+=3;
    }
    return out;
};

ModelUtil.genFaceIndicesLinearCW = function(length){
    var a = new Array((length / 2 - 2) * 3),
        l = a.length,
        i = 0,
        j = 0;

    while(i < l){
        if(i % 2 == 0){
            a[i  ] = j;
            a[i+1] = j+2;
            a[i+2] = j+1;
        }else{
            a[i]   = a[i-2];
            a[i+1] = a[i-2]+1;
            a[i+2] = a[i-1];
        }
        i+=3;
        j++;
    }
    return a;
};

ModelUtil.genTexCoordsLinearCW = function(length){
    var a = new Array(length),
        i = 0,
        j = 0;

    while(i < length){
        if(j++ % 2 == 0){
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


ModelUtil.genFaceIndicesLinearCCW = function(length){
    var a = new Array((length / 2 - 2) * 3),
        i = 0,
        j = 0;

    while(i < a.length){
        if(i%2==0){
            a[i  ] = j;
            a[i+1] = j+1;
            a[i+2] = j+2;
        }
        else{
            a[i  ] = a[i-1];
            a[i+1] = a[i-2];
            a[i+2] = a[i-1]+1;
        }
        i+=3;
        j++;
    }
    return a;
};



module.exports = ModelUtil;