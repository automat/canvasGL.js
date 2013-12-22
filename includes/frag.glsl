precision mediump float;  
uniform float     u_use_texture;  
uniform sampler2D u_image;  
varying vec2      v_texture_coord;  
varying vec4      v_vertex_color;  

void main(){
    vec4 texColor = texture2D(u_image,v_texture_coord);  
    gl_FragColor  = v_vertex_color * (1.0 - u_use_texture) + texColor * u_use_texture;  
}