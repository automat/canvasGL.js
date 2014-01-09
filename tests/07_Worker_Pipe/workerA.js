
module.exports = "self.addEventListener('message'," + function(e){
    var dataObj = e.data,
        data    = dataObj.data;

    var i = -1;
    while(++i < 10000000){
        data[0] = Math.random();
        data[1] = Math.random();
        data[2] = Math.random();
    }

    postMessage(dataObj);

} + ')';

