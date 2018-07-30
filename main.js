// These parameters need to be set before defining the templates.
var MINLENGTH = 200;  // this controls the minimum length of any swimStep
var MINBREADTH = 20;  // this controls the minimum breadth of any non-collapsed swimStep
var lastSrc;
function openJSBBModal(e, src) {
  console.log("OpenJSBBModal triggered");
  lastSrc = src;
  $('#JSBB_modal_code').val(src.data.code);
  $('#JSBB_modal').modal();
  /*JSBB_modal_code = document.getElementById("JSBB_modal_code");
  console.log(JSBB_modal_code)
  var myCodeMirror = CodeMirror.fromTextArea(JSBB_modal_code, {
    lineNumbers: true,
    theme: "base16-light"
  });*/
}

function closeJSBBModal(e) {
  lastSrc.data.code = $('#JSBB_modal_code').val();
}

function openQgateModal(e, src) {
  console.log("OpenQgateModal triggered");
  lastSrc = src;
  $('#Qgate_modal_code').val(src.data.code);
  $('#Qgate_modal').modal();
  /*JSBB_modal_code = document.getElementById("JSBB_modal_code");
  console.log(JSBB_modal_code)
  var myCodeMirror = CodeMirror.fromTextArea(JSBB_modal_code, {
    lineNumbers: true,
    theme: "base16-light"
  });*/
}

function closeQgateModal(e) {
  lastSrc.data.code = $('#Qgate_modal_code').val();
}

// some shared functions

// this may be called to force the Steps to be laid out again
function relayoutSteps() {
  myDiagram.nodes.each(function(Step) {
    if (!(Step instanceof go.Group)) return;
    if (Step.category === "Program") return;
    Step.layout.isValidLayout = false;  // force it to be invalid
  });
  myDiagram.layoutDiagram();
}

// this is called after nodes have been moved or Steps resized, to layout all of the Program Groups again
function relayoutDiagram() {
  myDiagram.layout.invalidateLayout();
  myDiagram.findTopLevelGroups().each(function(g) { if (g.category === "Program") g.layout.invalidateLayout(); });
  myDiagram.layoutDiagram();
}

