precision mediump float;
uniform sampler2D u_screen_tex;
varying vec2      v_texture_coord;

void main()
{
gl_FragColor =  texture2D(u_screen_tex,v_texture_coord);
}