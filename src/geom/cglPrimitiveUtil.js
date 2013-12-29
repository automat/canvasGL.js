var PrimitiveUtil = {};

PrimitiveUtil.getTexCoordsCircle = function(detail,
                                            textureOffsetX,textureOffsetY,
                                            textureOffsetW,textureOffsetH,
                                            out){
    var l = detail * 2;
    var oxx = textureOffsetX,
        oyy = textureOffsetY,
        ow  = (1+textureOffsetW) * 0.5 ,
        oh  = (1+textureOffsetH) * 0.5 ;

    var theta = 2 * Math.PI / detail,
        cos   = Math.cos(theta),
        sin   = Math.sin(theta),
        t;

    var ox = 1,oy = 0;

    var i = 0;
    while(i<l)
    {
        out[i  ] = (ow + oxx) + ox * ow;
        out[i+1] = (oh + oyy) + oy * oh;

        t  = ox;
        ox = cos * ox - sin * oy;
        oy = sin * t  + cos * oy;

        i+=2;
    }
    return out;
};

PrimitiveUtil.getVerticesCircle = function(detail,out){
    var l = detail * 2;
    var theta = 2 * Math.PI / detail,
        cos   = Math.cos(theta),
        sin   = Math.sin(theta),
        t;
    var ox = 1,
        oy = 0;
    var i = 0;
    //http://slabode.exofire.net/circle_draw.shtml
    while(i < l){
        out[i  ] = ox;
        out[i+1] = oy;
        t  = ox;
        ox = cos * ox - sin * oy;
        oy = sin * t  + cos * oy;
        i+=2;
    }
    return out;
};


PrimitiveUtil.getVerticesRoundRect = function(corners,radius,detail,out){
    var detail2 = detail * 2;
    var m, m2, n,
        o, om, on,
        cx,cy;

    var PI_2 = Math.PI * 0.5;
    var step = PI_2 / (detail-1);

    var a,as;
    var cos = Math.cos;
    var sin = Math.sin;

    m = 0;
    while(m < 4){
        om = m * (detail2 + 2);
        m2 = m * 2;

        out[om  ] = cx = corners[m2  ];
        out[om+1] = cy = corners[m2+1];

        n  = om + 2;
        on = n  + detail2;
        a  = m  * PI_2;
        o  = 0;

        while(n < on){
            as = a + step * o;
            out[n  ] = cx + cos(as) * radius;
            out[n+1] = cy + sin(as) * radius;
            o++;
            n+=2;
        }

        ++m;
    }

    return out;
};

PrimitiveUtil.getIndicesRoundRect = function(corners,radius,detail,out){
    var d  = detail,
        d2 = d * 2,
        d3 = d2 + 2,
        i2 = (d  + 1) * 3,
        i3 = (i2 - 6),
        l  = d3 * 4,
        is = d3 / 2,
        il = (l  / 2  + 2) * 3;

    var m, m2,n,o,om,on;

    var pi2 = Math.PI * 0.5,
        s   = pi2 / (d-1);

    m = 0;
    while(m<4){
        om  = m * i2;
        n   = om;
        on  = n + i3;
        o   = 1;
        om /= 3;

        while(n < on){
            out[n]   = om;
            out[n+1] = om + o ;
            out[n+2] = om + o + 1;

            o++;
            n+=3;
        }

        om = m * is;

        if(m<3){
            out[n]   = out[n+3] = om;
            out[n+1] = om + is;
            out[n+2] = out[n+5] = out[n+1] + 1 ;
            out[n+4] = om + d;
        }
        else if(m==3){
            out[n]   = om;
            out[n+1] = out[n+4] = om +d;
            out[n+2] = out[n+3] = 0;
            out[n+5] = 1;
        }

        ++m;
    }

    out[il-4] = 0;
    out[il-2] = is*2;
    out[il-5] = out[il-3] = is;
    out[il-6] = out[il-1] = is*3;

    return out;
}

module.exports = PrimitiveUtil;