/**
 *
 * canvasGL.js Accelerated 2D drawing in WebGL
 *
 * canvasGL.js is available under the terms of the MIT license.  The full text of the
 * MIT license is included below.
 *
 * MIT License
 * ===========
 *
 * Copyright (c) 2012-2013 Henryk Wollik. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

var Context = require('./gl/Context');

var Default = {
    INIT_WIDTH : 800,
    INIT_HEIGHT : 600,
    FPS : 60
};

function CanvasGL(element){
    var parent = this.__parent = element || document.body;

    parent.style.width  = parent.style.width  || (Default.INIT_WIDTH  + 'px');
    parent.style.height = parent.style.height || (Default.INIT_HEIGHT + 'px');

    this.__context = null;

    var canvas3d = document.createElement('canvas'),
        canvas2d = document.createElement('canvas');

    this.__context = new Context(element,canvas3d,canvas2d);

    /*
     canvas3d.addEventListener('webglcontextlost',    this.__onWebGLContextLost.bind(this));
     canvas3d.addEventListener('webglcontextrestored',this.onWebGLContextRestored.bind(this),false);
     */

    this.__keyDown = false;
    this.__keyStr  = '';
    this.__keyCode = '';

    this.__mousePos        = [0,0];
    this.__mousePosLast    = [0,0];
    this.__mouseDown       = false;
    this.__mouseMove       = false;
    this.__mouseWheelDelta = 0.0;
    this.__hideCursor      = false;


    canvas3d.addEventListener('mousemove', this.__onMouseMove.bind(this));
    canvas3d.addEventListener('mousedown', this.__onMouseDown.bind(this));
    canvas3d.addEventListener('mouseup',   this.__onMouseUp.bind(this));
    canvas3d.addEventListener('mousewheel',this.__onMouseWheel.bind(this));

    canvas3d.addEventListener('keydown', this.__onKeyDown(this));
    canvas3d.addEventListener('keyup',   this.__onKeyUp(this));

    /*------------------------------------------------------------------------------------------------------------*/
    //  Setup anim
    /*------------------------------------------------------------------------------------------------------------*/

    this.__targetFps    = Default.FPS;
    this.__frameNum     = 0;
    this.__time         = 0;
    this.__timeStart    = -1;
    this.__timeNext     = 0;
    this.__timeInterval = this.__targetFps / 1000.0;
    this.__timeDelta    = 0;
    this.__timeElapsed  = 0;

    this.__noLoop = false;

    window.requestAnimationFrame = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame;



    this.__setup();
    this.__initDrawLoop();

    /*------------------------------------------------------------------------------------------------------------*/

    parent.appendChild(canvas3d);
    return this;
}

// Override in sublclass
CanvasGL.prototype.onNotAvailable = function(){};

/**
 * Return the underlying gl context, better for profiling.
 * @returns {Context}
 */

CanvasGL.prototype.getContext = function(){
    return this.__context;
};

/*------------------------------------------------------------------------------------------------------------*/
// input
/*------------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.__onMouseMove = function(e){
    this.__mousePosLast[0] = this.__mousePos[0];
    this.__mousePosLast[1] = this.__mousePos[1];
    this.__mousePos[0] = e.offsetX; // TODO: non-chrome
    this.__mousePos[1] = e.offsetY;
    this.onMouseMove(e);
};

CanvasGL.prototype.__onMouseDown = function(e){
    this.__mouseDown = true;
    this.onMouseDown(e);
};

CanvasGL.prototype.__onMouseUp = function(e){
    this.__mouseDown = false;
    this.onMouseUp(e);
};

CanvasGL.prototype.__onMouseWheel = function(e){
    this.__mouseWheelDelta += Math.max(-1,Math.min(1, e.wheelDelta)) * -1;
    this.onMouseWheel(e);
};

CanvasGL.prototype.__onKeyDown = function(e){
    this.__keyDown = true;
    this.__keyCode = e.keyCode;
    this.__keyStr  = String.fromCharCode(e.keyCode);//not reliable;
    this.onKeyDown(e);
};

CanvasGL.prototype.__onKeyUp = function(e){
    this.__keyDown = false;
    this.__keyCode = e.keyCode;
    this.__keyStr  = String.fromCharCode(e.keyCode);
    this.onKeyUp(e);
};


/*------------------------------------------------------------------------------------------------------------*/
// Canvas dimensions
/*------------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.size = function(width,height){
    var ctx = this.__context;
    if(ctx){
        ctx._setSize(width,height);
        if(this.__noLoop){
            this.__draw();
        }

    }
};

CanvasGL.prototype.width = function () {
    var context = this.__context;
    if(!context){
        return null;
    }
    return context._getWidth_internal();
};
CanvasGL.prototype.height = function () {
    var context = this.__context;
    if(!context){
        return null;
    }
    return context._getHeight_internal();
};


/*------------------------------------------------------------------------------------------------------------*/
// Animation
/*------------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.noLoop = function(){
    this.__noLoop = true;
};

CanvasGL.prototype.__initDrawLoop = function(){
    if(!this.__noLoop){
        var time, timeDelta;
        var timeInterval = this.__timeInterval;
        var timeNext;
        var self = this;
        function drawLoop(){
            requestAnimationFrame(drawLoop,null);

            time      = self.__time = Date.now();
            timeDelta = time - self.__timeNext;
            self.__timeDelta = Math.min(timeDelta / timeInterval, 1);

            if(timeDelta > timeInterval){
                timeNext = self.__timeNext = time - (timeDelta % timeInterval);

                self.__draw();

                self.__timeElapsed = (timeNext - self.__timeStart) / 1000.0;
                self.__frameNum++;
            }
        }

        drawLoop();
    } else {
        this.__draw();
    }
};

CanvasGL.prototype.__setup = function(){
    this.__timeStart = Date.now();
    this.setup();
};

CanvasGL.prototype.__draw = function(){
    this.__context._preDraw();
    this.draw();
};

// Override in subclass
CanvasGL.prototype.setup = function(){};

// Override in subclass
CanvasGL.prototype.draw = function(){};


CanvasGL.prototype.fps = function (fps) {
    this.__targetFps = fps;
    this.__timeInterval = this.__targetFps / 1000.0;
};

CanvasGL.prototype.getFps = function () {
    return this.__targetFps;
};

CanvasGL.prototype.frames = function () {
    return this.__frameNum;
};

CanvasGL.prototype.secondsElapsed = function () {
    return this.__timeElapsed;
};

CanvasGL.prototype.time = function () {
    return this.__time
};

CanvasGL.prototype.timeStart = function () {
    return this.__timeStart;
};

CanvasGL.prototype.timeDelta = function () {
    return this.__timeDelta;
};

/*---------------------------------------------------------------------------------------------------------*/
// Input
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.isKeyDown          = function(){return this.__keyDown;};
CanvasGL.prototype.isMouseDown        = function(){return this.__mouseDown;};
CanvasGL.prototype.isMouseMove        = function(){return this.__mouseMove;};
CanvasGL.prototype.getKeyCode         = function(){return this.__keyCode;};
CanvasGL.prototype.getKeyStr          = function(){return this.__keyStr;};

