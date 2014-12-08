
Draft & Still very deutsch

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

###Constructor

####CanvasGL(parentDomElementId, width, height) -> {CanvasGL}

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| parentDomElementId   | String   | Target dom parent element                      |
| width     | Number   | Width of the canvas                               |
| height    | Number   | Height of the canvas                              |

###States & Primitive Properties

####canvas.setSize(width,height) -> {void}

Modifies the size of the canvas.

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| width     | Number   | New width of the canvas                           |
| height    | Number   | New height of the canvas                          |

####canvas.setEllipseMode(mode) -> {void}

Sets origin mode to be used by circle() and ellipse()

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| mode      | String   | CanvasGL.CORNER, CanvasGL.CENTER                  |

####canvas.setRectMode(mode) -> {void}

Sets origin mode to be used by rect()

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| mode      | String   | CanvasGL.CORNER, CanvasGL.CENTER                  |

####canvas.setEllipseDetail(a) -> {void}

Sets the number of segments to be used by circle()  and ellipse()

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| a         | Number   | Positive integer <= 50                            |

####canvas.setBezierDetail(a) -> {void}

Sets the number of segments to be used by bezier()

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| a         | Number   | a >= 0 && a <= 50                                 |

####canvas.setCurveDetail(a) -> {void}

Sets the number of segments to be used by curve()

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| a         | Number   | a >= 0 && a <= 50                                 |

####canvas.setCornerDetail(a) -> {void}

Sets the number of segments to be used by roundRect()

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| a         | Number   | a >= 0 && a <= 10                                 |

####canvas.setLineWidth(a) -> {void}

Sets the line width & stroke width

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| a         | Number   | a >= 0                                            |

####canvas.setTextureWrap(mode) -> {void}

Sets the texture wrap mode.

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| mode      | String   | CanvasGL.WRAP, CanvasGL.REPEAT, CanvasGL.CLAMP    |

####canvas.getEllipseDetail() -> {Number}

Returns the current ellipse detail.

####canvas.getBezierDetail() -> {Number}

Returns the current bezier detail.

####canvas.getCurveDetail() -> {Number}

Returns the current curve detail.

####canvas.enableBlend() -> {void}

Enables alpha blending.

####canvas.disableBlend() -> {void}

Disables alpha blending.

###Shape Fill, Stroke & Texture

####canvas.fill() -> {void}

Activates fill mode, and specifies fill color in integers [0->255], alpha in floats [0->1.0].

| Args      | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| none      |          | fill color defaults to r=0,g=0,b=0,a=1.0          |
| k         | Number   | fill color r=k,g=k,b=k,a=1.0                      |
| k,a       | Number   | fill color r=k,g=k,b=k,a=a                        |
| r,g,b     | Number   | fill color r=r,g=g,b=b,a=1.0                      |
| r,g,b,a   | Number   | fill color r=r,g=g,b=b,a=a                        |


####canvas.fill1{i,f}(k) -> {void}

Activates fill mode and specifies fill color in integers [0->255, fill1i] and floats [0->1.0, fill1f], alpha in floats [0->1.0].

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| k         | Number   | fill color r=k,g=k,b=k,a=1.0                      |

####canvas.fill2{i,f}(k,a) -> {void}

Activates fill mode and specifies fill color in integers [0->255, fill2i] and floats [0->1.0, fill2f], alpha in floats [0->1.0].

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| k,a       | Number   | fill color r=k,g=k,b=k,a=a                        |

####canvas.fill3{i,f}(r,g,b) -> {void}

Activates fill mode and specifies fill color in integers [0->255, fill3i] and floats [0->1.0, fill3f], alpha in floats [0->1.0].

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| r,g,b     | Number   | fill color r=r,g=g,b=b,a=1.0                      |

####canvas.fill4{i,f}(r,g,b,a) -> {void}

Activates fill mode and specifies fill color in integers [0->255, fill4i] and floats [0->1.0, fill4f], alpha in floats [0->1.0].

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| r,g,b,a   | Number   | fill color r=r,g=g,b=b,a=a                        |

####canvas.fillArr(a) -> {void}

Activates fill mode and specifies a fill color array in integers[0->255].

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| a         | Array    | [r,g,b,a,r,g,b,a,...]                             |

####canvas.fillArr{I,F}(a) -> {void}

Activates fill mode and specifies a fill color array in integers[0->255, fillArrI] and floats [0->1.0,filler];

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| a         | Array    | [r,g,b,a,r,g,b,a,...]                             |

####canvas.noFill() -> {void}

Deactivates fill mode.

####canvas.stroke() -> {void}

Activates stroke mode, and specifies stroke color in integers [0->255], alpha in floats [0->1.0].

| Args      | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| none      |          | stroke color defaults to r=0,g=0,b=0,a=1.0        |
| k         | Number   | stroke color r=k,g=k,b=k,a=1.0                    |
| k,a       | Number   | stroke color r=k,g=k,b=k,a=a                      |
| r,g,b     | Number   | stroke color r=r,g=g,b=b,a=1.0                    |
| r,g,b,a   | Number   | stroke color r=r,g=g,b=b,a=a                      |

