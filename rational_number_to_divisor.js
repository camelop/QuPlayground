display = function(input) {
    var result = input.result[0];
    var nw = 0.5;
    var s = 0;
    for (var i=0; i<result.length; ++i) {
        if(result[i] > 0) s += nw;
        nw = nw / 2;
    }
    var rational_number_to_divisor = function(input) {
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
    var r = rational_number_to_divisor(s);
    var ll = Math.round(input.x**(r/2) - 1);
    var rr = Math.round(input.x**(r/2) + 1);
    var pos_ans = 1;
    if (ll > 1 && input.n % ll == 0) pos_ans = ll;
    if (rr > 1 && input.n % rr == 0) pos_ans = rr;
    if (pos_ans != 1 && input.n % pos_ans == 0) {
        alert("Success! "+input.n+" = "+pos_ans+" * "+input.n/pos_ans);
    } else {
        alert("Failed, get "+pos_ans);
    }
}