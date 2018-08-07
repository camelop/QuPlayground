factoring_to_order_finding = function(input) {
    var N = input.n;
    var output = {};
    // check if N is even
    if ((N & 1) == 0) {
        output.success = true;
        output.a = 2;
        output.b = N/2;
        return output;
    }
    // check if N is prime
    Miller_Rabin = function(n) {
        var k = 30;
        var s = 0;
        var d = n-1;
        while ((d & 1) == 0) {
            d /= 2;
            ++s;
        }
        while (k--) {
            a = Math.floor(Math.random() * (n-5)) + 2;
            pow = function(base, index, M) {
                if (index == 1) return base % M;
                if ((index&1) == 0) {
                    var u = pow(base, index/2, M);
                    return (u * u) % M;
                } else {
                    var u = pow(base, (index-1)/2, M);
                    return (u * u * base) % M;
                }
            }
            x = pow(a, d, n);
            if (x == 1 || x == n-1) continue;
            var flag = true;
            for (r=1; r<s; ++r) {
                x = (x * x) % n;
                if (x == 1) return false;
                if (x == n - 1) {
                    flag = false;
                    break;
                }
            }
            if (flag) return false;
        }
        return true;
    }
    if (Miller_Rabin(N)) {
        output.success = false;
        output.message = "Prime Input";
        return output;
    }
    // check if N is a^b
    check_pow_a_b = function(n) {
        eps = 1e-6;
        prime = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47];
        // check if b%prime == 0
        for (i in prime) {
            nw = Math.pow(n, 1/prime[i]);
            if (Math.abs(Math.round(nw) - nw) < eps)
                return prime[i];
        }
        return false;
    }
    if (check_pow_a_b(N) != false) {
        output.success = true;
        var u = Math.round(Math.pow(N, 1/check_pow_a_b(N)));
        output.a = u;
        output.b = N/u;
        return output;
    }
    // then N = \Sigma p_i ^ a_i
    var x = Math.floor(Math.random() * (N-1)) + 1;
    gcd = function(a, b) {
        if (b == 0) return a;
        return gcd(b, a%b);
    }
    if (gcd(N, x) > 1) {
        // lucky strike
        alert("LUCKY! gcd("+N+", "+x+") = "+gcd(N, x)+". No need for Quantum circuit.");
        output.success = true;
        output.a = gcd(N, x);
        output.b = N/gcd(N, x);
        return output;
    }
    // then Quantum circuit is used
    output.x = x;
    output.n = N;
    return output;
}