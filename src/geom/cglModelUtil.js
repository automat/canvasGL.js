var ModelUtil = {};

ModelUtil.getFaceIndicesFan = function(verticesLen){
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

ModelUtil.getFaceIndicesLinearCW = function(vertices,limit){
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

ModelUtil.getTexCoordsLinearCW = function(vertices,limit){
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


ModelUtil.getFaceIndicesLinearCCW = function(vertices){
    var a = new Array((vertices.length/2-2)*3);
    var i = 0;
    while(i < a.length){
        if(i%2==0){a[i]=i/3;a[i+1]=i/3+1;a[i+2]=i/3+2;}
        else{a[i]=a[i-1];a[i+1]=a[i-2];a[i+2]=a[i-1]+1;}
        i+=3;
    }
    return a;
};



module.exports = ModelUtil;