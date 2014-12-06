var gl_ = require('./gl');
var Vbo = require('./Vbo');


function Model(){
    var gl = this._gl = gl_.get();
    this._attributes = {};
    this._vbo = new Vbo(gl.ARRAY_BUFFER);
    this._dirty = false;
}

Model.prototype.addAttribute = function(name,data){
    var d = data ? true : false;
    this._attributes[name] = { data : data, dirty : d, offset : 0 };
    this._dirty = d;
};

Model.prototype.getAttribute = function(name){
    return this._attributes[name];
};

Model.prototype.attributeIsDirty = function(name){
    return this._attributes[name].dirty;
};

Model.prototype.setAttributeDirty = function(name,bool){
    this._attributes[name].dirty = bool;
};

Model.prototype.isDirty = function(){
    return this._dirty;
};

Model.prototype.getVbo = function(){
    return this._vbo;
};

Model.prototype.setAttributeData = function(name,data){
    var attrib = this._attributes[name];
    if(!attrib){
        throw new Error('Model has no attribute "' + name + '".');
    }
    attrib.data  = data;
    attrib.dirty = true;
    this._dirty  = true;
};

Model.prototype.getAttributeData = function(name){
    var attrib = this._attributes[name];
    if(!attrib){
        throw new Error('Model has no attribute "' + name + '".');
    }
    return attrib.data;
};

Model.prototype.getAttibuteOffset = function(name){
    return this._attributes[name].offset;
};

Model.prototype.updateAttributeOffsets = function(){
    var attribs = this._attributes;
    var keys = Object.keys(attribs);

    var i = 0,offset = attribs[keys[0]].data.byteLength, attrib;
    while(++i < keys.length){
        attrib = attribs[keys[i]];
        if(!attrib.data){
            continue;
        }
        attrib.offset = offset;
        offset += attrib.data.byteLength;
    }
};

Model.prototype.initBuffer = function(){
    var gl = this._gl;
    var attribs = this._attributes,
        attrib;
    var sizeTotal = 0;
    var key;
    for(key in attribs){
        attrib = attribs[key];
        if(!attrib.data){
            continue;
        }
        sizeTotal += attrib.data.byteLength;
    }
    this._vbo.bind()
             .bufferData(sizeTotal,gl.DYNAMIC_DRAW)
             .unbind();
    //this.update();
};

Model.prototype.update = function(){
    var attribs = this._attributes,
        dirty   = true;
    var a;

    for(a in attribs){
        if(attribs[a].dirty){
            dirty = true;
            break;
        }
    }
    if(!dirty){
        return
    }

    this.updateAttributeOffsets();

    var vbo     = this._vbo,
        attrib;

    for(a in attribs){
        attrib = attribs[a];
        if(!attrib.dirty || !attrib.data){
            continue;
        }
        vbo.bufferSubData(attrib.offset,attrib.data);
        attrib.dirty = false;
    }

    this._dirty = false;
};


module.exports = Model;