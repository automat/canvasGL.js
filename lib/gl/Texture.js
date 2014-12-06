var gl_   = require('./gl'),
    _Math = require('../math/Math');

/**
 * Texture
 * @param {Uint8Array|Float32Array|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} data - The data
 * @param {Number} width - Data width
 * @param {Number} height - Data height
 * @param {Texture.Format} [format] - The format
 * @constructor
 */

function Texture(data,width,height,format){
    if(!data){
        throw new Error('TEXTURE: Data is null');
    }

    format = format ? format.copy() : new Texture.Format();
    var gl = this._gl = gl_.get();

    var pot = _Math.isPOT(width) && _Math.isPOT(height);

    if(!pot && (format.wrapS == gl.REPEAT || format.wrapT == gl.REPEAT)){
        throw new Error('TEXTURE: Texture size must be power of 2 if wrapmode REPEAT is used.');
    }
    var prevObj = gl.getParameter(gl.TEXTURE_BINDING_2D);
    var obj = this._obj = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, obj);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

    if(format.mipmapping){
        if(pot){
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            throw new Error('TEXTURE: Texture size must be power of 2 when using mipmapping.');
        }
    }


    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, format.minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, format.magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, format.wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, format.wrapT);


    this._width = width;
    this._height = height;
    this._format = format || new Texture.Format();
    this._unit = 0;

    if(data instanceof HTMLImageElement||
        data instanceof HTMLCanvasElement||
        data instanceof HTMLVideoElement){
        gl.texImage2D(gl.TEXTURE_2D, 0, format.dataFormatInternal, format.dataFormat, format.dataType, data);
    } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, format.dataFormatInternal, width, height, 0, format.dataFormat, format.dataType, data);
    }

    gl.bindTexture(gl.TEXTURE_2D, prevObj);
}
/**
 * Returns the webgl texture.
 * @returns {WebGLTexture}
 */

Texture.prototype.getGLTexture = function(){
    return this._texture;
};

/**
 * Texture properties
 * @constructor
 */

Texture.Format = function(){
    var gl = gl_.get();
    this.wrapS = this.wrapT = gl.CLAMP_TO_EDGE;
    this.minFilter = this.magFilter = gl.LINEAR;
    this.mipmapping = false;
    this.dataFormatInternal = gl.RGBA;
    this.dataFormat = gl.RGBA;
    this.dataType = gl.UNSIGNED_BYTE;
};

/**
 * Returns a copy of the format.
 * @param {Texture.Format} [format] - Out format
 * @returns {Texture.Format}
 */

Texture.Format.prototype.copy = function(format){
    format = format || new Texture.Format();
    format.wrapS = this.wrapS;
    format.wrapT = this.wrapT;
    format.minFilter = this.minFilter;
    format.magFilter = this.magFilter;
    format.mipmapping = this.mipmapping;
    format.dataFormatInternal = this.dataFormatInternal;
    format.dataFormat = this.dataFormat;
    format.dataType = this.dataType;
    return format;
};

/**
 * Returns the textures format.
 * @returns {Number}
 */

Texture.prototype.getFormat = function(){
    return this._format;
};

/**
 * Returns the width of the texture.
 * @returns {Number}
 */

Texture.prototype.width = function(){
    return this._width;
};

/**
 * Returns the height of the texture
 * @returns {Number}
 */

Texture.prototype.height = function(){
    return this._height;
};

/**
 * Returns the size of the texture.
 * @param {Array} [v] - Out size
 * @returns {Array}
 */

Texture.prototype.getSize = function(v){
    v = v || [0,0];
    v[0] = this._width;
    v[1] = this._height;
    return v;
};

/**
 * Activates & binds the texture.
 * @param {Number} [unit] - The texture unit
 */

Texture.prototype.bind = function(unit){
    var gl = this._gl;

    if(unit !== undefined){
        gl.activeTexture(gl.TEXTURE0 + unit);
        this._unit = unit;
    }
    gl.bindTexture(gl.TEXTURE_2D, this._obj);
};

/**
 * Unbind the texture
 * @param unit
 */

