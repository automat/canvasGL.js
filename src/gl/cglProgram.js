var Program = function(ctx,vertexShader,fragmentShader,bindAttribs){
    var gl = this._glRef = ctx.getContext3d();

    var program    = this.program    = gl.createProgram(),
        vertShader = gl.createShader(gl.VERTEX_SHADER),
        fragShader = gl.createShader(gl.FRAGMENT_SHADER);

    bindAttribs = bindAttribs || {};

    for(var a in bindAttribs){
        gl.bindAttribLocation(program,bindAttribs[a],a);
    }

    gl.shaderSource(vertShader,vertexShader);
    gl.compileShader(vertShader);

    if(!gl.getShaderParameter(vertShader,gl.COMPILE_STATUS)){
        throw gl.getShaderInfoLog(vertShader);
    }

    gl.shaderSource(fragShader,  fragmentShader);
    gl.compileShader(fragShader);

    if(!gl.getShaderParameter(fragShader,gl.COMPILE_STATUS)){
        throw gl.getShaderInfoLog(fragShader);
    }

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram( program);

    var i, paramName;

    var uniformsNum = this._uniformsNum = gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);
    i = -1;while(++i < uniformsNum){
        paramName = gl.getActiveUniform(program,i).name;
        this[paramName] = gl.getUniformLocation(program,paramName);
    }

    var attributesNum = this._attributesNum = gl.getProgramParameter(program,gl.ACTIVE_ATTRIBUTES);
    var attributes    = this._attributes    = new Array(attributesNum);
    i = -1;while(++i < attributesNum){
        paramName = gl.getActiveAttrib(program,i).name;
        attributes[i] = this[paramName] = gl.getAttribLocation(program,paramName);
    }
};

Program.prototype.getUniformsNum   = function(){return this._uniformsNum;};
Program.prototype.getAttributesNum = function(){return this._attributesNum;};

Program.prototype.enableVertexAttribArrays = function(){
    var i = -1,a = this._attributes,n = this._attributesNum, gl = this._glRef;
    while(++i < n){gl.enableVertexAttribArray(a[i]);}
};

Program.prototype.disableVertexAttribArrays = function(){
    var i = -1,a = this._attributes,n = this._attributesNum, gl = this._glRef;
    while(++i < n){gl.disableVertexAttribArray(a[i]);}
};

Program.prototype.delete = function(){
    this._glRef.deleteProgram(this._program);
};

module.exports = Program;