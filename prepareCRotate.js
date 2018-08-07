prepareCRotate = function(input) {
    var index = 2;
    input.u = [
        [[1,0], [0,0], [0,0], [0,0]],
        [[0,0], [1,0], [0,0], [0,0]],
        [[0,0], [0,0], [1,0], [0,0]],
        [[0,0], [0,0], [0,0], 
        [Math.cos(2*Math.PI/(2 ** index)), 
            Math.sin(2*Math.PI/(2 ** index))]]];
    return input;
}