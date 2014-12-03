var Util = require('./../Util'),
    ObjectUtil = require('./../ObjectUtil');

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

        return out.substr(0,out.lastIndexOf('\n'));
    },

    format : function(data, detailed){
        detailed = Util.isUndefined(detailed) ? true : false
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

    __MSG_LOG : 'worker_console_log',

    console : {
        format:function(data,detailed){
            return WorkerConsole.format(data,detailed);
        },
        log:function(data,detailed){
            self.postMessage({msg:WorkerConsole.__MSG_LOG,data:this.format(data,detailed)});
        }
    },

    addListener : function(worker){
        worker.addEventListener('message',function(e){
            var dataObj = e.data;
            if(dataObj.msg && dataObj.msg == WorkerConsole.__MSG_LOG){
                console.log(dataObj.data);
            }
        })
    }
};

module.exports = WorkerConsole;