####canvas.stroke1{i,f}(k) -> {void}

Activates stroke mode and specifies stroke color in integers [0->255, stroke1i] and floats [0->1.0, stroke1f], alpha in floats [0->1.0].

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| k         | Number   | stroke color r=k,g=k,b=k,a=1.0                    |

####canvas.stroke2{i,f}(k,a) -> {void}

Activates stroke mode and specifies stroke color in integers [0->255, stroke2i] and floats [0->1.0, stroke2f], alpha in floats [0->1.0].

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| k,a       | Number   | strok color r=k,g=k,b=k,a=a                       |

####canvas.stroke3{i,f}(r,g,b) -> {void}

Activates stroke mode and specifies stroke color in integers [0->255, stroke3i] and floats [0->1.0, stroke3f], alpha in floats [0->1.0].

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| r,g,b     | Number   | strok color r=r,g=g,b=b,a=1.0                     |

####canvas.stroke4{i,f}(r,g,b,a) -> {void}

Activates stroke mode and specifies stroke color in integers [0->255, stroke4i] and floats [0->1.0, stroke4f], alpha in floats [0->1.0].

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| r,g,b,a   | Number   | stroke color r=r,g=g,b=b,a=a                      |

####canvas.strokeArr(a) -> {void}

Activates stroke mode and specifies a stroke color array in integers[0->255].

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| a         | Array    | [r,g,b,a,r,g,b,a,...]                             |

####canvas.strokeArr{I,F}(a) -> {void}

Activates stroke mode and specifies a stroke color array in integers[0->255, strokeArrI] and floats [0->1.0,strokeArrF];

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| a         | Array    | [r,g,b,a,r,g,b,a,...]                             |

####canvas.noStroke() -> {void}

Deactivates stroke mode.

####canvas.tint(a) -> {void}

Sets the interpolation amount between the current fill color and texture color.

####canvas.noTint() -> {void}

Deactivates interpolation between fill and texture color.

####canvas.setUVOffset(offsetU,offsetV,textureWidth,textureHeight) -> {void}

Sets the general uv texture offset.

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| offsetU   | Number   | horizontal offset                                 |
| offsetV   | Number   | vertical offset                                   |
| textureWidth  | Number   | horizontal textureScale                       |
| textureHeight  | Number   | vertical textureScale                        |

####canvas.resetUVOffset -> {void}

Resets the general texture offset.

####canvas.setUVQuad(u0,v0,u1,v1,u2,v2,u3,v3) -> {void}

Sets texture uv coordinates for quads.

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| u0        | Number   | horizontal value first coordinate                 |
| v0        | Number   | vertical value first coordinate                   |
| u1        | Number   | horizontal value second coordinate                |
| v1        | Number   | vertical value second coordinate                  |
| u2        | Number   | horizontal value third coordinate                 |
| v2        | Number   | vertical value third coordinate                   |
| u3        | Number   | horizontal value fourth coordinate                |
| v3        | Number   | vertical value fourth coordinate                  |


####canvas.resetUVQuad() -> {void}

Resets quad texture uv coordinates to [0,0,1,0,0,1,1,1].

####canvas.setUVTriangle(u0,v0,u1,v1,u2,v2) -> {void}

Sets texture uv coordinates for triangles.

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| u0        | Number   | horizontal value first coordinate                 |
| v0        | Number   | vertical value first coordinate                   |
| u1        | Number   | horizontal value second coordinate                |
| v1        | Number   | vertical value second coordinate                  |
| u2        | Number   | horizontal value third coordinate                 |
| v2        | Number   | vertical value third coordinate                   |

####canvas.resetUVTriangle() -> {void}

Resets triangle texture uv coordinates to [0,0,1,0,0,1,1,1].

####canvas.texture(img) -> {void}

Activates texture mode and sets an image to be used as texture.

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| img       | CanvasGLImage  | texture image                               |

####canvas.noTexture() -> {void}

Deactivates textre mode.

####canvas.blend(src,dst) -> {void}

Enables alpha blending.

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| src       | String   | texture image                                     |
| dst       | String   | texture image                                     |


####canvas.resetBlend() -> {void}

Disables texture mode.

####canvas.background() -> {void}

Clears the canvas with a specified color and resets all states. 

| Args      | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| none      |          | background color defaults to r=0,g=0,b=0,a=1.0    |
| k         | Number   | background color r=k,g=k,b=k,a=1.0                |
| k,a       | Number   | background color r=k,g=k,b=k,a=a                  |
| r,g,b     | Number   | background color r=r,g=g,b=b,a=1.0                |
| r,g,b,a   | Number   | background color r=r,g=g,b=b,a=a                  |

####canvas.clearColorBuffer() -> {void}

Manually clears the color buffer. 

###Drawing Primitives