CanvasGL.prototype.getMousePos        = function(){return this.__mousePos;};
CanvasGL.prototype.getMousePosLast    = function(){return this.__mousePosLast;};
CanvasGL.prototype.getMousePosX       = function(){return this.__mousePos[0];};
CanvasGL.prototype.getMousePosY       = function(){return this.__mousePos[1];};
CanvasGL.prototype.getMousePosXLast   = function(){return this.__mousePosLast[0];};
CanvasGL.prototype.getMousePosYLast   = function(){return this.__mousePosLast[1];};

CanvasGL.prototype.getMouseWheelDelta = function(){return this.__mouseWheelDelta;};

//Override in subclass
CanvasGL.prototype.onMouseMove  = function(e){};
CanvasGL.prototype.onMouseDown  = function(e){};
CanvasGL.prototype.onMouseUp    = function(e){};
CanvasGL.prototype.onMouseWheel = function(e){};
CanvasGL.prototype.onKeyDown    = function(e){};
CanvasGL.prototype.onKeyUp      = function(e){};


CanvasGL.prototype.saveToPNG = function(){
    if(this.__context){
        window.open(this._canvas3d.toDataURL('image/png'));
    }
};

/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.prototype.getSSAAFactor = function(){return this.__context._getSSAAFactor();};

/*---------------------------------------------------------------------------------------------------------*/
// Exports
/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.CENTER = Context.CENTER;
CanvasGL.CORNER = Context.CORNER;
CanvasGL.WRAP   = Context.WRAP;
CanvasGL.CLAMP  = Context.CLAMP;
CanvasGL.REPEAT = Context.REPEAT;

CanvasGL.FUNC_ADD                = Context.FUNC_ADD;
CanvasGL.FUNC_SUBSTRACT          = Context.FUNC_SUBTRACT;
CanvasGL.FUNC_REVERSE_SUBSTRACT = Context.FUNC_REVERSE_SUBTRACT;

CanvasGL.ZERO = Context.ZERO;
CanvasGL.ONE  = Context.ONE;

CanvasGL.SRC_ALPHA = Context.SRC_ALPHA;
CanvasGL.SRC_COLOR = Context.SRC_COLOR;

CanvasGL.ONE_MINUS_SRC_ALPHA = Context.ONE_MINUS_SRC_ALPHA;
CanvasGL.ONE_MINUS_SRC_COLOR = Context.ONE_MINUS_SRC_COLOR;

CanvasGL.TRIANGLE_STRIP = Context.TRIANGLE_STRIP;
CanvasGL.TRIANGLE_FAN   = Context.TRIANGLE_FAN;

CanvasGL.TOP    = Context.TOP;
CanvasGL.MIDDLE = Context.MIDDLE;
CanvasGL.BOTTOM = Context.BOTTOM;

CanvasGL.THIN    = Context.THIN;
CanvasGL.REGULAR = Context.REGULAR;
CanvasGL.BOLD    = Context.BOLD;

CanvasGL.RGBA          = Context.RGBA;
CanvasGL.RGB           = Context.RGB;
CanvasGL.FLOAT         = Context.FLOAT;
CanvasGL.UNSIGNED_BYTE = Context.UNSIGNED_BYTE;

CanvasGL.SQUARE = Context.SQUARE;
CanvasGL.ROUND  = Context.ROUND;

CanvasGL.ARRAY_BUFFER = Context.ARRAY_BUFFER;
CanvasGL.ELEMENT_ARRAY_BUFFER = Context.ELEMENT_ARRAY_BUFFER;

/*---------------------------------------------------------------------------------------------------------*/

CanvasGL.Math       = require('./math/Math');

module.exports = CanvasGL;