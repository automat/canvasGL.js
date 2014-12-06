#!/usr/bin/env node

var fs   = require('fs'),
    path = require('path');

var src = fs.readFileSync(path.join('..','includes','shader.glsl'),{encoding:'utf8'}).split('\n');
var file = 'var Shader = \n';

var i = -1, l = src.length - 1;
while(++i < l){
    file += '"' + src[i] + '\\n" + \n';
}
file += '"' + src[l] + '";\n';
file += 'module.exports = Shader;';

fs.writeFile(path.join('..','lib','gl','Shader.js'),file,function(err){
    if(err){
        console.log(err);
        return;
    }
    console.log(file);
    console.log('done');
});
