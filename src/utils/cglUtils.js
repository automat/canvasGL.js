var Utils = {};

Utils.isUndefined = function(obj){
    return typeof obj === 'undefined';
};

Utils.isFloat32Array = function(arr){
    return arr instanceof Float32Array;
};

Utils.safeFloat32Array = function(arr){
    return arr instanceof Float32Array ? arr : new Float32Array(arr);
};

Utils.safeUint16Array = function(arr){
    return arr instanceof Uint16Array ? arr : new Uint16Array(arr);
};

Utils.copyFloat32Array = function(arr){
    return new Float32Array(arr);
};

Utils.arrayResized = function(arr,length){
    arr.length = length;
    return arr;
};

Utils.copyArray = function(arr){
    var i = -1, l = arr.length, out = new Array(l);
    while(++i < l){
        out[i] = arr[i];
    }
    return out;
};

Utils.setArr = function(a,b){
    var i = -1,l = a.length;
    while(++i< l){
        a[i] = b[i];
    }
};

//check for content not object equality
Utils.equalArrContent = function(a,b){
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


module.exports = Utils;

