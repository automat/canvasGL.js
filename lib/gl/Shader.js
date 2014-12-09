var Shader = 
"#ifdef VERTEX_SHADER\n" + 
"precision highp float;\n" + 
"\n" + 
"attribute vec2 aVertexPosition;\n" + 
"attribute vec4 aVertexColor;\n" + 
"attribute vec2 aTexcoord;\n" + 
"\n" + 
"varying vec4 vVertexColor;\n" + 
"varying vec2 vTexcoord;\n" + 
"\n" + 
"uniform mat3 uMatrix;\n" + 
"uniform vec2 uViewport;\n" + 
"\n" + 
"uniform float uPointSize;\n" + 
"\n" + 
"vec2 invert = vec2(1,-1);\n" + 
"\n" + 
"void main(){\n" + 
"    vVertexColor = aVertexColor;\n" + 
"    vTexcoord    = aTexcoord;\n" + 
"    \n" + 
"    gl_Position  = vec4(((uMatrix * vec3(aVertexPosition,1.0)).xy / uViewport * 2.0 - 1.0) * invert,0.0,1.0);\n" + 
"    gl_PointSize = uPointSize;\n" + 
"}\n" + 
"#endif\n" + 
"\n" + 
"\n" + 
"#ifdef FRAGMENT_SHADER\n" + 
"precision highp float;\n" + 
"\n" + 
"varying vec4 vVertexColor;\n" + 
"varying vec2 vTexcoord;\n" + 
"\n" + 
"uniform float     uUseTexture;\n" + 
"uniform sampler2D uTexture;\n" + 
"\n" + 
"uniform vec4  uColor;\n" + 
"uniform float uUseColor;\n" + 
"\n" + 
"void main(){\n" + 
"    gl_FragColor = (vVertexColor * (1.0 - uUseColor) + uColor * uUseColor) * (1.0 - uUseTexture) + texture2D(uTexture,vTexcoord) * uUseTexture;\n" + 
"}\n" + 
"#endif";
module.exports = Shader;