// compute the minimum size of a Program Group needed to hold all of the Step Groups
function computeMinProgramSize(Program) {
  // assert(Program instanceof go.Group && Program.category === "Program");
  var len = MINLENGTH;
  Program.memberParts.each(function(Step) {
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
  this.isRealtime = false;  // don't continuously layout while dragging
  this.alignment = go.GridLayout.Position;
  // This sorts based on the location of each Group.
  // This is useful when Groups can be moved up and down in order to change their order.
  this.comparer = function(a, b) {
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
ProgramLayout.prototype.doLayout = function(coll) {
  var diagram = this.diagram;
  if (diagram === null) return;
  diagram.startTransaction("ProgramLayout");
  var Program = this.group;
  if (Program !== null && Program.category === "Program") {
    // make sure all of the Group Shapes are big enough
    var minsize = computeMinProgramSize(Program);
    Program.memberParts.each(function(Step) {
      if (!(Step instanceof go.Group)) return;
      if (Step.category !== "Program") {
        var shape = Step.resizeObject;
        if (shape !== null) {  // change the desiredSize to be big enough in both directions
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
  this.comparer = function(a, b) {
    if (a.data.text < b.data.text) return -1;
    if (a.data.text > b.data.text) return 1;
    return 0;
  };
}
go.Diagram.inherit(SingleProgramLayout, ProgramLayout);

var program_cnt;

// connect correct links
function updateCrossStepLinks() {
  var group_v = {};
  var group = [];
  myDiagram.nodes.each(function(nw){
    if (nw.data.isGroup) {
      if (nw.data.category === "Program") return;
      group.push(nw);
      return;
    }
    if (group_v[nw.data.group] === undefined) group_v[nw.data.group] = [];
    group_v[nw.data.group].push(nw);  
  });
  group.sort(function(a, b) {
    if (a.location.y < b.location.y) return -1;
    if (a.location.y > b.location.y) return 1;
    if (a.location.x < b.location.x) return -1;
    if (a.location.x > b.location.x) return 1;
    return 0;
  })
  linkData = [];
  bin = []; bin_f = 0;
  for (l=0; l<group.length-1; ++l) {
    r = l + 1;
    g_l = group[l]; g_r = group[r];
    l_ptr = 0; r_ptr = 0;
    l_cnt = group_v[g_l.key][0].data.osize;
    r_cnt = group_v[g_r.key][0].data.isize;
    if (group[l].location.y != group[r].location.y) continue;
    while (l_ptr < group_v[g_l.key].length && r_ptr < group_v[g_r.key].length) {
      nw = {}
      nw.from = group_v[g_l.key][l_ptr].key;
      nw.to = group_v[g_r.key][r_ptr].key;
      linkData.push(nw);
      l_cnt--; r_cnt--;
      while (l_cnt == 0) {
        l_ptr++;
        if (l_ptr >= group_v[g_l.key].length) break;
        l_cnt = group_v[g_l.key][l_ptr].data.osize;
      }
      while (r_cnt == 0) {
        r_ptr++;
        if (r_ptr >= group_v[g_r.key].length) break;
        r_cnt = group_v[g_r.key][r_ptr].data.isize;
      }
    }
    while (l_ptr < group_v[g_l.key].length) {
      bin.push(group_v[g_l.key][l_ptr].key)
      l_cnt--;
      while (l_cnt == 0) {
        l_ptr++;
        if (l_ptr >= group_v[g_l.key].length) break;
        l_cnt = group_v[g_l.key][l_ptr].data.osize;
      }
    }
    while (r_ptr < group_v[g_r.key].length && bin_f < bin.length) {
      nw = {}
      nw.from = bin[bin_f]; bin_f++;
      nw.to = group_v[g_r.key][r_ptr].key;
      linkData.push(nw);
      r_cnt--;
      while (r_cnt == 0) {
        r_ptr++;
        if (r_ptr >= group_v[g_r.key].length) break;
        r_cnt = group_v[g_r.key][r_ptr].data.isize;
      }
    }
    // sp JSBB
    for (i=0; i<group_v[g_l.key].length; ++i) {
      ll = group_v[g_l.key][i];
      if ("toJSBB" in ll.data && ll.data.toJSBB === true) {
        nw = {}
        nw.from = ll.key;
        nw.to = group_v[g_r.key][0].key;
        linkData.push(nw);
      }
    }      
    for (i=0; i<group_v[g_r.key].length; ++i) {
      rr = group_v[g_r.key][i];
      if ("fromJSBB" in rr.data && rr.data.fromJSBB === true) {
        nw = {}
        nw.from = group_v[g_l.key][0].key;
        nw.to = rr.key;
        linkData.push(nw);
      }
    }
  }
  myDiagram.model.linkDataArray = linkData;
}

function init() {
  var $ = go.GraphObject.make;
  program_cnt = 2;
  myDiagram =
    $(go.Diagram, "myDiagramDiv",
      {
        // start everything in the middle of the viewport
        initialContentAlignment: go.Spot.Center,
        // use a simple layout that ignores links to stack the top-level Program Groups next to each other
        layout: $(SingleProgramLayout),
        allowDrop: true,  // must be true to accept drops from the Palette
        // don't allow dropping onto the diagram's background unless they are all Groups (Steps or Programs)
        mouseDragOver: function(e) {
          if (!e.diagram.selection.all(function(n) { return n instanceof go.Group; })) {
            e.diagram.currentCursor = 'not-allowed';
          }
        },
        mouseDrop: function(e) {
          if (!e.diagram.selection.all(function(n) { return n instanceof go.Group; })) {
            e.diagram.currentTool.doCancel();
          }
        },
        // a clipboard copied node is pasted into the original node's group (i.e. Step).
        "commandHandler.copiesGroupKey": true,
        // automatically re-layout the swim Steps after dragging the selection
        "SelectionMoved": relayoutDiagram,  // this DiagramEvent listener is
        "SelectionCopied": relayoutDiagram, // defined above
        "animationManager.isEnabled": false,
        // enable undo & redo
        "undoManager.isEnabled": true
      });

  myDiagram.nodeTemplateMap.add("", // default
    $(go.Node, "Auto",
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "Rectangle",
        { fill: "white", portId: "", cursor: "pointer", fromLinkable: false, toLinkable: false }),
      $(go.TextBlock, { editable: true, margin: 10 },
        new go.Binding("text", "key").makeTwoWay()),
      { dragComputation: function(part, pt, gridpt) {
        return pt;
      }} // limit dragging of Nodes to stay within the containing Group, defined above
    ));
  
  myDiagram.nodeTemplateMap.add("JSBB", // represent a JS program basic block
    $(go.Node, "Auto",
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "Rectangle",
        { fill: "orange", portId: "", cursor: "cell", fromLinkable: false, toLinkable: false}),
      $(go.TextBlock, { editable: false, margin: 10, text: "JS block", cursor: "cell", stroke: "white"}),
      { dragComputation: function(part, pt, gridpt) {
          return pt;
        },
        doubleClick: openJSBBModal
      } // limit dragging of Nodes to stay within the containing Group, defined above
    ));

    myDiagram.nodeTemplateMap.add("Qgate", // represent a JS program basic block
    $(go.Node, "Auto",
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      $(go.Shape, "Rectangle",
        { fill: "blue", portId: "", cursor: "cell", fromLinkable: false, toLinkable: false}),
      $(go.TextBlock, { editable: false, margin: 10, cursor: "cell", stroke: "white"},
        new go.Binding("text", "gtype").makeTwoWay()),
      { dragComputation: function(part, pt, gridpt) {
        return pt;
        },
        doubleClick: openQgateModal
      } // limit dragging of Nodes to stay within the containing Group, defined above
    ));

  function groupStyle() {  // common settings for both Step and Program Groups
    return [
      {
        layerName: "Background",  // all Programs and Steps are always behind all nodes and links
        background: "transparent",  // can grab anywhere in bounds
        movable: true, // allows users to re-order by dragging
        copyable: true,  // Actually :D can copy Steps or Programs
        avoidable: false,  // don't impede AvoidsNodes routed Links
        minLocation: new go.Point(-Infinity, NaN),  // only allow horizontal movement
        maxLocation: new go.Point(Infinity, NaN)
      },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify)
    ];
  }

  // each Group is a "swimStep" with a header on the left and a resizable Step on the right
  myDiagram.groupTemplate =
    $(go.Group, "Vertical", groupStyle(),
      {
        selectionObjectName: "SHAPE",  // selecting a Step causes the body of the Step to be highlit, not the label
        resizable: false, resizeObjectName: "SHAPE",  // the custom resizeAdornmentTemplate only permits two kinds of resizing
        layout: $(go.GridLayout,  // automatically lay out the lane's subgraph
                    {
                      wrappingColumn: 1,
                      cellSize: new go.Size(1, 1),
                      spacing: new go.Size(5, 5),
                      alignment: go.GridLayout.Position,
                      comparer: function(a, b) {  // can re-order tasks within a lane
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
        computesBoundsAfterDrag: true,  // needed to prevent recomputing Group.placeholder bounds too soon
        computesBoundsIncludingLinks: false,  // to reduce occurrences of links going briefly outside the Step
        computesBoundsIncludingLocation: true,  // to support empty space at top-left corner of Step
        handlesDragDropForMembers: true,  // don't need to define handlers on member Nodes and Links
        mouseDrop: function(e, grp) {  // dropping a copy of some Nodes and Links onto this Group adds them to this Group
          // I don't think I want a shift.. So I comment here
          // if (!e.shift) return;  // cannot change groups with an unmodified drag-and-drop
          // don't allow drag-and-dropping a mix of regular Nodes and Groups
          if (!e.diagram.selection.any(function(n) { return n instanceof go.Group; })) {
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
        subGraphExpandedChanged: function(grp) {
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
      $(go.Panel, "Horizontal",
        { name: "HEADER",
          angle: 0,  // maybe rotate the header to read sideways going up
          alignment: go.Spot.Center },
        $(go.Panel, "Horizontal",  // this is hidden when the swimStep is collapsed
          new go.Binding("visible", "isSubGraphExpanded").ofObject(),
          $(go.Shape, "Circle",
            { width: 8, height: 8, fill: "lightgrey" },
            new go.Binding("fill", "color")),
          $(go.TextBlock,  // the Step label
            { font: "bold 13pt sans-serif", editable: true, margin: new go.Margin(0, 0, 0, 5) },
            new go.Binding("text", "text").makeTwoWay())
        ),
        $("SubGraphExpanderButton", { margin: 5 })  // but this remains always visible!
      ),  // end Horizontal Panel
      $(go.Panel, "Auto",  // the Step consisting of a background Shape and a Placeholder representing the subgraph
        $(go.Shape, "Rectangle",  // this is the resized object
          { name: "SHAPE", fill: "lightgrey" }, 
          new go.Binding("fill", "color"),
          new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify)),
        $(go.Placeholder,
          { padding: new go.Margin(30, 20, 30, 20),   alignment: go.Spot.TopLeft }),
        $(go.TextBlock,  // this TextBlock is only seen when the swimStep is collapsed
          { name: "LABEL",
            font: "bold 13pt sans-serif", editable: true,
            angle: 90, alignment: go.Spot.TopLeft, margin: new go.Margin(4, 0, 0, 2) },
          new go.Binding("visible", "isSubGraphExpanded", function(e) { return !e; }).ofObject(),
          new go.Binding("text", "text").makeTwoWay())
      )  // end Auto Panel
    );  // end Group

  myDiagram.groupTemplateMap.add("Program",
    $(go.Group, "Auto", groupStyle(),
      { // use a simple layout that ignores links to stack the "Step" Groups next to each other
        layout: $(ProgramLayout, { spacing: new go.Size(0, 0) })  // no space between Steps
      },
      $(go.Shape,
        { fill: "white" },
        new go.Binding("fill", "color")),
      $(go.Panel, "Table",
        { defaultRowSeparatorStroke: "black" },
        $(go.Panel, "Horizontal",
          { row: 0, angle: 0 },
          $(go.TextBlock,
            { font: "bold 16pt sans-serif", editable: true, margin: new go.Margin(0, 0, 0, 0) },
            new go.Binding("text", "text").makeTwoWay())
        ),
        $(go.Placeholder,
          { row: 2, rowSpan: 2 })
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
      return blue;  // when both Link.fromNode.data.critical and Link.toNode.data.critical
  }

  myDiagram.linkTemplate =
    $(go.Link,
      { routing: go.Link.AvoidsNodes/*go.Link.AvoidsNodes*/, corner: 30, opacity: 0.6, toShortLength: 2},
      { relinkableFrom: true, relinkableTo: true },
      $(go.Shape, { strokeWidth: 4 },
        new go.Binding("stroke", "", linkColorConverter)),
      $(go.Shape, { toArrow: "Standard", scale: 1.5, strokeWidth: 0},
      new go.Binding("fill", "", linkColorConverter))
    );

  // define some sample graphs in some of the Steps
  myDiagram.model = new go.GraphLinksModel(
  [ // node data
    { key: "Program1", text: "Program1", isGroup: true, category: "Program" },
    { key: "Step1", text: "Step1", isGroup: true, group: "Program1" },
    { key: "Step2", text: "Step2", isGroup: true, group: "Program1" },
    { key: "Step3", text: "Step3", isGroup: true, group: "Program1" },
    { key: "Step4", text: "Step4", isGroup: true, group: "Program1" },
    { key: "Step5", text: "Step5", isGroup: true, group: "Program1" },
    { key: "oneA", group: "Step1", category: "JSBB", isize: 0, osize: 1, code: "function(input) {return input+1;}" },
    { key: "oneB", group: "Step1", category: "Qgate", isize: 0, osize: 1, gtype: "|0>" },
    { key: "oneB", group: "Step1", category: "Qgate", isize: 0, osize: 1, gtype: "|1>" },
    { key: "twoA", group: "Step2", category: "JSBB", isize: 1, osize: 1, code: "function(input) {return input*2;}" },
    { key: "twoB", group: "Step2", category: "Qgate", isize: 1, osize: 1, gtype: "Hadamard" },
    { key: "threeA", group: "Step3", category: "JSBB", isize: 1, osize: 1, code: "function(input) {alert(input); return input;}" },
    { key: "threeB", group: "Step3", category: "Qgate", isize: 2, osize: 2, gtype: "C-U", fromJSBB: true },
    { key: "fourA", group: "Step4", category: "JSBB", isize: 1, osize: 1, code: "function(input) {return input;}" },
    { key: "fourB", group: "Step4", category: "Qgate", isize: 2, osize: 0, gtype: "Measure", toJSBB: true },
    { key: "fiveA", group: "Step5", category: "JSBB", isize: 1, osize: 0, code: "function(input) {alert(input);}" },

    { key: "Program2", text: "Program2", isGroup: true, category: "Program" },
    { key: "Step6", text: "Step6", isGroup: true, group: "Program2" },
    { key: "Step7", text: "Step7", isGroup: true, group: "Program2", color: "lightgreen" },
    { key: "sixA", group: "Step6", category: "Qgate", isize: 1, osize: 1, gtype: "|0>" },
    { key: "sevenA", group: "Step7", category: "Qgate", isize: 1, osize: 1, gtype: "Measure" }
  ]);
  
  // add a palette
  myPalette =
  $(go.Palette, "myPaletteDiv",  // must name or refer to the DIV HTML element
    {
      contentAlignment: go.Spot.Center,
      scrollsPageOnFocus: true,
      nodeTemplateMap: myDiagram.nodeTemplateMap,  // share the templates used by myDiagram
      model: new go.GraphLinksModel([  // specify the contents of the Palette
        { key: "oneA", group: "Step1", category: "JSBB", isize: 1, osize: 1, code: "function(input) {return input+1;}" },
        { key: "oneB", group: "Step1", category: "Qgate", isize: 1, osize: 1, gtype: "Hadamard"},
        { key: "oneB", group: "Step1", category: "Qgate", isize: 0, osize: 1, gtype: "|0>" },
        { key: "oneB", group: "Step1", category: "Qgate", isize: 0, osize: 1, gtype: "|1>" },
      ])
    });
  // force all Steps' layouts to be performed
  relayoutSteps();
  updateCrossStepLinks();
}  // end init

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
