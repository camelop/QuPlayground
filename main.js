// These parameters need to be set before defining the templates.
var MINLENGTH = 200; // this controls the minimum length of any swimStep
var MINBREADTH = 20; // this controls the minimum breadth of any non-collapsed swimStep

// manage modals
var lastSrc;

function openJSBBModal(e, src) {
  lastSrc = src;
  $('#JSBB_description').val(src.data.text);
  $('#JSBB_code').val(src.data.code);
  $('#JSBB_modal').modal();
}

function closeJSBBModal(e) {
  lastSrc.data.text = $('#JSBB_description').val();
  lastSrc.data.code = $('#JSBB_code').val();
  updateCrossStepLinks();
}

function openQgateModal(e, src) {
  lastSrc = src;
  $('#Qgate_gtype').val(src.data.gtype);
  $('#Qgate_isize').val(src.data.isize);
  $('#Qgate_osize').val(src.data.osize);
  $('#Qgate_fromJS').get(0).checked = "fromJSBB" in src.data && src.data.fromJSBB;
  $('#Qgate_toJS').get(0).checked = "toJSBB" in src.data && src.data.toJSBB;
  $('#Qgate_modal').modal();
  
}

function closeQgateModal(e) {
  if ($('#Qgate_gtype').val() != null) lastSrc.data.gtype = $('#Qgate_gtype').val();
  lastSrc.data.isize = parseInt($('#Qgate_isize').val());
  lastSrc.data.osize = parseInt($('#Qgate_osize').val());
  lastSrc.data.fromJSBB = $('#Qgate_fromJS').get(0).checked;
  lastSrc.data.toJSBB = $('#Qgate_toJS').get(0).checked;
  updateCrossStepLinks();
}
// define Program, Stage, Operator
var Programs = {};

function Program(node) {
  this.name = node.data.text;
  this.node = node;
  this.stage = [];
  this.addStage = function (nw) {
    this.stage.push(nw);
  }
  this.findStageByKey = function (key) {
    for (i in this.stage) {
      if (this.stage[i].node.key === key)
        return this.stage[i];
    }
    return null;
  }
  this.check = function () {
    var size_cnt = 0;
    for (var i in this.stage) {
      nw = this.stage[i];
      nw.check();
      size_cnt -= nw.isize;
      if (size_cnt < 0) throw "Missing data in " + nw.name;
      size_cnt += nw.osize;
    }
  }
  this.run = function (display, input) {
    var board = $("#Run_text");
    var append = function (mes) {
      if (typeof(display) != "undefined" && !display) return;
      if (board.html() === "") {
        board.html('<li>' + mes + "</li> ");
      } else board.html(board.html() + " <li>" + mes+ '</li> <div class="divider"></div>');
    }
    try {
      var info = input;
      for (var i in this.stage) {
        if (typeof(info) != "undefined" && info.success)
          break;
        nw = this.stage[i];
        info = nw.run(info);
        console.log(info);
        append(nw.name + ": " + syntaxHighlight(info));
      }
    } catch (err) {
      console.log(err);
      alert(err);
    }
    board.html(board.html()+"</ul>");
  }
  
}

function findProgramByKey(key) {
  for (i in Programs) {
    if (Programs[i].node.key === key)
      return Programs[i];
  }
  return null;
}

function findStageByKey(key) {
  for (i in Programs) {
    var cur = Programs[i].findStageByKey(key);
    if (cur != null) {
      return cur;
    }
  }
  return null;
}

