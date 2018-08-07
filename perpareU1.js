prepareU1 = function(input) {
    if (typeof(input) == "undefined") throw "Invalid Input while preparing U";
    if (typeof(input.x) == "undefined") throw "'x' not accepted while preparing U.";
    var x = input.x;
    var index = 1;
    var size = 5; // controled U with U|y> = |xy%N>
    var u = [];
    // alloc
    for (var i=0; i<2**size; ++i) {
        var nw = [];
        for (var j=0; j<2**size; ++j) {
            nw.push([0,0])
        }
        u.push(nw);
    }
    for (var j=0; j<2**(size-1); ++j) {
        u[j][j] = [1, 0]; //highest bit is 0
    }
    var base = 2**(size-1);
    var power = function(m, n, N) {
        var ret = m%N;
        for (var i=1; i<n; ++i) {
            ret *= m;
            ret %= N;
        }
        return ret;
    }
    for (var j=0; j<2**(size-1); ++j) {
        u[base+j][base + (power(x, index, input.n) * j)%input.n] = [1, 0]; //highest bit is 0
    }
    input.u = u;
    return input;
}