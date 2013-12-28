precision mediump float;  
uniform float     uUseTexture;
uniform sampler2D uImage;
varying vec2      vTexCoord;
varying vec4      vVertColor;

void main(){
    vec4 texColor = texture2D(uImage,vTexCoord);
    gl_FragColor  = vVertColor * (1.0 - uUseTexture) + texColor * uUseTexture;
}