function Stage(node) {
  this.name = node.data.text;
  this.node = node;
  this.isize = 0;
  this.osize = 0;
  this.handle = null;
  this.operator = [];
  this.addOperator = function (op) {
    this.isize += op.isize;
    this.osize += op.osize;
    this.operator.push(op);
  }
  this.check = function () {}
  this.run = function (input) {
    console.log("I = ", I);
    output = this.handle.run(input);
    if ((typeof(output)) == "undefined") output = input;
    if ((typeof(input)) == "undefined") input = {};
    if ((typeof(input.qinfo)) == "undefined") input.qinfo = null;
    if ((typeof(output)) == "undefined") output = {};
    // calc qinfo
    var qinfo = input.qinfo;
    // first handle add qubit
    var inc_qubit = false;
    for (var i in this.operator) {
      if (this.operator[i].name == "|0>") {
        inc_qubit = true;
        if (qinfo == null) {
          qinfo = new Qubit(0);
        } else {
          qinfo = new Qstat(qinfo, new Qubit(0));
        }
      } else if (this.operator[i].name == "|1>") {
        inc_qubit = true;
        if (qinfo == null) {
          qinfo = new Qubit(1);
        } else {
          qinfo = new Qstat(qinfo, new Qubit(1));
        }
      }
    }
    if (inc_qubit) {
      output.qinfo = qinfo;
      return output;
    }
    // then handle measure
    for (var i in this.operator) {
      if (this.operator[i].name == "Measure") {
        var to_measure = [];
        for (var j=0; j<this.operator[i].isize; ++j) {
          to_measure.push(parseInt(i)+parseInt(j));
        }
        console.log("wanna measure ",to_measure);
        var result = measure(qinfo, to_measure); //ganranteed same sys
        if ("result" in output) {
          output.result.push(result);
        } else {
          output.result = [result];
        }
      }
    }
    // then all tensor up
    var tensorI = function(g, index) {
      if (index == 0) return g;
      var i=0;
      if (g == null) {i=1;g = I;}
      for (; i<index; ++i) g = new Qgate(g, I);
      return g;
    }
    var g = null;
    for (var i in this.operator) {
      if (this.operator[i].name == "|0>" || this.operator[i].name == "|1>") {
        throw "Please add in qubit in first step.";
      }
      if (this.operator[i].name == "Measure") {
        g = tensorI(g, this.operator[i].isize);
      } else {
        if (g == null) {
          g = this.operator[i].generate(input);
        } else {
          g = new Qgate(g, this.operator[i].generate(input));
        }
      }
    }
    if (g!=null && qinfo.qsize < g.isize) throw "More gate than qubit.";
    if (g!=null) g = tensorI(g, qinfo.qsize - g.isize);
    if (g!=null) qinfo = perform(g, qinfo);
    output.qinfo = qinfo;
    return output;
  }
}
Qcnt = {}
function Operator(node) {
  this.name = node.data.gtype;
  this.category = node.data.category;
  this.node = node;
  this.isize = node.data.isize;
  this.osize = node.data.osize;
  this.fromJSBB = node.data.fromJSBB;
  this.toJSBB = node.data.toJSBB;
  this.run = function (input, all) {
    if (this.category == "JSBB") {
      var code = this.node.data.code;
      var entry = eval(this.node.data.code);
      return entry(input);
    } else if (this.category == "Qgate") {
      throw "Duplicated!";
      var gtype = this.node.data.gtype;
      if (gtype === "|0>") {
        var ret = [];
        for (var i=0; i<this.osize; ++i) ret.push(new Qubit(0));
        return ret;
      } else if (gtype === "|1>") {
        var ret = [];
        for (var i=0; i<this.osize; ++i) ret.push(new Qubit(1));
        return ret;
      } else if (gtype === "Identity") {
        return input;
      } else if (gtype === "PauliX") {
        return [perform(X, input[0])];
      } else if (gtype === "PauliZ") {
        return [perform(Z, input[0])];
      } else if (gtype === "PauliY") {
        return [perform(Y, input[0])];
      } else if (gtype === "Hadamard") {
        if (input[0].qsize > 1) {
          var ret = perform(H, input[0], Qcnt[input[0].id]);
          ++Qcnt[input[0]].id;
          return [ret];
        }
        return [perform(H, input[0])];
      } else if (gtype === "Phase") {
        return [perform(S, input[0])];
      } else if (gtype === "PiD8") {
        return [perform(T, input[0])];
      } else if (gtype === "CNOT") {
        var  new_stat = new Qstat(input[0], input[1]);
        new_stat = perform(CNOT, new_stat);
        return [new_stat, new_stat];
      } else if (gtype === "C_U") {
        var u = all.u;
        var new_stat = input[0];
        var last = input[0];
        for (var i=1; i<this.isize; ++i) {
          if (input[i].id == last.id) continue;
          new_stat = new Qstat(new_stat, input[i]);
        }
        var g = new Qgate(this.isize, this.osize, u);
        Qcnt[new_stat.id] = this.isize;
        if (new_stat.qsize != this.isize) {
          new_stat = perform(g, new_stat, 0);
        } else {
          new_stat = perform(g, new_stat);
        }
        var ret = [];
        for (var i=0; i<this.osize; ++i) {
          ret.push(new_stat);
        }
        return ret;
      } else if (gtype === "SWAP") {
        var _from = all.from;
        var _to = all.to;
        // need to consider SWAP between two system
        var new_stat = input[0];
        var last = input[0];
        if (!(input[0].id in Qcnt)) Qcnt[input[0].id]=0;
        var begin_ptr = Qcnt[input[0].id];
        var leftIsize = this.isize;
        Qcnt[input[0].id] += Math.min(leftIsize, input[0].qsize - begin_ptr);
        leftIsize -= Math.min(leftIsize, input[0].qsize - begin_ptr);
        for (var i=1; i<this.isize; ++i) {
          if (input[i].id == last.id) continue;
          last = input[i];
          if (!(input[i].id in Qcnt)) Qcnt[input[i].id]=0;
          new_stat = new Qstat(new_stat, input[i]);
          Qcnt[input[i].id] += Math.min(leftIsize, input[i].qsize);
          leftIsize -= Math.min(leftIsize, input[i].qsize);
        }
        if (last.id != input[0].id) {
          Qcnt[new_stat.id] = begin_ptr;
        }
        // construct bitwise swap matrix
        for (var i=0; i<_from.length; ++i) {
          _from[i] += begin_ptr;
          _to[i] += begin_ptr;
        }
        // apply
        new_stat = perform(new SWAP(new_stat.qsize, _from, _to), new_stat, begin_ptr);
        var ret = [];
        for (var i=0; i<this.osize; ++i) {
          ret.push(new_stat);
        }
        return ret;
      } else if (gtype === "Measure") {
        throw "Measure should not run.";
      }
      alert("Not implement "+this.name)
      if (this.toJSBB) {
        return {"qinfo": input};
      } else return input;
    } else {
      throw "Undefined category "+this.category;
    }
  }
  this.generate = function (input) {
    console.log("Generating "+this.name);
    var gtype = this.name;
    if (this.category != "Qgate") throw "JSBB cannot generate!";
    if (gtype === "|0>") {
      throw "|0> cannot generate!";
    } else if (gtype === "|1>") {
      throw "|1> cannot generate!";
    } else if (gtype === "Identity") {
      var ret = I;
      while(ret.isize < this.isize) ret = new Qgate(ret, I);
      return ret;
    } else if (gtype === "PauliX") {
      var ret = X;
      while(ret.isize < this.isize) ret = new Qgate(ret, X);
      return ret;
    } else if (gtype === "PauliZ") {
      var ret = Z;
      while(ret.isize < this.isize) ret = new Qgate(ret, Z);
      return ret;
    } else if (gtype === "PauliY") {
      var ret = Y;
      while(ret.isize < this.isize) ret = new Qgate(ret, Y);
      return ret;
    } else if (gtype === "Hadamard") {
      var ret = H;
      while(ret.isize < this.isize) ret = new Qgate(ret, H);
      return ret;
    } else if (gtype === "Phase") {
      var ret = S;
      while(ret.isize < this.isize) ret = new Qgate(ret, S);
      return ret;
    } else if (gtype === "PiD8") {
      var ret = T;
      while(ret.isize < this.isize) ret = new Qgate(ret, T);
      return ret;
    } else if (gtype === "CNOT") {
      if (this.isize != 2) throw "CNOT isize must be 2";
      return CNOT;
    } else if (gtype === "C_U") {
      var u = input.u;
      return new Qgate(this.isize, this.osize, u);
    } else if (gtype === "SWAP") {
      var _from = input.from;
      var _to = input.to;
      return SWAP(this.isize, _from, _to);
    } else if (gtype === "Measure") {
      var ret = I;
      while(ret.isize < this.isize) ret = new Qgate(ret, I);
      return ret;
    } else {
      if ("text" in this.data)
        alert("Not implement "+this.name+":"+this.data.text);
      else
        alert("Not implement "+this.name);
    }
  }

}

