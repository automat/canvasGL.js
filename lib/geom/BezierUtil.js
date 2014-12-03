var BezierUtil = {};

BezierUtil.getPoint = function(x0,y0,x1,y1,x2,y2,x3,y2,d,out){
    out = out || new Float32Array(2);

    var nt  = 1 - d,
        nt3 = nt * nt * nt,
        nt2 = nt * nt,
        t3  = d * d * d,
        t2  = d * d;

    out[0] = nt3*x0+3*nt2*d*x1+3*nt*t2*x2+t3*x3;
    out[1] = nt3*y0+3*nt2*d*y1+3*nt*t2*y2+t3*y3;

    return out;
};

BezierUtil.getTangentAngle = function(x0,y0,x1,y1,x2,y2,x3,y3,d){
    var nt1  = 1 - d,
        nt31 = nt1 * nt1 * nt1,
        nt21 = nt1 * nt1,
        t31  = d * d * d,
        t21  = d * d,
        d2   = (d >= 1.0) ? d : (d+0.1),
        nt2  = 1 - d2,
        nt32 = nt2 * nt2 * nt2,
        nt22 = nt2 * nt2,
        t32  = d2 * d2 * d2,
        t22  = d2 * d2;

    var p0x = nt31*x0+3*nt21*d*x1+3*nt1*t21*x2+t31*x3,
        p0y = nt31*y0+3*nt21*d*y1+3*nt1*t21*y2+t31*y3,
        p1x = nt32*x0+3*nt22*d2*x1+3*nt2*t22*x2+t32*x3,
        p1y = nt32*y0+3*nt22*d2*y1+3*nt2*t22*y2+t32*y3;

    return Math.atan2(p1y-p0y,p1x-p0x);
};

BezierUtil.genPoints = function(x0,y0,x1,y1,x2,y2,x3,y3,detail,out){
    var detail_2 = detail - 2;
    var t,nt,nt3,nt2,t3,t2;

    var i = 0;
    while(i < detail){
        t   = i / detail_2;
        nt  = 1 - t;
        nt3 = nt*nt*nt;
        nt2 = nt*nt;
        t3  = t*t*t;
        t2  = t*t;

        out[i  ] = nt3*x0+3*nt2*t*x1+3*nt*t2*x2+t3*x3;
        out[i+1] = nt3*y0+3*nt2*t*y1+3*nt*t2*y2+t3*y3;

        i+=2;
    }

    return out;
};

module.exports = BezierUtil;