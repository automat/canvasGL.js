// Internal Matrix 3x3 class for all transformations

// SX  0  0   0  1  2
//  0 SY  0   3  4  5
// TX TY  1   6  7  8

var Mat33 = {};

Mat33.make = function(){
    return new Float32Array([1,0,0,0,1,0,0,0,1]);
};

Mat33.identity = function(m){
    m[ 0] = 1;m[ 4] = 1;m[ 8] = 1;
    m[ 1] = m[ 2] = m[ 3] = m[ 5] = m[ 6] = m[ 7] = 0;
    return m;
};


Mat33.copy = function(m){
    return new Float32Array(m);
};

Mat33.makeScale = function(x,y,m){
    m[0] = x; m[4] = y;
    return m;
};

Mat33.makeTranslate = function(x,y,m){
    m[6] = x; m[7] = y;
    return m;
};

Mat33.makeRotate = function(a,m){
    var sin = Math.sin(a),
        cos = Math.cos(a);

    m[0] = cos;
    m[1] = sin;
    m[3] = -sin;
    m[4] = cos;
    return m;
};

Mat33.multPre = function(m0,m1,m){
    var m000 = m0[ 0],m001 = m0[ 1],m002 = m0[ 2],
        m003 = m0[ 3],m004 = m0[ 4],m005 = m0[ 5],
        m006 = m0[ 6],m007 = m0[ 7],m008 = m0[8];

    var m100 = m1[ 0],m101 = m1[ 1],m102 = m1[ 2],
        m103 = m1[ 3],m104 = m1[ 4],m105 = m1[ 5],
        m106 = m1[ 6],m107 = m1[ 7],m108 = m1[8];

    m[ 0] = m000*m100 + m001*m103 + m002*m106;
    m[ 1] = m000*m101 + m001*m104 + m002*m107;
    m[ 2] = m000*m102 + m001*m105 + m002*m108;

    m[ 3] = m003*m100 + m004*m103 + m005*m106;
    m[ 4] = m003*m101 + m004*m104 + m005*m107;
    m[ 5] = m003*m102 + m004*m105 + m005*m108;

    m[ 6] = m006*m100 + m007*m103 + m008*m106;
    m[ 7] = m006*m101 + m007*m104 + m008*m107;
    m[ 8] = m006*m102 + m007*m105 + m008*m108;

    return m;
};

Mat33.multPost = function(m0,m1,m){
    return this.multPre(m1,m0,m);
};

Mat33.applyVec2f = function(v,m,out){
    out = out || v;
    var x = v[0], y = v[1];
    out[0] = m[0] * x + m[3] * y + m[6];
    out[1] = m[1] * x + m[4] * y + m[7];
    return out;
};

Mat33.applyVecfv = function(vArr,m,outArr){
    outArr = outArr || vArr;
    var m0 = m[0],m1 = m[1],
        m3 = m[3],m4 = m[4],
        m6 = m[6],m7 = m[7];

    var x,y;
    var i = 0, l = vArr.length;
    var i1;
    while(i < l){
        i1 = i + 1;
        x = vArr[i  ];
        y = vArr[i1];
        outArr[i ] = m0 * x + m3 * y + m6;
        outArr[i1] = m1 * x + m4 * y + m7;
        i+=2;
    }
};

module.exports = Mat33;