function openRunModal(e, src) {
  // sort out generated circuit
  var info = "Safe to RUN :D";
  try {
    var nodes = [];
    Programs = {};
    myDiagram.nodes.each(function (nw) {
      nodes.push(nw);
    });
    nodes.sort(function(a,b){
      if (a.location.y < b.location.y) return -1;
      if (a.location.y > b.location.y) return 1;
      if (a.location.x < b.location.x) return -1;
      if (a.location.x > b.location.x) return 1;
      return 0;
    })
    for (i in nodes) {
      var cur = nodes[i];
      if (cur.data.category === "Program") {
        Programs[cur.data.text] = new Program(cur);
      }
    }
    for (i in nodes) {
      var cur = nodes[i];
      if (cur.data.category === "Stage") {
        var nw = new Stage(cur);
        findProgramByKey(cur.data.group).addStage(nw);
      }
    }
    for (i in nodes) {
      var cur = nodes[i];
      if (cur.data.category === "JSBB") {
        var nw = findStageByKey(cur.data.group);
        if (nw == null) throw "Ungrouped JSBB detected";
        if (nw.handle != null) throw "More than one JSBB in stage.";
        nw.handle = new Operator(cur);
      }
      if (cur.data.category === "Qgate") {
        var nw = findStageByKey(cur.data.group);
        if (nw == null) throw "Ungrouped Qgate detected";
        nw.addOperator(new Operator(cur));
      }
    }
    for (var i in Programs) {
      Programs[i].check();
    }
  } catch (err) {
    info = err;
  }
  $("#Run_text").text(info);
  $('#Run_modal').modal();
}

// some shared functions

// this may be called to force the Steps to be laid out again
function relayoutSteps() {
  myDiagram.nodes.each(function (Step) {
    if (!(Step instanceof go.Group)) return;
    if (Step.category === "Program") return;
    Step.layout.isValidLayout = false; // force it to be invalid
  });
  myDiagram.layoutDiagram();
  updateCrossStepLinks();
}

// this is called after nodes have been moved or Steps resized, to layout all of the Program Groups again
function relayoutDiagram() {
  myDiagram.layout.invalidateLayout();
  myDiagram.findTopLevelGroups().each(function (g) {
    if (g.category === "Program") g.layout.invalidateLayout();
  });
  myDiagram.layoutDiagram();
  updateCrossStepLinks();
}

