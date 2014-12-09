
Draft

#CanvasGL.js 

###A javascript library for accelerated 2d graphics on top of WebGL

*(Discontinued research project – 2013, Documentation of the prototype)*

*This mainly focuses on generating 2d graphics in browser environments, on sketching visual ideas with software – not for production. Effectively a faster Processing.js, a more performant version of Processing for the browser.*

--


[Abstract](#abstract) – [Example Canvas Direct Mode](#example-canvas-optimisations) – [WebGL Implementation](#webgl-implementation) – [CanvasGL.js Example](#canvasgl.js-example) – [Prototype Documentation](#prototype-documentation) – [Latest stable version](#latest-stable-version) – [Last development state](#last-development-state)

--

##Abstract

Being able to express ideas fast is very crucial to the success of developing visual prototypes. Not only because of potential initial time restrictions but also because of being able to fast iterate and progress an idea. In terms of rapidly iterating visually with software this means being able to translate a visual idea as direct as possible to an artificial canvas by *reducing the amount of instructions to execute that idea to an absolute minimum*.

One might say that writing:

    line(fromX,fromY,toX,toY); //as a direct command

obviously seems a more direct translation compared to:

    LineObject obj = new LineObject(); //init the object first
    //
    obj.set(fromX,fromY,toX,toY); //alter its state later
    obj.draw(); //and draw it afterwards
    
    //or
    
    objManager.add(new LineObject()); //add a new one to an obj manager
    //
    obj.set(fromX,fromY,toX,toY); //alter its state later
    //and the objects gets drawn sometimes later 
    

The last ones are more declarative approaches handling model representations. 

In the context of < canvas > this is often used by libraries and frameworks to actually handle an underlying immediate mode api. The main reasons for doing this (next to extending primitives with additional functionality) is because the objects are part of a scene graph, for processing them effectively by checking for state changes, overlapping and visibility, checking if they are within the canvas boundary or batch processing multiple objects of the same type and handling user interaction, or because most of them are they just textured sprites. 

##Example canvas optimisation

Developing strategies to enhance render speed is very crucial to working with the canvas element, because in comparison to native renderer outside the browser environment drawing by itself already is a quite expensive task and therefor you can hit bottlenecks really fast. This forces you to optimise your program and at the end you may spend more time enhancing your ---- code ---- than actually iterating your visual idea. 

This is even more important than 

Naive approach:

    function line(x0,y0,x1,y0){
        ctx.beginPath();
        ctx.moveTo(x0,y0);
        ctx.lineTo(y1,y2);
        ctx.stroke();
    }
    
Checking implementation    
       
    function line(x0,y0,x1,y1){
        if(!stroke){ //of course, if there is no stroke don't draw
            return;
        }
    
        if(drawFuncLast != line ){ //if the previous shape is no line, close it
            ctx.stroke();
        }
        
        if(x0 == x1 && y0 == y1){ //if start == end, return a point
            drawCheapPointWithSameLineWidth();
            return;
        }
        
        if(lineLast.x0 != x0 || lineLast.x1 != x1){ //
            ctx.moveTo(x0,y0);
            
            lineLast.x0 = x0;
            lineLast.y0 = y0;
        }
        ctx.lineTo(x1,y1);
        
        drawFuncLast = line;
    }


-


Some example optimisations for an enhanced direct mode.

#####Flush fill vs. direct fill

>A quick test to see if filling group of shapes is more performant than filling each shape separately. FillStyle is wrapped to imitate the processing api, in 'normal' mode 'fill' just sets the current fillStyle, ellipse() constructs a new path via 'beginPath' and immediately closes it by applying the fillStyle with 'fill'. In 'flush' mode 'fill' already begins to construct a new path via 'beginPath' right after setting the fillStyle. All subsequent calls to ellipse only append new path segments to the same path. The current path gets closed by calling 'fill' again or automatically right after draw().

>'Flush' filling shape segments increases the frame rate about 2-4 fps when drawing large amount of shapes, but introduces some fill order errors. Calling fill right after a single shape is finished is actually faster when dealing with smaller amounts of shapes (max.2500).

>[See gist on b.locks.org](http://bl.ocks.org/automat/653c7ba3489f1005c2b1)


#####Caching primitives

>Draw-calls are stacked and processed at the end of the draw loop. The shape to be drawn is rendered on an off-screen canvas, if the required shape is larger than the buffered one, the off-screen version gets updated otherwise a scaled down version will be drawn on the target canvas. Colored versions of the off-screen shape are stored into a lookup-table and updated if the base shape changes.

>Obviously this works best if the color palette is limited.


>[See gist on b.locks.org](http://bl.ocks.org/automat/30eca5fd17642380e549)



Developing those kind of strategies is crucial when working with < canvas >, because drawing already is a quite an expensive task and in combination with other expensive processes, theres often not much computational power.

To increase the blab, Hello WebGL.




The goal of CanvasGL.js was to develop an optimized 

<!--
but still keeping a more direct translation of drawing commands like the example above. 


 
Processing e.g does this really well by wrapping its primitve models into more direct geometric primitive calls, which basically just alter the state of the same object.

    void ellipse(float x, float y, float width, float height){
        internalObjEllipse.set(x,y,width,height);
        internalObjEllipse.draw();
    }
 -->

- declerative retained mode primitive representation
- drawing by command not by objects
<!--
- staying in context of the current idea, not jumping between object initialisation and drawing commands
-->
- retained mode element that represents an immediate mode procedure
- primitive objects with extendend properties reflect direct mode

##WebGL Implementation

###Prototype v.1 

[Stable version see here](#latest-stable-version)
<!---
- every primitive has is one vertex buffer, buffer length only gets changed if the primitive properties change and need more vertices, otherwise the buffer just gets 
- in case of ellipses and circles there is an predefined maximum number of segments which defines the buffer size, e.g. max 60 segments, therefore the length of the buffer does not have to be changed, 
- every primitive has a color buffer, which gets updated every time the amount of  vertices change, or when the color changes

- Note that constantly calling drawElements or drawArray is expensive
- batching draw calls, in simplest form providing methods which transform a whole set of geometry
-  batching drawcalls by checking previous drawcalls

- Note: I

- Polyline implementation

--->
###Prototype v.2

Last state of development

- render primitive to fbo, recurring calls will use a quad textured 

- ANGLE_INSTANCING_ARRAYS



###Latest stable versions

[Branch](https://github.com/automat/canvasGL.js/tree/stable-r00) & [Zip](https://github.com/automat/canvasGL.js/archive/0.0.1.zip) 

*Note: This version only has some – no* 

####Usage

Just include CanvasGL.js

    <script type="text/javascript" src="canvasGL.js"></script>
    


###Last development state

Current master branch
This one uses the common.js pattern via browserify. First link the development version.

    npm link canvasgl

And then within:

    var CanvasGL = require('canvasgl');
    
    
Notes

    - circle stroke broken
    - polygon() imply missing
    - ...
    
    
    

##Prototype Documentation

This is mainly modelled after the [Processing API](https://www.processing.org/reference/) and to be used with [prototype v.1](#latest-stable-version) 





