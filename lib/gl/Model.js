var gl_ = require('./gl');
var Vbo = require('./Vbo');

/**
 * Geometry representation with states
 * @constructor
 */
function Model(){
    this.vertex = {
        data : {},
        buffer : null
    };
    this.index  = {
        data : {},
        buffer : null
    };
}

/**
 * Updates the vbo if any of the vertex data is dirty
 */

Model.prototype.update = function(){
    var vertex = this.vertex,
        index  = this.index,
        data   = vertex.data;

    var d, dirty = false;
    for(d in data){
        if(data[d].dirty){
            dirty = true;
            break;
        }
    }
    if(!dirty){
        data = index.data;
        for(d in data){
            if(data[d].dirty){
                dirty = true;
                break;
            }
        }
    }

    if(!dirty){
        return;
    }

    var vbo = vertex.buffer;
    var obj;
    for(d in data){
        obj = data[d];
        if(!obj.dirty){
            continue;
        }
        vbo.bufferSubData(obj.offset,obj.data);
        obj.dirty = false;
    }

    vbo = index.buffer;
    for(d in data){
        obj = data[d];
        if(!obj.dirty){
            continue;
        }
        vbo.bufferSubData(obj.offset,obj.data);
        obj.dirty = false;
    }
};

module.exports = Model;