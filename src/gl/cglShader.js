var Shader = {};

Shader.vert     = "uniform mat3 uMatrix; uniform vec2 uResolution; uniform float uFlipY; attribute vec2 aVertPosition; attribute vec2 aTexCoord; varying vec2 vTexCoord; attribute vec4 aVertColor; varying vec4 vVertColor; void main() { vec2 clipSpace = vec2(uMatrix * vec3(aVertPosition.xy,1)).xy / uResolution * 2.0 - 1.0; gl_Position = vec4(clipSpace.x,-clipSpace.y * uFlipY,0,1); vTexCoord = aTexCoord; vVertColor = aVertColor; gl_PointSize = 1.0; }";
Shader.frag     = "precision mediump float; uniform float uUseTexture; uniform sampler2D uImage; varying vec2 vTexCoord; varying vec4 vVertColor; void main(){ vec4 texColor = texture2D(uImage,vTexCoord); gl_FragColor = vVertColor * (1.0 - uUseTexture) + texColor * uUseTexture; }"
Shader.vertPost = "attribute vec2 aVertPosition; attribute vec2 aTexCoord; varying vec2 vTexCoord; uniform vec2 uResolution; void main(){ vec2 cs = vec2(aVertPosition/uResolution*2.0-1.0); gl_Position = vec4(cs.x,cs.y,0,1); vTexCoord = aTexCoord; }";
Shader.fragPost = "precision mediump float; uniform sampler2D uSceenTex; varying vec2 vTexCoord; void main(){ gl_FragColor = texture2D(uSceenTex,vTexCoord); }";

module.exports = Shader;
