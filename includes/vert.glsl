uniform   mat3  uMatrix;
uniform   vec2  uResolution;
uniform   float uFlipY;
attribute vec2  aVertPosition;
attribute vec2  aTexCoord;
varying   vec2  vTexCoord;
attribute vec4  aVertColor;
varying   vec4  vVertColor;

void main() {
    vec2 clipSpace  = vec2(uMatrix * vec3(aVertPosition.xy,1)).xy / uResolution * 2.0 - 1.0;
    gl_Position     = vec4(clipSpace.x,-clipSpace.y * uFlipY,0,1);
    vTexCoord  = aTexCoord;
    vVertColor = aVertColor;
    gl_PointSize = 1.0;
}