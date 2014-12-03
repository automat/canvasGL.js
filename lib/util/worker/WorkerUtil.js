var ObjectUtil = require('./../ObjectUtil');

var WorkerUtil = {
    sourceFromScript : function(script){
        var blob;
        try {
            blob = new Blob([script], {type: 'application/javascript'});
        } catch (e) {
            blob = new ( window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder)();
            blob.append(script);
            blob = blob.getBlob();
        }

        return window.webkitURL ? window.webkitURL.createObjectURL(blob) :
               window.URL && window.URL.createObjectURL ? window.URL.createObjectURL(blob) :
               null;
    },

    genScript : function(imports,workerScope){
        var script = '';
        var import_;
        var import_str;
        for(var i in imports){
            import_ = imports[i];

            if(ObjectUtil.isFunction(import_)){
                import_str = ObjectUtil.toString(import_);
            } else {
                import_str = i + ' = ' + ObjectUtil.toString(import_);
            }

            script += import_str + '\n\n';
        }
        script += ObjectUtil.getFunctionBody(workerScope);

        return script;
    }
};

module.exports = WorkerUtil;
