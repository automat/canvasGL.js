module.exports = (function(){
    var kMsg = {
        LOG : 0
    };

    function log(data){
        postMessage({msg:kMsg.LOG,data:data});
    }

    log('hello');

    var funcs = {};
    funcs.functionA = function(data){
        log(data);

    };

    funcs.functionB = function(){

    };


    self.addEventListener('message',function(e){
        var dataObj = e.data;



        if(dataObj.msg){
            funcs[dataObj.msg](dataObj.data);
        }

    });
}).toString().match(/function[^{]+\{([\s\S]*)\}$/)[1];

