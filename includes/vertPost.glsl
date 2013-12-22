attribute vec2  a_position;
attribute vec2  a_texture_coord;
varying   vec2  v_texture_coord;
uniform   vec2  u_resolution;

void main()
{
vec2 cs = vec2(a_position/u_resolution*2.0-1.0);
gl_Position     = vec4(cs.x,cs.y,0,1);
v_texture_coord = a_texture_coord;
}