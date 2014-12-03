var ModelUtil = {};

ModelUtil.genFaceIndicesFan = function(length,out){
    out = out || [];
    var len = out.length = (length / 2 - 2) * 3;

    var i,j;
    i = 0;
    while(i < len){
        j = i / 3;

        out[i]   = 0;
        out[i+1] = j+1;
        out[i+2] = j+2;

        i+=3;
    }
    return out;
};

ModelUtil.genFaceIndicesLinearCW = function(length){
    var a  = new Array((length / 2 - 2) * 3),
        al = a.length;

    var i,i_3;
    i = 0;
    while(i < al){
        if(i % 2 == 0){
            i_3 = i / 3;
            a[i  ]= i_3;
            a[i+1]= i_3+2;
            a[i+2]= i_3+1;
        }
        else{
            a[i]  =a[i-2];
            a[i+1]=a[i-2]+1;
            a[i+2]=a[i-1];}
        i+=3;
    }
    return a;
};

ModelUtil.genTexCoordsLinearCW = function(length){
    var a  = new Array(length);
    var i = 0;

    while(i < length){
        if((i / 3) % 2 == 0){
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
    var a = new Array((length / 2 - 2) * 3);
    var i, i_3;
    i = 0;
    while(i < a.length){
        if(i%2==0){
            i_3 = i / 3;

            a[i  ] = i_3;
            a[i+1] = i_3+1;
            a[i+2] = i_3+2;
        }
        else{
            a[i  ] = a[i-1];
            a[i+1] = a[i-2];
            a[i+2] = a[i-1]+1;
        }
        i+=3;
    }
    return a;
};



module.exports = ModelUtil;