// compute the minimum size of a Program Group needed to hold all of the Step Groups
function computeMinProgramSize(Program) {
  // assert(Program instanceof go.Group && Program.category === "Program");
  var len = MINLENGTH;
  Program.memberParts.each(function (Step) {
    // Programs ought to only contain Steps, not plain Nodes
    if (!(Step instanceof go.Group)) return;
    var holder = Step.placeholder;
    if (holder !== null) {
      var sz = holder.actualBounds;
      len = Math.max(len, sz.height);
    }
  });
  return new go.Size(NaN, len);
}

// compute the minimum size for a particular Step Group
function computeStepSize(Step) {
  // assert(Step instanceof go.Group && Step.category !== "Program");
  var sz = computeMinStepSize(Step);
  if (Step.isSubGraphExpanded) {
    var holder = Step.placeholder;
    if (holder !== null) {
      var hsz = holder.actualBounds;
      sz.width = Math.max(sz.width, hsz.width);
    }
  }
  // minimum breadth needs to be big enough to hold the header
  var hdr = Step.findObject("HEADER");
  if (hdr !== null) sz.width = Math.max(sz.width, hdr.actualBounds.width);
  return sz;
}

// determine the minimum size of a Step Group, even if collapsed
function computeMinStepSize(Step) {
  if (!Step.isSubGraphExpanded) return new go.Size(1, MINLENGTH);
  return new go.Size(MINBREADTH, MINLENGTH);
}

// define a custom grid layout that makes sure the length of each Step is the same
// and that each Step is broad enough to hold its subgraph
function ProgramLayout() {
  go.GridLayout.call(this);
  this.cellSize = new go.Size(1, 1);
  this.wrappingColumn = Infinity;
  this.wrappingWidth = Infinity;
  this.isRealtime = false; // don't continuously layout while dragging
  this.alignment = go.GridLayout.Position;
  // This sorts based on the location of each Group.
  // This is useful when Groups can be moved up and down in order to change their order.
  this.comparer = function (a, b) {
    var ax = a.location.x;
    var bx = b.location.x;
    if (isNaN(ax) || isNaN(bx)) return 0;
    if (ax < bx) return -1;
    if (ax > bx) return 1;
    return 0;
  };
}
go.Diagram.inherit(ProgramLayout, go.GridLayout);

/** @override */
ProgramLayout.prototype.doLayout = function (coll) {
  var diagram = this.diagram;
  if (diagram === null) return;
  diagram.startTransaction("ProgramLayout");
  var Program = this.group;
  if (Program !== null && Program.category === "Program") {
    // make sure all of the Group Shapes are big enough
    var minsize = computeMinProgramSize(Program);
    Program.memberParts.each(function (Step) {
      if (!(Step instanceof go.Group)) return;
      if (Step.category !== "Program") {
        var shape = Step.resizeObject;
        if (shape !== null) { // change the desiredSize to be big enough in both directions
          var sz = computeStepSize(Step);
          shape.width = (!isNaN(shape.width)) ? Math.max(shape.width, sz.width) : sz.width;
          shape.height = (isNaN(shape.height) ? minsize.height : Math.max(shape.height, minsize.height));
          var cell = Step.resizeCellSize;
          if (!isNaN(shape.width) && !isNaN(cell.width) && cell.width > 0) shape.width = Math.ceil(shape.width / cell.width) * cell.width;
          if (!isNaN(shape.height) && !isNaN(cell.height) && cell.height > 0) shape.height = Math.ceil(shape.height / cell.height) * cell.height;
        }
      }
    });
  }
  // now do all of the usual stuff, according to whatever properties have been set on this GridLayout
  go.GridLayout.prototype.doLayout.call(this, coll);
  diagram.commitTransaction("ProgramLayout");
};
// end ProgramLayout class

function SingleProgramLayout() {
  go.GridLayout.call(this);
  this.wrappingColumn = 1;
  this.sorting = go.GridLayout.Ascending;
  this.comparer = function (a, b) {
    if (a.data.text < b.data.text) return -1;
    if (a.data.text > b.data.text) return 1;
    return 0;
  };
}
go.Diagram.inherit(SingleProgramLayout, ProgramLayout);

var program_cnt;

// connect correct links

var group_v = {};
var group = [];