Texture.prototype.unbind = function(unit){
    var gl = this._gl;
    if(unit !== undefined){
        gl.activeTexture(gl.TEXTURE0 + unit);
    } else {
        gl.activeTexture(gl.TEXTURE0 + this._unit);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
};

/**
 * Writes new data to the texture.
 * @param {Uint8Array|Float32Array} data - The data
 * @param {Number} [offsetX]
 * @param {Number} [offsetY]
 * @param {Number} [width]
 * @param {Number} [height]
 */

Texture.prototype.writeData = function(data,offsetX,offsetY,width,height){
    var gl = this._gl;
    var prevActive = gl.getParameter(gl.ACTIVE_TEXTURE);
    var unit = gl.TEXTURE0 + this._unit;
    if(unit != prevActive){
        gl.activeTexture(unit);
    }
    gl.texSubImage2D(gl.TEXTURE_2D, 0, offsetX || 0,
        offsetY || 0,
        width === undefined ? this._width : width,
        height === undefined ? this._height : height,
        this._format.dataFormat, this._format.dataType, data);

    if(unit != prevActive){
        gl.activeTexture(prevActive);
    }
};


/**
 * Delete the texture.
 */

Texture.prototype.delete = function(){
    this._gl.deleteTexture(this._obj);
    this._width = 0;
    this._height = 0;
};

/**
 * Returns a new white texture.
 * @returns {Texture}
 */

Texture.createBlank = function(){
    var format = new Texture.Format();
    format.dataType = gl_.get().UNSIGNED_BYTE;
    return new Texture(new Uint8Array([1,1,1,1]),1,1,format);
};

/**
 * Returns a new texture form an image
 * @param {HTMLImageElement} image
 * @param {Format} [format] - Optional texture format
 * @returns {Texture}
 */

Texture.createFromImage = function(image,format){
    return new Texture(image,image.width,image.height,format);
};

/**
 * Returns a randomly pixelated texture.
 * @param {Number} width - The width
 * @param {Number} height - The height
 * @param {Texture.Format} [format] - The format
 * @param {Number} [valueR] - Optional fixed red value, random if null
 * @param {Number} [valueG] - Optional fixed green value, random if null
 * @param {Number} [valueB] - Optional fixed blue value, random if null
 * @param {Number} [valueA] - Optional fixed alpha value, random if null
 * @returns {Texture}
 */

Texture.createRandom = function(width,height,format,valueR,valueG,valueB,valueA){
    format = format || new Texture.Format();

    var gl   = gl_.get(),
        size = width * height,
        data;
    var validValueR = valueR !== undefined && valueR != null,
        validValueG = valueG !== undefined && valueG != null,
        validValueB = valueB !== undefined && valueB != null,
        validValueA = valueA !== undefined && valueA != null;

    var i = -1;
    data = new Float32Array(size * 4);
    //TODO: split
    //
    //if(format.dataFormat == gl.RGBA){
    //    if(format.dataType == gl.FLOAT){
    //        data = new Float32Array(size * 4);
    //        while(++i < size){
    //            data[i * 4    ] = validValueR ? valueR : Random.randomFloat();
    //            data[i * 4 + 1] = validValueG ? valueG : Random.randomFloat();
    //            data[i * 4 + 2] = validValueB ? valueB : Random.randomFloat();
    //            data[i * 4 + 3] = validValueA ? valueA : Random.randomFloat();
    //        }
    //    } else {
    //        data = new Uint8Array(size * 4);
    //        while(++i < size){
    //            data[i * 4    ] = validValueR ? valueR : Random.randomInteger(0,255);
    //            data[i * 4 + 1] = validValueG ? valueG : Random.randomInteger(0,255);
    //            data[i * 4 + 2] = validValueB ? valueB : Random.randomInteger(0,255);
    //            data[i * 4 + 3] = validValueA ? valueA : Random.randomInteger(0,255);
    //        }
    //    }
    //} else {
    //    if(format.dataType == gl.FLOAT){
    //        data = new Float32Array(size * 3);
    //        while(++i < size){
    //            data[i * 3    ] = validValueR ? valueR : Random.randomFloat();
    //            data[i * 3 + 1] = validValueG ? valueG : Random.randomFloat();
    //            data[i * 3 + 2] = validValueB ? valueB : Random.randomFloat();
    //        }
    //    } else {
    //        data = new Uint8Array(size * 3);
    //        while(++i < size){
    //            data[i * 3    ] = validValueR ? valueR : Random.randomInteger(0,255);
    //            data[i * 3 + 1] = validValueG ? valueG : Random.randomInteger(0,255);
    //            data[i * 3 + 2] = validValueB ? valueB : Random.randomInteger(0,255);
    //        }
    //    }
    //}
    return new Texture(data,width,height,format);
};

/**
 * Returns the current texture's unit.
 * @returns {number}
 */

Texture.prototype.getUnit = function(){
    return this._unit;
};

/*
 Texture.createFromCanvas = function(canvas){

 };

 Texture.createFromGLObj = function(obj){

 };
 */


module.exports = Texture;


