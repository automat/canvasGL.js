var Float32ArrayMutable = require('../../src/utils/cglFloat32ArrayMutable'),
    Uint16ArrayMutable  = require('../../src/utils/cglUint16ArrayMutable');


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


function run(){
    testFloat32ArrayMutable();
    testUint16ArrayMutable();

}







run();