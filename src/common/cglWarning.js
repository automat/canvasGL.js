var Warning = {
    WEBGL_NOT_AVAILABLE : "WebGL is not available.",
    UNEQUAL_ARR_LEN_COLOR_BUFFER : "Color array length not equal to number of vertices",
    INVALID_STACK_POP: "Invalid matrix stack pop!",
    WEBGL_CONTEXT_LOST: "WebGL context lost.",
    WEBGL_CONTEXT_RESTORED: "WebGL context restored.",

    POLYLINE_INVALID_COLOR_RANGE: "Polyline invalid color range.",

    TEX_NP2_MIPMAP : "Texture size is non-power-of-2. Can't generate mipmap.",
    TEX_NP2_WRAP_MODE_INIT: "Size is non-power-of-2. Using wrap_mode CLAMP_TO_EDGE.",
    TEX_NP2_WRAP_MODE_RESIZE : "'Texture is non-power-of-2. WrapMode REPEAT is not valid.",
    TEX_FLOAT_FORMAT_NOT_SUPPORTED : 'Floating point textures not supported.'
};

module.exports = Warning;