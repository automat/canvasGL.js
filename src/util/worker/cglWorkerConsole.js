var Util = require('./../cglUtil'),
    ObjectUtil = require('./../cglObjectUtil');

var WorkerConsole = {
    __formatTypedArray : function(type,data,detailed){
        var length = data.length;
        var out = type +'['+length+']' + (length > 0 ? '\n' : '');

        if(detailed){
            var step   = Math.min(length,100),
                step_i = 0;

            var i = -1;
            while(++i < length){
                if(i % step == 0){
                    out+='[' + (step_i ) + '...' + Math.min(length,step_i + step - 1) + ']\n';
                    step_i += step;
                }
                out += '  ' + i + ' : ' + data[i] + '\n';
            }
        }
        return out;
    },

    __format : function(data, detailed){
        return ObjectUtil.isFunction(data) ? ObjectUtil.getFunctionString(data) :
               ObjectUtil.isArray(data) ? ObjectUtil.getArrayString(data) :
               ObjectUtil.isString(data) ? ObjectUtil.getString(data) :
               ObjectUtil.isUint8Array(data) ? this.__formatTypedArray('Uint8Array',data,detailed) :
               ObjectUtil.isUint16Array(data) ? this.__formatTypedArray('Uint16Array',data,detailed) :
               ObjectUtil.isUint32Array(data) ? this.__formatTypedArray('Uint32Array',data,detailed) :
               ObjectUtil.isFloat32Array(data) ? this.__formatTypedArray('Float32Array',data,detailed) :
               ObjectUtil.isFloat64Array(data) ? this.__formatTypedArray('Float64Array',data,detailed) :
               ObjectUtil.isObject(data) ? ObjectUtil.getObjectString(data) :
               data;
    },

    console : {
        log:function(data,detailed){
            self.postMessage({msg:0,data:WorkerConsole.__format(data,Util.isUndefined(detailed) ? true : false)});
    }},

    addListener : function(worker){
        worker.addEventListener('message',function(e){
            var dataObj = e.data;
            if(dataObj.msg == 0){
                console.log(dataObj.data);
            }
        })
    }



};

module.exports = WorkerConsole;