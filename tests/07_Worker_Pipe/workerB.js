
module.exports = "self.addEventListener('message'," + function(e){
    var dataObj = e.data,
        data    = dataObj.data;

    var i = -1;
    while(++i < 100000){
        data[0] *= Math.random() + Math.sqrt(Math.pow(2,Math.floor(Math.random() * 1000)));
        data[1] *= Math.random() + Math.sqrt(Math.pow(2,Math.floor(Math.random() * 1000)));
        data[2] *= Math.random() + Math.sqrt(Math.pow(2,Math.floor(Math.random() * 1000)));
    }

    postMessage(dataObj);

} + ')';

