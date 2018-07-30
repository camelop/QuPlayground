//complex operators
function times(lhs, rhs) {
	return [lhs[0]*rhs[0]-lhs[1]*rhs[1], lhs[0]*rhs[1]+lhs[1]*rhs[0]];
}
function add(lhs, rhs) {
	return [lhs[0]+rhs[0], lhs[1]+rhs[1]];
}

//basic element
function Qubit() {
	this.state = [[1, 0], [0, 0]]; //(1+0i)|0> + (0+0i)|1>
	this.qsize = 1;
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

//system quantum state
function Qstat() {
	switch (arguments.length) {
		case 0:
			this.qsize = 0;
			this.state = [];
			break;
		case 2:
			this.qsize = arguments[0].qsize + arguments[1].qsize;
			this.state = [];
			for (i in arguments[0].state) {
				for (j in arguments[1].state) {
					this.state.push(times(arguments[0].state[i], arguments[1].state[j]));
				}
			}
			break;
		// other case
		default:
			throw "Invalid Qstat init";
	}
}
Qubit.prototype = new Qstat()

//uniform transform
function Qgate() {
	switch (arguments.length) {
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
		for (i in this.u) {
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

CNOT = new Qgate(2, 2, [[[1,0],[0,0],[0,0],[0,0]], [[0,0],[1,0],[0,0],[0,0]], [[0,0],[0,0],[1,0],[0,0]], [[0,0],[0,0],[0,0],[1,0]]])

I = PauliI; X = PauliX; Z = PauliZ; Y = PauliY;
H = Hadamard; S = Phase; T = PiD8;

//perform a transform
function perform(qgate, qstat) {
	if (qstat.qsize != qgate.isize) throw "Wrong shape";
	ret = new Qstat();
	ret.qsize = qgate.osize;
	for (i in qgate.u[0]) ret.state.push([0, 0]);
	for (i in qgate.u) {
		row = qgate.u[i];
		for (j in row) {
			ret.state[j] = add(ret.state[j], times(row[j], qstat.state[i]));
		}
	}
	return ret;
}

//test func
function Qtest() {
	$ = console.log;
	/*
	testQubit = new Qubit()
	console.log(testQubit)
	testQstat = new Qstat()
	console.log(testQstat)
	*/
	q0 = new Qubit(0);
	q1 = new Qubit(1);
	// $(q1); $(q2);
	$(perform(Hadamard, q0))
	$(perform(Hadamard, q1))
	$(perform(Hadamard, q1))
	/* Gates */
	$(I.print())
	$(X.print())
	$(Y.print())
	$(Z.print())
	$(H.print())
	$(S.print())
	$(T.print())
}

Qtest();