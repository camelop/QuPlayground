//complex operators
function const_times(lhs, rhs) {
	return [lhs * rhs[0], lhs * rhs[1]];
}
function times(lhs, rhs) {
	return [lhs[0]*rhs[0]-lhs[1]*rhs[1], lhs[0]*rhs[1]+lhs[1]*rhs[0]];
}
function add(lhs, rhs) {
	return [lhs[0]+rhs[0], lhs[1]+rhs[1]];
}
function abs(x) {
	return x[0] * x[0] + x[1] * x[1];
}

//basic element
function Qubit() {
	this.state = [[1, 0], [0, 0]]; //(1+0i)|0> + (0+0i)|1>
	this.qsize = 1;
	this.id = guid();
	switch (arguments.length) {
		case 0:
			break;
		case 1:
			if (arguments[0] == 0) {
				this.state = [[1, 0], [0, 0]]; 
			} else if (arguments[0] == 1) {
				this.state = [[0, 0], [1, 0]]; 
			} else {
				throw "Invalid param 1";
			}
			break;
		// other cases
		default:
			throw "Invalid Qubit init";
	}
}

function S4() {
	return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
}
function guid() {
	return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

//system quantum state
function Qstat() {
	this.id = guid();
	switch (arguments.length) {
		case 0:
			this.qsize = 0;
			this.state = [];
			break;
		case 1:
			this.qsize = arguments[0].qsize;
			this.state = [];
			for (var i in arguments[0].state) {
				this.state.push([arguments[0].state[i][0], arguments[0].state[i][1]]);
			}
			break;
		case 2:
			this.qsize = arguments[0].qsize + arguments[1].qsize;
			this.state = [];
			for (var i in arguments[0].state) {
				for (var j in arguments[1].state) {
					this.state.push(times(arguments[0].state[i], arguments[1].state[j]));
				}
			}
			break;
		// other case
		default:
			throw "Invalid Qstat init";
	}
	this.print = function() {
		var ret = "[";
		for (var i in this.state) {
			var nw = this.state[i];
			if (nw[1] == 0) {
				ret = ret + nw[0]
			} else if (nw[0] == 0) {
				ret = ret + nw[1] + "i"
			} else {
				if (nw[1]<0) {
					ret = ret + nw[0] + nw[1] + "i";
				} else {
					ret = ret + nw[0] + "+" + nw[1] + "i";
				}
			}
			ret = ret + "\t";
			if (i%4 == 3 && i!=this.state.length-1) ret += "\n";
		}
		return ret + "]\n";
	}
}
Qubit.prototype = new Qstat()

//uniform transform
function Qgate() {
	switch (arguments.length) {
		case 2:
			// tensor
			var a = arguments[0];
			var b = arguments[1];
			this.isize = a.isize + b.isize;
			this.osize = a.osize + b.osize;
			this.u = [];
			// construct it
			for(var i=0; i<2**this.isize; ++i) {
				var nw = [];
				for (var j=0; j<2**this.osize; ++j) {
					nw.push([0,0]);
				}
				this.u.push(nw);
			}
			console.log(a,b)
			for(var i=0; i<a.u.length; ++i) {
				var row_i = a.u[i];
				for (var j=0; j<row_i.length; ++j) {
					var ea = row_i[j];
					for (var ii=0; ii<b.u.length; ++ii) {
						var row_ii = b.u[ii];
						for (var jj=0; jj<row_ii.length; ++jj) {
							var eb = row_ii[jj];
							this.u[i*2**b.isize+ii][j*2**b.isize+jj] = times(ea, eb);
						}
					}
				}
			}
			break;
		case 3:
			this.isize = arguments[0];
			this.osize = arguments[1];
			this.u = arguments[2];
			break;
		default:
			throw "Invalid Qgate init";
	}
	this.print = function() {
		ret = ""
		for (var i in this.u) {
			row = this.u[i]
			if (i == 0) ret = ret + "["; else ret = ret + " ";
			for (j in row) {
				nw = row[j];
				if (nw[1] == 0) {
					ret = ret + nw[0]
				} else if (nw[0] == 0) {
					ret = ret + nw[1] + "i"
				} else {
					if (nw[1]<0) {
						ret = ret + nw[0] + nw[1] + "i";
					} else {
						ret = ret + nw[0] + "+" + nw[1] + "i";
					}
				}
				ret = ret + "\t";
			}
			if (i != this.u.length - 1) ret = ret + "\n";
		}
		return ret + "]\n";
	}
}

PauliI = new Qgate(1, 1, [[[1,0],[0,0]],[[0,0],[1,0]]]); 
PauliX = new Qgate(1, 1, [[[0,0],[1,0]],[[1,0],[0,0]]]); 
PauliZ = new Qgate(1, 1, [[[1,0],[0,0]],[[0,0],[-1,0]]]); 
PauliY = new Qgate(1, 1, [[[0,0],[0,-1]],[[0,1],[0,0]]]);
Hadamard = new Qgate(1, 1, [[[0.5**0.5,0],[0.5**0.5,0]],[[0.5**0.5,0],[-(0.5**0.5),0]]]);
Phase = new Qgate(1, 1, [[[1,0],[0,0]],[[0,0],[0,1]]]);
PiD8 = new Qgate(1, 1, [[[1,0],[0,0]],[[0,0],[0.5**0.5,0.5**0.5]]])

CNOT = new Qgate(2, 2, [[[1,0],[0,0],[0,0],[0,0]], [[0,0],[1,0],[0,0],[0,0]], [[0,0],[0,0],[0,0],[1,0]], [[0,0],[0,0],[1,0],[0,0]]])

I = PauliI; X = PauliX; Z = PauliZ; Y = PauliY;
H = Hadamard; S = Phase; T = PiD8;

function SWAP(_qsize, _from, _to) {
	var u = [];
	for (var i=0; i<2**_qsize; ++i) {
		var nw = [];
		for (var j=0; j<2**_qsize; ++j) {
			nw.push([0,0]);
		}
		u.push(nw);
	}
	var two = [];
	for (var i=0; i<=Math.max(Math.max(_from),Math.max(_to)); ++i) {
		two.push((1<<i));
	}
	var bitchange = function(x) {
		var y=x;
		for (var i=0; i<_from.length; ++i) {
			var ff = _from[i];
			var tt = _to[i];
			if (y & two[ff]) y-=two[ff];
			if (y & two[tt]) y-=two[tt];
			if (x & two[ff]) y+=two[tt];
			if (x & two[tt]) y+=two[ff];
		}
		return y;
	}
	for (var i=0; i<2**_qsize; ++i) {
		u[i][bitchange(i)] = [1, 0];
	}
	return new Qgate(_qsize, _qsize, u);
}

//perform a transform
function perform(qgate, qstat, loc) {
	if (typeof(loc) == "undefined") {
		if (qstat.qsize != qgate.isize) {
			console.log(qgate)
			console.log(qstat)
			throw "Wrong shape while performing \n["+qgate.isize+"->"+qgate.osize+"] on \n"+JSON.stringify(qstat);
		}
		var ret = new Qstat();
		ret.qsize = qgate.osize;
		for (i in qgate.u[0]) ret.state.push([0, 0]);
		for (i in qgate.u) {
			var row = qgate.u[i];
			for (j in row) {
				ret.state[j] = add(ret.state[j], times(row[j], qstat.state[i]));
			}
		}
		return ret;
	} else {
		// do local transform
		var IGI = qgate;
		for (var i=0; i<loc; ++i) IGI = new Qgate(I, IGI);
		while (IGI.isize < qstat.qsize) IGI = new Qgate(IGI, I);
		var ret = perform(IGI, qstat);
		ret.id = qstat.id;
		for (var i=0; i<2**qstat.qsize; ++i) {
			qstat.state[i] = ret.state[i];
		}
		return ret;
	}
}

function measure(qstat, dim) {
	show = JSON.stringify;
	// console.log("measure, "+show(qstat)+", "+show(dim))
	// init result
	var old_loc = [];
	var new_loc = [];
	var result = [];
	for(var i in dim) {
		old_loc[i] = (1<<dim[i]);
		new_loc[i] = (1<<i);
	}
	for(var i=0; i<(1<<dim.length); ++i) result.push(0);
	// console.log("qstat: ", qstat)
	var total = 0;
	for (var i in qstat.state) {
		var index = 0;
		for(var j in dim) {
			if (i & old_loc[j] > 0) {
				index += new_loc[j];
			}
		}
		result[index] += abs(qstat.state[i]);
		total += abs(qstat.state[i]);
	}

	var roll = Math.random();
	var cnt = 0.0;
	// console.log("result: ", result);
	for (var i in result) {
		var delta =  result[i]/total;
		if (roll >= cnt && roll <= cnt + delta) {
			roll = i;
			break;
		}
		cnt += delta;
	}

	var ret = []
	for(var i in dim) {
		if ((roll & new_loc[i]) == 0) {
			ret.push(0);
		} else {
			ret.push(1);
		}
	}
	// then qubit collapse
	var v = Math.sqrt(total / result[roll]);
	for (var i in qstat.state) {
		var index = 0;
		for(var j in dim) {
			if (i & old_loc[j] > 0) {
				index += new_loc[j];
			}
		}
		if (index != roll) {
			qstat.state[i] = [[0],[0]];
		} else {
			qstat.state[i] = const_times(v, qstat.state[i]);
		}
	}
	return ret;
}

//test func
function Qtest() {
	var $ = console.log;
	/*
	testQubit = new Qubit()
	console.log(testQubit)
	testQstat = new Qstat()
	console.log(testQstat)

	q0 = new Qubit(0);
	q1 = new Qubit(0);
	// $(q1); $(q2);
	q0 = perform(Hadamard, q0);
	var combine = new Qstat(q0, q1);
	$(combine)

	$(CNOT.print())
	combine = perform(CNOT, combine);
	$(combine.print())

	// Bell test
	for (var i=0; i<100; ++i) {
		var q0 = new Qubit(0);
		var q1 = new Qubit(0);
		q0 = perform(H, q0);
		var combine = new Qstat(q0, q1);
		combine = perform(CNOT, combine);
		//$(combine.print())
		var r0 = measure(combine, [0])[0];
		//$(combine.print())
		var r1 = measure(combine, [1])[0];
	}
	
	// gate tensor test
	var HIH = new Qgate(H, new Qgate(I, H))
	$(HIH.print())

	// loc perform test
	var s = new Qstat(new Qubit(1), new Qstat(new Qubit(0), new Qubit(1)));
	$(s.print())
	perform(H, s, 1);
	$(s.print())
	*/

}

// Qtest();