####canvas.quad(x0,y0,x1,y1,x2,y2,x3,y3) -> {void}

Draws a quad.

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| x0        | Number   | x value of the first point                        |
| y0        | Number   | y value of the first point                        |
| x1        | Number   | x value of the second point                       |
| y1        | Number   | y value of the second point                       |
| x2        | Number   | x value of the third point                        |
| y2        | Number   | y value of the third point                        |
| x3        | Number   | x value of the fourth point                       |
| y3        | Number   | y value of the fourth point                       |

####canvas.rect(x,y,width,height) -> {void}

Draws a rectangle.

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| x         | Number   | x value origin, relative to rectMode              |
| y         | Number   | y value origin, relative to rectMode              |
| width     | Number   | width of the rectangle                            |
| height    | Number   | height of the rectangle                           |

####canvas.roundRect(x,y,width,height,cornerRadius) -> {void}

Draws a rounded rectangle.

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| x         | Number   | x value origin, relative to rectMode              |
| y         | Number   | y value origin, relative to rectMode              |
| width     | Number   | width of the rectangle                            |
| height    | Number   | height of the rectangle                           |
| cornerRadius | Number | radius of the rectangle corners                  |

####canvas.ellipse(x,y,radiusX,radiusY) -> {void}

Draws an ellipse.

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| x         | Number   | x value origin, relative to ellipseMode           |
| y         | Number   | y value origin, relative to ellipseMode           |
| radiusX   | Number   | horizontal radius                                 |
| radiusY   | Number   | vertical radius                                   |

####canvas.circle(x,y,radius) -> {void}

Draws a circle.

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| x         | Number   | x value origin, relative to ellipseMode           |
| y         | Number   | y value origin, relative to ellipseMode           |
| radius    | Number   | horizontal & vertical radius                      |

####canvas.circles(positions,radii,fillColors,strokeColors) -> {void}

Draws a set of circles. *(Note: In contrast to v.2 this only calls circle internally, instead of processing the data in one vertex buffer.)*

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| positions | Array    | [x,y,x,y,x,y,...], relative to ellipseMode        |
| radii     | Array    | radius of every circle                            |
| fillColors | Array   | [optional], fillColor for every circle, else fill  |
| strokeColors | Array | [optional], strokeColor for every circle, else stroke |

####canvas.arc(centerX,centerY,radiusX,radiusY,startAngle,stopAngle,innerRadiusX,innerRadiusY) -> {void}

Draws an arc. 

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| x         | Number   | x value origin, relative to ellipseMode           |
| y         | Number   | y value origin, relative to ellipseMode           |
| radiusX   | Number   | horizontal radius                                 |
| radiusY   | Number   | vertical radius                                   |
| startAngle | Number  | arc start angle                                   |
| stopAngle | Number   | arc end angle                                     |
| innerRadiusX | Number | horizontal inner radius                          |
| innerRadiusY | Number | vertical inner radius                            |                                      

####canvas.line() -> {void}

Draws a line.

| Arg       | Type     | Description                                       |
| --------- | -------- | ------------------------------------------------- |
| array     | Array    | [startX,startY,endX,endY]                         |
| x0,y0,x1,y1 | Array  | startX=x0,startY=y0,endX=x1,endY=y1               |

####canvas.lines(lines,strokeColors,strokeWeight) -> {void}

Draws a continuous line.



####canvas.bezier(x0,y0,x1,y1,x2,y2,x3,y3) -> {void}

####canvas.bezierPoint(d) -> {Array}

####canvas.bezierTangentAngle(d) -> {Number}

####canvas.curve(points) -> {void}

####canvas.beginCurve() -> {void}

####canvas.endCurve() -> {void}

####canvas.curveVertex(x,y) -> {void}

####canvas.triangle(x0,y0,x1,y1,x2,y2) -> {void}

####canvas.point(x,y) -> {void}

####canvas.points(vertices) -> {void}

####canvas.drawArrays(vertices,colors,mode) -> {void}

####canvas.drawElements(vertices,indices,colors) -> {void}

####canvas.beginBatch() -> {void}

####canvas.drawBatch() -> {void}

####canvas.endBatch() -> {void}

####canvas.getBatch() -> {Array}

####canvas.beginBatchToTexture() -> {void}

####canvas.endBatchToTexture() -> {void}

####canvas.image(image,x,y,width,height) -> {void}

####canvas.getImagePixel(img) -> {Float32Array}

###CanvasGLImage

####CanvasGLImage() -> {CanvasGLImage}

####image.loadImage(path,target,obj,callbackString) -> {void}

###Transformation

####canvas.pushMatrix() -> {void}

####canvas.popMatrix() -> {void}

####canvas.translate(x,y) -> {void}

####canvas.scale(x,y) -> {void}

####canvas.rotate(a) -> {void}

-###Text-

###Utitlities

####canvas.getScreenCoord(x,y) -> {Array}

####canvas.safeToPNG() -> {void}





