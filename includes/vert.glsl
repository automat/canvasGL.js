uniform   mat3  a_matrix; 
attribute vec2  a_position;  
uniform   vec2  u_resolution; 
uniform   float u_flip_y; 
attribute vec2  a_texture_coord; 
varying   vec2  v_texture_coord; 
attribute vec4  a_vertex_color;
varying   vec4  v_vertex_color; 

void main() {
    vec2 clipSpace  = vec2(a_matrix * vec3(a_position.xy,1)).xy / u_resolution * 2.0 - 1.0;
    gl_Position     = vec4(clipSpace.x,-clipSpace.y * u_flip_y,0,1);
    v_texture_coord = a_texture_coord;
    v_vertex_color  = a_vertex_color;
    gl_PointSize = 1.0;
}