rational_number_to_divisor = function(input) {
    var cf = []; //continued fraction
    equal = function(a, b) {
        var eps = 1e-6;
        return Math.abs(a-b) < eps;
    }
    var max_length = 100;
    while (max_length--) {
        cf.push(Math.floor(input));
        input -= Math.floor(input);
        if (equal(input, 0))
            break;
        input = 1 / input;
    }
    var p = 1;
    var q = cf[cf.length-1];
    var ptr = cf.length-2;
    while (ptr >= 0) {
        p = q * cf[ptr] + p;
        var temp = p;
        p = q; q = temp;
        --ptr;
    }
    var temp = p;
    p = q; q = temp;
    return q;
}