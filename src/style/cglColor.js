var Color = {};

Color.color1fArr = function(k,length){
    var a = new Array(length);
    var i = -1;
    while(++i < length){a[i]=k;}
    return a;
};

Color.colorvLerped = function(colors,arr){
    var i, j, k, k1, l, l_1;
    l   = arr.length / 4;
    l_1 = l - 1;
    i   = -1;

    while(++i<l){
        j  = i * 4;
        k  = i / l_1;
        k1 = 1 - k;

        arr[j  ] = colors[0] * k1 + colors[4] * k;
        arr[j+1] = colors[1] * k1 + colors[5] * k;
        arr[j+2] = colors[2] * k1 + colors[6] * k;
        arr[j+3] = colors[3] * k1 + colors[7] * k;
    }

    return arr;
};



module.exports = Color;