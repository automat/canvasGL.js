var _gl = require('./gl');

/**
 * GLSL shader program wrapper.
 * @param {String} [vertexShader] - The vertex shader or mixed vertex/fragment shader string
 * @param {String} [fragmentShader] - The fragment shader string
 * @constructor
 */

function Program(vertexShader, fragmentShader) {
    this._gl = _gl.get();
    this._obj = null;
    this._numAttributes = this._numUniforms = 0;
    this._attributes = this._uniforms = null;
    this.load(vertexShader,fragmentShader);
}

var currProgram = null,
    prevProgram = null;

/**
 * Return the currently bound program.
 * @returns {null|Program}
 */

Program.getCurrent = function(){
    return currProgram;
};

/**
 * Reload the program
 * @param {String} vertexShader - The vertex shader or mixed vertex/fragment shader string
 * @param {String} [fragmentShader] - The fragment shader string
 */

Program.prototype.load = function(vertexShader,fragmentShader){
    if(!vertexShader){
        return;
    }

    this.delete();

    var gl = this._gl;

    var prefixVertexShader = '',
        prefixFragmentShader = '';

    if(!fragmentShader){
        prefixVertexShader = '#define VERTEX_SHADER\n';
        prefixFragmentShader = '#define FRAGMENT_SHADER\n';
        fragmentShader = vertexShader;
    }

    var program    = this._obj = gl.createProgram(),
        vertShader = gl.createShader(gl.VERTEX_SHADER),
        fragShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.bindAttribLocation(this._obj, 0, 'aVertexPosition');

    gl.shaderSource(vertShader, prefixVertexShader + vertexShader);
    gl.compileShader(vertShader);

    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
        throw 'VERTEX: ' + gl.getShaderInfoLog(vertShader);
    }

    gl.shaderSource(fragShader, prefixFragmentShader + fragmentShader);
    gl.compileShader(fragShader);

    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
        throw 'FRAGMENT: ' + gl.getShaderInfoLog(fragShader);
    }

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    var i, paramName;
    var objects, numObjects;

    numObjects = this._numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    objects = this._uniforms = {};
    i = -1;
    while (++i < numObjects) {
        paramName = gl.getActiveUniform(program, i).name;
        objects[paramName] = gl.getUniformLocation(program, paramName);
    }

    numObjects = this._numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    objects = this._attributes = {};
    i = -1;
    while (++i < numObjects) {
        paramName = gl.getActiveAttrib(program, i).name;
        objects[paramName] = gl.getAttribLocation(program, paramName);
    }
};

/**
 * Returns the uniform location. -1 if not available. Checks against internal active uniforms.
 * @param uniform
 * @returns {number}
 */

Program.prototype.getUniformLocation = function(uniform){
    uniform = this._uniforms[uniform];
    return uniform === undefined ? -1 : uniform;
};

/**
 * Returns the attribute location. -1 if not available. Checks against internal active attribs.
 * @param attribute
 * @returns {number}
 */

Program.prototype.getAttribLocation = function(attribute){
    attribute = this._attributes[attribute];
    return attribute === undefined ? -1 : attribute;
};

/**
 * Returns true if the attribute is valid and active.
 * @param {String} [name] - The attribute name
 * @returns {boolean}
 */

Program.prototype.hasAttribute = function(name){
    return this._attributes[name] !== undefined;
};

/**
 * Returns true if the uniform is valid and active.
 * @param {String} [name] - The attribute name
 * @returns {boolean}
 */

Program.prototype.hasUniform = function(name){
    return this._uniforms[name] !== undefined;
};

/**
 * Returns all active attributes as map.
 * @returns {Object}
 */

Program.prototype.getAttributes = function(){
    return this._attributes;
};

/**
 * Returns all active uniforms as map.
 * @returns {Object}
 */
Program.prototype.getUniforms = function(){
    return this._uniforms;
};

/**
 * Get the number of active uniforms
 * @returns {Number}
 */

Program.prototype.getNumUniforms = function () {
    return this._numUniforms;
};

/**
 * Get the number of active attributes.
 * @returns {Number}
 */

Program.prototype.getNumAttributes = function () {
    return this._numAttributes;
};

/**
 * Activate the program.
 */

Program.prototype.bind = function () {
    var gl = this._gl;
    gl.useProgram(this._obj);
    var a = this._attributes;
    for(var k in a) {
        gl.enableVertexAttribArray(a[k]);
    }
    prevProgram = currProgram;
    currProgram = this;
};

/**
 * Deactivate the program.
 */

Program.prototype.unbind = function () {
    var gl = this._gl;
    var a = this._attributes;
    for(var k in a) {
        gl.disableVertexAttribArray(a[k]);
    }
    this._gl.useProgram(prevProgram ? prevProgram.getObjGL() : prevProgram);
    currProgram = prevProgram;
};

/**
 * Enables a vertex attribute array.
 * @param {String} name - The attribute name
 */

Program.prototype.enableVertexAttribArray = function(name){
    this._gl.enableVertexAttribArray(this._attributes[name]);
};

/**
 * Disables a vertex attribute array.
 * @param {String} name - The attribute name
 */

Program.prototype.disableVertexAttribArray = function(name){
    this._gl.disableVertexAttribArray(this._attributes[name]);
};

/**
 * Sets the locations and data formats  in a vertex attributes array.
 * @param {String} name - Target attribute name
 * @param {Number} size - Number of comps per attribute
 * @param {Number} {Number}type - Data type
 * @param {Boolean} normalized - If true, values are normalized when accessed
 * @param {Number}stride - Offset in bytes between vertex attributes
 * @param {Number} offset - Offset in bytes
 */

