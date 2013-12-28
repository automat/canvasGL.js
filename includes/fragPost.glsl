precision mediump float;
uniform sampler2D uSceenTex;
varying vec2      vTexCoord;

void main(){
    gl_FragColor =  texture2D(uSceenTex,vTexCoord);
}