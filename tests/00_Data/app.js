var Float32ArrayMutable = require('../../src/util/data/cglFloat32ArrayMutable'),
    Uint16ArrayMutable  = require('../../src/util/data/cglUint16ArrayMutable');

function f32Set(dst,src,offset){
    var dstLen = dst.length,
        srcLen = src.length;

    if(offset > dstLen || (offset + srcLen) < 0)return dst;


    if(offset >= 0){ // is begin in positive range?
        if(offset + srcLen <= dstLen){ // does src fit dst?
            dst.set(src,offset); // set
        } else {
            dst.set(src.subarray(0,srcLen - Math.abs(dstLen - srcLen) - offset),offset); //end dstLen srclen diffed
        }
    } else { // offset below 0
        if(offset + srcLen <= dstLen){  // offsetted src length smaller dst length?
            dst.set(src.subarray(Math.abs(offset),srcLen),0); // set capped front
        } else {
            dst.set(src.subarray(Math.abs(offset),srcLen - Math.abs(dstLen - srcLen) - offset),0); // set capped front end
        }
    }

    return dst;
}


//38

function testFloat32ArraySet(){
    var arrBuf = new ArrayBuffer(10 * 4);
    var srcBuf = new ArrayBuffer(10 * 4);
    var buv;

    buv = new DataView(arrBuf);
    buv.setFloat32( 0,-1.0,true);
    buv.setFloat32( 4,-1.0,true);
    buv.setFloat32( 8,-1.0,true);
    buv.setFloat32(12,-1.0,true);
    buv.setFloat32(16,-1.0,true);
    buv.setFloat32(20,-1.0,true);
    buv.setFloat32(24,-1.0,true);
    buv.setFloat32(28,-1.0,true);
    buv.setFloat32(32,-1.0,true);
    buv.setFloat32(36,-1.0,true);

    buv = new DataView(srcBuf);
    buv.setFloat32( 0, 0,true);
    buv.setFloat32( 4, 1,true);
    buv.setFloat32( 8, 2,true);
    buv.setFloat32(12, 3,true);
    buv.setFloat32(16, 4,true);
    buv.setFloat32(20, 5,true);
    buv.setFloat32(24, 6,true);
    buv.setFloat32(28, 7,true);
    buv.setFloat32(32, 8,true);
    buv.setFloat32(36, 9,true);

    var arr = new Float32Array(arrBuf,0,5);
    var src = new Float32Array(srcBuf,0,10);

    f32Set(arr,src,-4);
}



function testFloat32ArrayMutable(){
    var arr = new Float32ArrayMutable(100,true);
    console.assert(arr.size() == 0, arr.size());

    var src = new Float32Array([0,1,2,3,4,5,6,7,8,9]);

    arr.set(src);
    console.assert(arr.size() == 10, arr.size());
    console.assert(arr.sizeAllocated() == 100, arr.sizeAllocated());

    arr.set(src,arr.size());
    console.assert(arr.size() == 20, arr.size());
    console.assert(arr.sizeAllocated() == 100, arr.sizeAllocated());

    arr.set(src,5,1);
    console.assert(arr.size() == 20, arr.size());
    console.assert(arr.sizeAllocated() == 100, arr.sizeAllocated());
    console.assert(arr.at(5) == 0, arr.at(5));
}

function testUint16ArrayMutable(){
    var arr = new Uint16ArrayMutable(100,true);
    console.assert(arr.size() == 0, arr.size());

    var src = new Uint16Array([0,1,2,3,4,5,6,7,8,9]);

    arr.set(src);
    console.assert(arr.size() == 10, arr.size());
    console.assert(arr.sizeAllocated() == 100, arr.sizeAllocated());

    arr.set(src,arr.size());
    console.assert(arr.size() == 20, arr.size());
    console.assert(arr.sizeAllocated() == 100, arr.sizeAllocated());

    arr.set(src,5,1);
    console.assert(arr.size() == 20, arr.size());
    console.assert(arr.sizeAllocated() == 100, arr.sizeAllocated());
    console.assert(arr.at(5) == 0, arr.at(5));
}

function testFloat32ArrayMutableLimitSet(){
    var arr = new Float32ArrayMutable(10,true);
    var src = new Float32Array([0,1,2,3,4,5]);

    arr.set(src,0,2);
    console.assert(arr.size() == 2,arr.size());
    arr.set(src,arr.size(),2);
    console.log(arr.array);
}


function run(){
    //testFloat32ArraySet();
    //testFloat32ArrayMutable();
    //testUint16ArrayMutable();
    //testFloat32ArrayMutableLimitSet();
    //testFloat32ArrayMutableUntypedSet();

}







run();