function updateCrossStepLinks() {
  myDiagram.layout.invalidateLayout();
  group_v = {};
  group = [];
  myDiagram.nodes.each(function (nw) {
    if (nw.data.isGroup) {
      if (nw.data.category === "Program") return;
      group.push(nw);
      return;
    }
    if (group_v[nw.data.group] === undefined) group_v[nw.data.group] = [];
    group_v[nw.data.group].push(nw);
  });
  group.sort(function (a, b) {
    if (a.location.y < b.location.y) return -1;
    if (a.location.y > b.location.y) return 1;
    if (a.location.x < b.location.x) return -1;
    if (a.location.x > b.location.x) return 1;
    return 0;
  })
  for (k in group_v) {
    group_v[k].sort(function (a, b) {
      if (a.location.y < b.location.y) return -1;
      if (a.location.y > b.location.y) return 1;
      if (a.location.x < b.location.x) return -1;
      if (a.location.x > b.location.x) return 1;
      return 0;
    })
  }
  linkData = [];
  bin = [];
  bin_f = 0;
  for (l = 0; l < group.length - 1; ++l) {
    r = l + 1;
    if (group[l].location.y != group[r].location.y) continue;
    g_l = group[l];
    g_r = group[r];
    l_ptr = 0; l_cnt = 0;
    r_ptr = 0; r_cnt = 0;
    while (l_ptr < group_v[g_l.key].length && group_v[g_l.key][l_ptr].data.category == "JSBB") {
      ++l_ptr;
    }
    while (r_ptr < group_v[g_r.key].length && group_v[g_r.key][r_ptr].data.category == "JSBB") {
      ++r_ptr;
    }
    if (l_ptr < group_v[g_l.key].length) l_cnt = group_v[g_l.key][l_ptr].data.osize;
    if (r_ptr < group_v[g_r.key].length) r_cnt = group_v[g_r.key][r_ptr].data.isize;
    while (l_ptr < group_v[g_l.key].length && r_ptr < group_v[g_r.key].length) {
      while (l_ptr < group_v[g_l.key].length && l_cnt == 0) {
        l_ptr++;
        if (l_ptr >= group_v[g_l.key].length) break;
        l_cnt = group_v[g_l.key][l_ptr].data.osize;
      }
      if (l_ptr >= group_v[g_l.key].length) break;
      while (r_ptr < group_v[g_r.key].length && r_cnt == 0) {
        r_ptr++;
        if (r_ptr >= group_v[g_r.key].length) break;
        r_cnt = group_v[g_r.key][r_ptr].data.isize;
      }
      if (r_ptr >= group_v[g_r.key].length) break;
      while (l_cnt > 0 && r_cnt > 0) {
        nw = {}
        nw.from = group_v[g_l.key][l_ptr].key;
        nw.to = group_v[g_r.key][r_ptr].key;
        linkData.push(nw);
        l_cnt--;
        r_cnt--;
      }
    }
    while (l_cnt > 0) {      
      bin.push(group_v[g_l.key][l_ptr].key)
      l_cnt--;
    }
    while (l_ptr < group_v[g_l.key].length) {
      while (l_ptr < group_v[g_l.key].length && l_cnt == 0) {
        l_ptr++;
        if (l_ptr >= group_v[g_l.key].length) break;
        l_cnt = group_v[g_l.key][l_ptr].data.osize;
      }
      if (l_ptr >= group_v[g_l.key].length) break;
      bin.push(group_v[g_l.key][l_ptr].key)
      l_cnt--;
    }
    while (r_cnt > 0  && bin_f < bin.length) {
      nw = {}
      nw.from = bin[bin_f];
      bin_f++;
      nw.to = group_v[g_r.key][r_ptr].key;
      linkData.push(nw);
      r_cnt--;
    }
    while (r_ptr < group_v[g_r.key].length && bin_f < bin.length) {
      while (r_cnt == 0) {
        r_ptr++;
        if (r_ptr >= group_v[g_r.key].length) break;
        r_cnt = group_v[g_r.key][r_ptr].data.isize;
      }
      if (r_ptr >= group_v[g_r.key].length) break;
      nw = {}
      nw.from = bin[bin_f];
      bin_f++;
      nw.to = group_v[g_r.key][r_ptr].key;
      linkData.push(nw);
      r_cnt--;
    }

    // sp JSBB
    for (i = 0; i < group_v[g_l.key].length; ++i) {
      ll = group_v[g_l.key][i];
      if ("toJSBB" in ll.data && ll.data.toJSBB == true) {
        nw = {}
        nw.from = ll.key;
        nw.to = group_v[g_r.key][0].key;
        linkData.push(nw);
      }
    }
    for (i = 0; i < group_v[g_r.key].length; ++i) {
      rr = group_v[g_r.key][i];
      if ("fromJSBB" in rr.data && rr.data.fromJSBB == true) {
        nw = {}
        nw.from = group_v[g_l.key][0].key;
        nw.to = rr.key;
        linkData.push(nw);
      }
    }
  }
  //update color
  myDiagram.model.linkDataArray = linkData;
  myDiagram.nodes.each(function(nw) {nw.updateTargetBindings();});
  myDiagram.layout.invalidateLayout();
}

