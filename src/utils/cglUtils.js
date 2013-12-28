var Utils = {};
Utils.isUndefined      = function(obj){return typeof obj === 'undefined';};
Utils.isFloat32Array   = function(arr){return arr instanceof Float32Array;};
Utils.safeFloat32Array = function(arr){return arr instanceof Float32Array ? arr : new Float32Array(arr);};
Utils.safeUint16Array  = function(arr){return arr instanceof Uint16Array ? arr : new Uint16Array(arr);};
Utils.copyFloat32Array = function(arr){return new Float32Array(arr);};

Utils.setArr = function(a,b){
    var i = -1,l = a.length;
    while(++i< l){
        a[i] = b[i];
    }
};


Utils.rgbToHex = function(r,g,b){
    var h = (r << 16 | g << 8 | b).toString(16);
    return "#"+new Array(7-h.length).join("0")+h;
};




module.exports = Utils;

