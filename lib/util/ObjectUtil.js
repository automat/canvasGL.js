var ObjectUtil = {
    getFunctionBody : function(func){
        return (func).toString().match(/function[^{]+\{([\s\S]*)\}$/)[1];
    },

    __toString : function(obj){
        return Object.prototype.toString.call(obj);
    },

    isArray : function(obj){
        return this.__toString(obj) == '[object Array]';
    },

    isObject : function(obj){
        return obj === Object(obj)
    },

    isFunction : function(obj){
        return this.__toString(obj) == '[object Function]';
    },

    isString : function(obj){
        return this.__toString(obj) == '[object String]';
    },

    isFloat32Array : function(obj){
        return this.__toString(obj) == '[object Float32Array]'
    },

    isFloat64Array : function(obj){
        return this.__toString(obj) == '[object Float64Array]'
    },

    isUint8Array : function(obj){
        return this.__toString(obj) == '[object Uint8Array]';
    },

    isUint16Array : function(obj){
        return this.__toString(obj) == '[object Uint16Array]'
    },

    isUint32Array : function(obj){
        return this.__toString(obj) == '[object Uint32Array]'
    },

    isTypedArray : function(obj){
        return this.isUint8Array(obj) ||
               this.isUint16Array(obj) ||
               this.isUint32Array(obj) ||
               this.isFloat32Array(obj) ||
               this.isFloat32Array(obj);
    },

    toString : function(obj){
       return this.isFunction(obj) ? this.getFunctionString(obj) :
              this.isArray(obj) ? this.getArrayString(obj) :
              this.isString(obj) ? this.getString(obj) :
              this.isTypedArray(obj) ? this.getTypedArrayString(obj) :
              this.isObject(obj) ? this.getObjectString(obj) :
              obj;
    },

    getTypedArrayString : function(obj){
        if(!this.isFloat32Array(obj)){
            throw new TypeError('Object must be of type Float32Array');
        }

        if(obj.byteLength == 0)return '[]';
        var out = '[';

        for(var p in obj){
            out += obj[p] + ',';
        }

        return out.substr(0,out.lastIndexOf(',')) + ']';

    },

    getString : function(obj){
        return '"' + obj + '"';
    },

    getArrayString : function(obj){
        if(!this.isArray(obj)){
            throw new TypeError('Object must be of type array.');
        }
        var out = '[';
        if(obj.length == 0){
            return out + ']';
        }

        var i = -1;
        while(++i < obj.length){
            out += this.toString(obj[i]) + ',';
        }

        return out.substr(0,out.lastIndexOf(',')) + ']';
    },

    getObjectString : function(obj){
        if(!this.isObject(obj)){
            throw new TypeError('Object must be of type object.')
        }
        var out = '{';
        if(Object.keys(obj).length == 0){
            return out + '}';
        }

        for(var p in obj){
            out += p + ':' + this.toString(obj[p]) +',';
        }

        return out.substr(0,out.lastIndexOf(',')) + '}';
    },

    //
    //  Parses func to string,
    //  must satisfy (if 'class'):
    //
    //  function ClassB(){
    //      ClassB.apply(this,arguments);ClassB.call...
    //  }
    //
    //  ClassB.prototype = Object.create(ClassA.prototype)
    //
    //  ClassB.prototype.method = function(){};
    //
    //  ClassB.STATIC = 1;
    //  ClassB.STATIC_OBJ = {};
    //  ClassB.STATIC_ARR = [];
    //

    getFunctionString : function(obj){
        if(!this.isFunction(obj)){
            throw new TypeError('Object must be of type function.');
        }

        var out = '';

        var name        = obj.name,
            constructor = obj.toString(),
            inherited   = 1 + constructor.indexOf('.call(this') || 1 + constructor.indexOf('.apply(this');

        out += constructor;

        if(inherited){
            out += '\n\n';
            inherited -= 2;

            var baseClass = '';
            var char = '',
                i = 0;
            while(char != ' '){
                baseClass = char + baseClass;
                char = constructor.substr(inherited-i,1);
                ++i;
            }
            out += name + '.prototype = Object.create(' + baseClass + '.prototype);';
        }

        for(var p in obj){
            out += '\n\n' + name + '.' + p + ' = ' + this.toString(obj[p]) + ';';
        }

        var prototype = obj.prototype;
        for(var p in prototype){
            if(prototype.hasOwnProperty(p)){
                out +=  '\n\n' + name + '.prototype.' + p +  ' = ' + this.toString(prototype[p]) + ';';

            }
        }

        return out;
    }

};

module.exports = ObjectUtil;
