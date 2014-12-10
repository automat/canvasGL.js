#ifdef VERTEX_SHADER
precision highp float;

attribute vec2 aVertexPosition;
attribute vec4 aVertexColor;
attribute vec2 aTexcoord;

varying vec4 vVertexColor;
varying vec2 vTexcoord;

uniform mat3 uMatrix;
uniform vec2 uViewport;

uniform float uPointSize;

vec2 invert = vec2(1,-1);

void main(){
    vVertexColor = aVertexColor;
    vTexcoord    = aTexcoord;

    gl_Position  = vec4(((uMatrix * vec3(aVertexPosition,1.0)).xy / uViewport * 2.0 - 1.0) * invert,0.0,1.0);
    gl_PointSize = uPointSize;
}
#endif


#ifdef FRAGMENT_SHADER
precision highp float;

varying vec4 vVertexColor;
varying vec2 vTexcoord;

uniform float     uUseTexture;
uniform sampler2D uTexture;

uniform vec4  uColor;
uniform float uUseColor;

void main(){
    gl_FragColor = (vVertexColor * (1.0 - uUseColor) + uColor * uUseColor) * (1.0 - uUseTexture) + texture2D(uTexture,vTexcoord) * uUseTexture;
}
#endif