function init() {
  var $ = go.GraphObject.make;
  program_cnt = 2;
  myDiagram =
    $(go.Diagram, "myDiagramDiv", {
      // start everything in the middle of the viewport
      initialContentAlignment: go.Spot.Center,
      // use a simple layout that ignores links to stack the top-level Program Groups next to each other
      layout: $(SingleProgramLayout),
      allowDrop: true, // must be true to accept drops from the Palette
      // don't allow dropping onto the diagram's background unless they are all Groups (Steps or Programs)
      mouseDragOver: function (e) {
        if (!e.diagram.selection.all(function (n) {
            return n instanceof go.Group;
          })) {
          e.diagram.currentCursor = 'not-allowed';
        }
      },
      mouseDrop: function (e) {
        if (!e.diagram.selection.all(function (n) {
            return n instanceof go.Group;
          })) {
          e.diagram.currentTool.doCancel();
        }
      },
      // a clipboard copied node is pasted into the original node's group (i.e. Step).
      "commandHandler.copiesGroupKey": true,
      // automatically re-layout the swim Steps after dragging the selection
      "SelectionMoved": relayoutDiagram, // this DiagramEvent listener is
      "SelectionCopied": relayoutDiagram, // defined above
      "animationManager.isEnabled": false,
      // enable undo & redo
      "undoManager.isEnabled": true
    });

  myDiagram.nodeTemplateMap.add("", // default
    $(go.Node, "Auto",
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "Rectangle", {
        fill: "white",
        portId: "",
        cursor: "pointer",
        fromLinkable: false,
        toLinkable: false
      }),
      $(go.TextBlock, {
          editable: true,
          margin: 10
        },
        new go.Binding("text", "key").makeTwoWay()), {
        dragComputation: function (part, pt, gridpt) {
          return pt;
        }
      } // limit dragging of Nodes to stay within the containing Group, defined above
    ));

  myDiagram.nodeTemplateMap.add("JSBB", // represent a JS program basic block
    $(go.Node, "Auto",
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "Rectangle", {
        fill: "orange",
        portId: "",
        cursor: "cell",
        fromLinkable: false,
        toLinkable: false
      }),
      $(go.TextBlock, {
          editable: false,
          margin: 10,
          text: "JS block",
          cursor: "cell",
          stroke: "white"
        },
        new go.Binding("text", "text").makeTwoWay()), {
        dragComputation: function (part, pt, gridpt) {
          return pt;
        },
        doubleClick: openJSBBModal
      } // limit dragging of Nodes to stay within the containing Group, defined above
    ));

  function QgateColorConverter(nodeData, elt) {
    if (nodeData.gtype == "Measure") return "green";
    if (nodeData.gtype == "C_U") return "purple"; 
    if (nodeData.gtype == "CNOT") return "purple"; 
    if (nodeData.gtype == "Hadamard") return "DodgerBlue"; 
    if (nodeData.gtype == "SWAP") return "FireBrick"; 
    return "blue";
  }

  function QgateNameManager(nodeData, elt) {
    if (typeof(nodeData.text) != "undefined") return nodeData.text;
    return nodeData.gtype;
  }


  myDiagram.nodeTemplateMap.add("Qgate", // represent a JS program basic block
    $(go.Node, "Auto",
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "Rectangle", {
          portId: "",
          cursor: "cell",
          fromLinkable: false,
          toLinkable: false
        },
        new go.Binding("fill", "", QgateColorConverter).makeTwoWay()),
      $(go.TextBlock, {
          editable: false,
          margin: 10,
          cursor: "cell",
          stroke: "white"
        },
        new go.Binding("text", "", QgateNameManager).makeTwoWay()), {
        dragComputation: function (part, pt, gridpt) {
          return pt;
        },
        doubleClick: openQgateModal
      } // limit dragging of Nodes to stay within the containing Group, defined above
    ));

  function groupStyle() { // common settings for both Step and Program Groups
    return [{
        layerName: "Background", // all Programs and Steps are always behind all nodes and links
        background: "transparent", // can grab anywhere in bounds
        movable: true, // allows users to re-order by dragging
        copyable: true, // Actually :D can copy Steps or Programs
        avoidable: false, // don't impede AvoidsNodes routed Links
        minLocation: new go.Point(-Infinity, NaN), // only allow horizontal movement
        maxLocation: new go.Point(Infinity, NaN)
      },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify)
    ];
  }

  function stepColorConverter(nodeData, elt) {
    if (nodeData.key in group_v) {
      for (i in group_v[nodeData.key]) {
        nw = group_v[nodeData.key][i];
        if ("gtype" in nw.data && nw.data.gtype == "Measure") return "lightgreen";
      }
    }
    return "lightgrey";
  }

  // each Group is a "swimStep" with a header on the left and a resizable Step on the right
  myDiagram.groupTemplate =
    $(go.Group, "Vertical", groupStyle(), {
        selectionObjectName: "SHAPE", // selecting a Step causes the body of the Step to be highlit, not the label
        resizable: false,
        resizeObjectName: "SHAPE", // the custom resizeAdornmentTemplate only permits two kinds of resizing
        layout: $(go.GridLayout, // automatically lay out the lane's subgraph
          {
            wrappingColumn: 1,
            cellSize: new go.Size(1, 1),
            spacing: new go.Size(5, 5),
            alignment: go.GridLayout.Position,
            comparer: function (a, b) { // can re-order tasks within a lane
              if (a.category == "JSBB") return -1;
              if (b.category == "JSBB") return 1;
              var ay = a.location.y;
              var by = b.location.y;
              if (isNaN(ay) || isNaN(by)) return 0;
              if (ay < by) return -1;
              if (ay > by) return 1;
              return 0;
            }
          }),
        computesBoundsAfterDrag: true, // needed to prevent recomputing Group.placeholder bounds too soon
        computesBoundsIncludingLinks: false, // to reduce occurrences of links going briefly outside the Step
        computesBoundsIncludingLocation: true, // to support empty space at top-left corner of Step
        handlesDragDropForMembers: true, // don't need to define handlers on member Nodes and Links
        mouseDrop: function (e, grp) { // dropping a copy of some Nodes and Links onto this Group adds them to this Group
          // I don't think I want a shift.. So I comment here
          // if (!e.shift) return;  // cannot change groups with an unmodified drag-and-drop
          // don't allow drag-and-dropping a mix of regular Nodes and Groups
          if (!e.diagram.selection.any(function (n) {
              return n instanceof go.Group;
            })) {
            var ok = grp.addMembers(grp.diagram.selection, true);
            if (ok) {
              updateCrossStepLinks(grp);
            } else {
              grp.diagram.currentTool.doCancel();
            }
          } else {
            e.diagram.currentTool.doCancel();
          }
        },
        subGraphExpandedChanged: function (grp) {
          return;
          var shp = grp.resizeObject;
          if (grp.diagram.undoManager.isUndoingRedoing) return;
          if (grp.isSubGraphExpanded) {
            shp.width = grp._savedBreadth;
          } else {
            grp._savedBreadth = shp.width;
            shp.width = NaN;
          }
          updateCrossStepLinks(grp);
        }
      },
      new go.Binding("isSubGraphExpanded", "expanded").makeTwoWay(),
      // the Step header consisting of a Shape and a TextBlock
      $(go.Panel, "Horizontal", {
          name: "HEADER",
          angle: 0, // maybe rotate the header to read sideways going up
          alignment: go.Spot.Center
        },
        $(go.Panel, "Horizontal", // this is hidden when the swimStep is collapsed
          new go.Binding("visible", "isSubGraphExpanded").ofObject(),
          $(go.Shape, "Circle", {
              width: 8,
              height: 8
            },
            new go.Binding("fill", "", stepColorConverter).makeTwoWay()),
          $(go.TextBlock, // the Step label
            {
              font: "bold 13pt sans-serif",
              editable: true,
              margin: new go.Margin(0, 0, 0, 5)
            },
            new go.Binding("text", "text").makeTwoWay())
        ),
        $("SubGraphExpanderButton", {
          margin: 5
        }) // but this remains always visible!
      ), // end Horizontal Panel
      $(go.Panel, "Auto", // the Step consisting of a background Shape and a Placeholder representing the subgraph
        $(go.Shape, "Rectangle", // this is the resized object
          {
            name: "SHAPE"
          },
          new go.Binding("fill", "", stepColorConverter).makeTwoWay(),
          new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify)),
        $(go.Placeholder, {
          padding: new go.Margin(30, 20, 30, 20),
          alignment: go.Spot.TopLeft
        }),
        $(go.TextBlock, // this TextBlock is only seen when the swimStep is collapsed
          {
            name: "LABEL",
            font: "bold 13pt sans-serif",
            editable: true,
            angle: 90,
            alignment: go.Spot.TopLeft,
            margin: new go.Margin(4, 0, 0, 2)
          },
          new go.Binding("visible", "isSubGraphExpanded", function (e) {
            return !e;
          }).ofObject(),
          new go.Binding("text", "text").makeTwoWay())
      ) // end Auto Panel
    ); // end Group

  myDiagram.groupTemplateMap.add("Program",
    $(go.Group, "Auto", groupStyle(), { // use a simple layout that ignores links to stack the "Step" Groups next to each other
        layout: $(ProgramLayout, {
          spacing: new go.Size(0, 0)
        }) // no space between Steps
      },
      $(go.Shape, {
          fill: "white"
        },
        new go.Binding("fill", "color")),
      $(go.Panel, "Table", {
          defaultRowSeparatorStroke: "black"
        },
        $(go.Panel, "Horizontal", {
            row: 0,
            angle: 0
          },
          $(go.TextBlock, {
              font: "bold 16pt sans-serif",
              editable: true,
              margin: new go.Margin(0, 0, 0, 0)
            },
            new go.Binding("text", "text").makeTwoWay())
        ),
        $(go.Placeholder, {
          row: 2,
          rowSpan: 2
        })
      )
    ));

  function linkColorConverter(linkdata, elt) {
    var blue = "blue"
    var normal = "orange"
    var link = elt.part;
    if (!link) return normal;
    var f = link.fromNode;
    if (!f || !f.data || f.category === "JSBB") return normal;
    var t = link.toNode;
    if (!t || !t.data || t.category === "JSBB") return normal;
    return blue; // when both Link.fromNode.data.critical and Link.toNode.data.critical
  }

  myDiagram.linkTemplate =
    $(go.Link, {
        routing: go.Link.AvoidsNodes /*go.Link.AvoidsNodes*/ ,
        corner: 30,
        opacity: 0.6,
        toShortLength: 2
      }, {
        relinkableFrom: true,
        relinkableTo: true
      },
      $(go.Shape, {
          strokeWidth: 4
        },
        new go.Binding("stroke", "", linkColorConverter)),
      $(go.Shape, {
          toArrow: "Standard",
          scale: 1.5,
          strokeWidth: 0
        },
        new go.Binding("fill", "", linkColorConverter))
    );

  // define some sample graphs in some of the Steps
  myDiagram.model = new go.GraphLinksModel(
    [ // node data empty
      {},

      {
        key: "P2",
        text: "Program2",
        isGroup: true,
        category: "Program"
      },
      {
        key: "P2S1",
        text: "Step1",
        isGroup: true,
        group: "P2",
        category: "Stage"
      },
      {
        key: "P2S2",
        text: "Step2",
        isGroup: true,
        group: "P2",
        category: "Stage"
      },
      {
        key: "k",
        group: "P2S1",
        category: "Qgate",
        isize: 0,
        osize: 1,
        gtype: "|0>"
      },
      {
        key: "l",
        group: "P2S2",
        category: "Qgate",
        isize: 1,
        osize: 0,
        gtype: "Measure"
      }
    ]);

  // add a palette
  myPalette =
    $(go.Palette, "myPaletteDiv", // must name or refer to the DIV HTML element
      {
        contentAlignment: go.Spot.Center,
        scrollsPageOnFocus: true,
        nodeTemplateMap: myDiagram.nodeTemplateMap, // share the templates used by myDiagram
        model: new go.GraphLinksModel([ // specify the contents of the Palette
          {
            key: "baseJS_",
            category: "JSBB",
            text: "JS_identity",
            isize: 0,
            osize: 0,
            code: "identity = function(x) {return x;}"
          },
          {
            key: "baseI_",
            category: "Qgate",
            isize: 1,
            osize: 1,
            gtype: "Identity"
          },
          {
            key: "base0_",
            category: "Qgate",
            isize: 0,
            osize: 1,
            gtype: "|0>"
          },
          {
            key: "base1_",
            category: "Qgate",
            isize: 0,
            osize: 1,
            gtype: "|1>"
          },
          {
            key: "baseH_",
            category: "Qgate",
            isize: 1,
            osize: 1,
            gtype: "Hadamard"
          },
          {
            key: "baseX_",
            category: "Qgate",
            isize: 1,
            osize: 1,
            gtype: "PauliX"
          },
          {
            key: "baseM_",
            category: "Qgate",
            isize: 1,
            osize: 1,
            gtype: "Measure",
            toJSBB: true
          },
          {
            key: "SWAP_",
            text: "SWAP",
            category: "Qgate",
            isize: 2,
            osize: 2,
            gtype: "SWAP",
            u: []
          },
          {
            key: "CNOT_", 
            text: "CNOT",
            category: "Qgate",
            isize: 2,
            osize: 2,
            gtype: "CNOT",
            u: [[[1,0],[0,0],[0,0],[0,0]], [[0,0],[1,0],[0,0],[0,0]], [[0,0],[0,0],[0,0],[1,0]], [[0,0],[0,0],[1,0],[0,0]]]
          },
          {
            key: "C_U_",
            text: "C_U",
            category: "Qgate",
            isize: 2,
            osize: 2,
            gtype: "C_U",
            u: []
          }
        ])
      });
  // force all Steps' layouts to be performed
  load();
  relayoutSteps();

  // for test
  // openRunModal();
} // end init

// Show the diagram's model in JSON format
function save() {
  document.getElementById("mySavedModel").value = myDiagram.model.toJson();
  myDiagram.isModified = false;
}

function load() {
  myDiagram.model = go.Model.fromJson(document.getElementById("mySavedModel").value);
  myDiagram.delayInitialization(relayoutDiagram);
  relayoutSteps();
  updateCrossStepLinks();
}

function sleep(numberMillis) {
  var now = new Date();
  var exitTime = now.getTime() + numberMillis;
  while (true) {
    now = new Date();
    if (now.getTime() > exitTime)
      return;
  }
}

function refresh() {
  save();
  sleep(100); // save is async?
  load();
}

function run() {
  var config = $("#Run_config");
  var text = $("#Run_text");
  text.html("");
  var entry = eval(config.val());
  text.text(entry(Programs));
}