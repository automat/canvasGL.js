var gl = {
    _gl : null,
    set : function(gl){
        this._gl = gl;
    },
    get : function(){
        return this._gl;
    }
};

module.exports = gl;