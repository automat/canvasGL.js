var Util = {};

Util.isUndefined = function(obj){
    return typeof obj === 'undefined';
};

Util.isFloat32Array = function(arr){
    return arr instanceof Float32Array;
};

Util.safeFloat32Array = function(arr){
    return arr instanceof Float32Array ? arr : new Float32Array(arr);
};

Util.safeUint16Array = function(arr){
    return arr instanceof Uint16Array ? arr : new Uint16Array(arr);
};

Util.copyFloat32Array = function(arr){
    return new Float32Array(arr);
};

Util.arrayResized = function(arr,length){
    arr.length = length;
    return arr;
};

Util.copyArray = function(arr){
    var i = -1, l = arr.length, out = new Array(l);
    while(++i < l){
        out[i] = arr[i];
    }
    return out;
};

Util.setArr = function(a,b){
    var i = -1,l = a.length;
    while(++i< l){
        a[i] = b[i];
    }
};

Util.setArrOffsetIndex = function(arr,offset,length){
    var i = -1, l = length || arr.length;
    while(++i < l){
        arr[i]+=offset;
    }
};

//check for content not object equality, object is number
Util.equalArrContent = function(a,b){
    if(!a || !b || (!a && !b)){
        return false;
    } else if(a.length != b.length){
        return false
    } else {
        var i = -1, l = a.length;
        while(++i < l){
            if(a[i] != b[i])return false;
        }
    }
    return true;
};


module.exports = Util;

