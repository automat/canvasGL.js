var Util = require('./Util');

function state1Create(){
    return [null,null];
}

function state1Push(state,a){
    state[1] = state[0];
    state[0] = a;
}

function state1Equal(state){
    return state[0] == state[1];
}

function state1Front(state){
    return state[0];
}

function state1Back(state){
    return state[1];
}

function state2Create(){
    return [[null,null],[null,null]];
}

function state2Push(state,a){
    state2Push2(state,a[0],a[1]);
}

function state2Push2(state,a,b){
    var a_ = state[0], b_ = state[1];
    b_[0] = a_[0];
    b_[1] = a_[1];

    state[0][0] = a;
    state[0][1] = b;
}

function state2Equal(state){
    var a = state[0], b = state[1];
    return a[0] == b[0] && a[1] == b[1];
}

function state4Create(){
    return [[null,null,null,null],[null,null,null,null]];
}

function state4Push(state,a){
    state4Push4(state,a[0],a[1],a[2],a[3]);
}

function state4Push4(state,a,b,c,d){
    var a_ = state[0],
        b_ = state[1];

    b_[0] = a_[0];
    b_[1] = a_[1];
    b_[2] = a_[2];
    b_[3] = a_[3];

    a_[0] = a;
    a_[1] = b;
    a_[2] = c;
    a_[3] = d;
}

function state4Equal(state){
    var a = state[0], b = state[1];
    return a[0] == b[0] && a[1] == b[1] && a[2] == b[2] && a[3] == b[3];
}

function stateArrPush(state,a){
    var a_ = state[0], b_ = state[0], l = a.length;

    if(a_ == null){
        state[0] = Array.prototype.slice.call(a);
        return;
    }
    if(a.length != l){
        throw new RangeError('New state is not equal in length.');
    }
    var i = -1;
    while(++i < l){
        b_[i] = a_[i];
        a_[i] = a[i];
    }
}

function stateArrEqual(state){
    var a = state[0],
        b = state[1];

    if((!a || !b) || (a.length != b.length)){
        return false;
    }

    var l = a.length;
    var i = -1;
    while(++i < l){
        if(a[i] != b[i]){
            return false;
        }
    }
    return true;
}


module.exports = {
    state1Create : state1Create,
    state1Push   : state1Push,
    state1Equal  : state1Equal,
    state1Front  : state1Front,
    state1Back   : state1Back,
    state1Empty  : [null,null],

    state2Create : state2Create,
    state2Push   : state2Push,
    state2Push2  : state2Push2,
    state2Equal  : state2Equal,
    state2Front  : state1Front,
    state2Back   : state1Back,
    state2Empty  : [[null,null],[null,null]],

    state4Create : state4Create,
    state4Push   : state4Push,
    state4Push4  : state4Push4,
    state4Equal  : state4Equal,
    state4Front  : state1Front,
    state4Back   : state1Back,
    state4Empty  : [[null,null,null,null],[null,null,null,null]],

    stateArrCreate : state1Create,
    stateArrPush   : stateArrPush,
    stateArrEqual  : stateArrEqual,
    stateArrFront  : state1Front,
    stateArrBack   : state1Back,
    stateArrEmpty  : this.state1Empty
};