Program.prototype.vertexAttribPointer = function(name,size,type,normalized,stride,offset){
    this._gl.vertexAttribPointer(this._attributes[name],size,type,normalized,stride,offset);
}

/**
 * Assigns a value of type float to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Number} x - The value
 */

Program.prototype.uniform1f = function(name,x){
    this._gl.uniform1f(this._uniforms[name],x);
};

/**
 * Assigns a value of type 2d float to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Number} x - The value x
 * @param {Number} y - The value y
 */

Program.prototype.uniform2f = function(name,x,y){
    this._gl.uniform2f(this._uniforms[name],x,y);
};

/**
 * Assigns a value of type 3d float to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Number} x - The value x
 * @param {Number} y - The value y
 * @param {Number} z - The value z
 */

Program.prototype.uniform3f = function(name,x,y,z){
    this._gl.uniform3f(this._uniforms[name],x,y,z);
};

/**
 * Assigns a value of type 4d float to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Number} x - The value x
 * @param {Number} y - The value y
 * @param {Number} z - The value z
 * @param {Number} w - The value w
 */

Program.prototype.uniform4f = function(name,x,y,z,w){
    this._gl.uniform4f(this._uniforms[name],x,y,z,w);
};

/**
 * Assigns a value of type floating point vector array to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Float32Array} v - The array
 */

Program.prototype.uniform1fv = function(name,v){
    this._gl.uniform1fv(this._uniforms[name],v);
};

/**
 * Assigns a value of type floating point vector array to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Float32Array} v - The array
 */

Program.prototype.uniform2fv = function(name,v){
    this._gl.uniform2fv(this._uniforms[name],v);
};

/**
 * Assigns a value of type floating point vector array to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Float32Array} v - The array
 */

Program.prototype.uniform3fv = function(name,v){
    this._gl.uniform3fv(this._uniforms[name],v);
};

/**
 * Assigns a value of type floating point vector array to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Float32Array} v - The array
 */

Program.prototype.uniform4fv = function(name,v){
    this._gl.uniform4fv(this._uniforms[name],v);
};

/**
 * Assigns a value of type integer to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Number} x - The value
 */

Program.prototype.uniform1i = function(name,x){
    this._gl.uniform1i(this._uniforms[name],x);
};

/**
 * Assigns a value of type 2d integer to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Number} x - The value x
 * @param {Number} y - The value y
 */

Program.prototype.uniform2i = function(name,x,y){
    this._gl.uniform2i(this._uniforms[name],x,y);
};

/**
 * Assigns a value of type 3d integer to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Number} x - The value x
 * @param {Number} y - The value y
 * @param {Number} z - The value z
 */

Program.prototype.uniform3i = function(name,x,y,z){
    this._gl.uniform3i(this._uniforms[name],x,y,z);
};

/**
 * Assigns a value of type 4d integer to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Number} x - The value x
 * @param {Number} y - The value y
 * @param {Number} z - The value z
 * @param {Number} w - The value w
 */

Program.prototype.uniform4i = function(name,x,y,z,w){
    this._gl.uniform4i(this._uniforms[name],x,y,z,w);
};

/**
 * Assigns a value of type integer vector array to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Uint8Array|Uint16Array} v - The array
 */

Program.prototype.uniform1iv = function(name,v){
    this._gl.uniform1iv(this._uniforms[name],v);
};

/**
 * Assigns a value of type integer vector array to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Uint8Array|Uint16Array} v - The array
 */

Program.prototype.uniform2iv = function(name,v){
    this._gl.uniform2iv(this._uniforms[name],v);
};

/**
 * Assigns a value of type integer vector array to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Uint8Array|Uint16Array} v - The array
 */

Program.prototype.uniform3iv = function(name,v){
    this._gl.uniform3iv(this._uniforms[name],v);
};

/**
 * Assigns a value of type integer vector array to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Uint8Array|Uint16Array} v - The array
 */

Program.prototype.uniform4iv = function(name,v){
    this._gl.uniform4iv(this._uniforms[name],v);
};


/**
 * Assigns a value of type 2x2 matrix to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Boolean} transpose - If true, the value gets transposed
 * @param {Float32Array} value - The matrix
 */

Program.prototype.uniformMatrix2fv = function(name,transpose,value){
    this._gl.uniformMatrix2fv(this._uniforms[name],transpose,value);
};

/**
 * Assigns a value of type 3x3 matrix to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Boolean} transpose - If true, the value gets transposed
 * @param {Float32Array} value - The matrix
 */

Program.prototype.uniformMatrix3fv = function(name,transpose,value){
    this._gl.uniformMatrix3fv(this._uniforms[name],transpose,value);
};

/**
 * Assigns a value of type 4x4 matrix to a uniform variable.
 * @param {String} name - The uniform name
 * @param {Boolean} transpose - If true, the value gets transposed
 * @param {Float32Array} value - The matrix
 */

Program.prototype.uniformMatrix4fv = function(name,transpose,value){
    this._gl.uniformMatrix4fv(this._uniforms[name],transpose,value);
};

/**
 * Delete the program.
 */

Program.prototype.delete = function(){
    if(!this._obj){
        return;
    }
    this._gl.deleteProgram(this._obj);
    this._obj = null;
};

/**
 * Returns the underlying gl object.
 * @returns {WebGLProgram}
 */

Program.prototype.getObjGL = function(){
    return this._obj;
};

module.exports = Program;
