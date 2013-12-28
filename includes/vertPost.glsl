attribute vec2  aVertPosition;
attribute vec2  aTexCoord;
varying   vec2  vTexCoord;
uniform   vec2  uResolution;

void main(){
    vec2 cs = vec2(aVertPosition/uResolution*2.0-1.0);
    gl_Position   = vec4(cs.x,cs.y,0,1);
    vTexCoord = aTexCoord;
}