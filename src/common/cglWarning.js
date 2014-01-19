var Warning = {
    kWebGLNotAvailable : "WebGL is not available.",
    kUnequalArrLengthColorBuffer : "Color array length not equal to number of vertices",
    kInvalidStackPop: "Invalid matrix stack pop!",
    kWebGLContextLost: "WebGL context lost.",
    kWebGLContextRestored: "WebGL context restored.",

    kPolylineInvalidColorRange: "Polyline invalid color range.",

    kTextureNP2Mipmap : "Texture size is non-power-of-2. Can't generate mipmap.",
    kTextureNP2WrapModeInit: "Size is non-power-of-2. Using wrap_mode CLAMP_TO_EDGE.",
    kTextureNP2WrapModeResize : "'Texture is non-power-of-2. WrapMode REPEAT is not valid.",
    kTextureFloatNotSupported : 'Floating point textures not supported.'
};

module.exports = Warning;