//Template Written by Brian Munz https://community.qlik.com/docs/DOC-3742 and slightly adapted by  APD adam@daftsolutions.co.uk
//This is template version 1.0 released 19/08/2016
//Please leave these lines in place if you're using this template

//D3 code from Mike Bostock: http://bl.ocks.org/mbostock/7607535


//set our extension name in a variable
var extensionName = "Zoomable Circle Packing"; //remember to also update this in definition.xml

//now we can use this in our extensionpath so you're not a dufus again and spend 3hours looking for the missing "/" at the end
var extensionPath = Qva.Remote + "?public=only&name=Extensions/" + extensionName +"/";

//now lets sort out our additional files:

function extensionInit() {
	var jsfiles = [];
	//load jquery if required
	if (typeof jQuery == 'undefined') {
	jsfiles.push(extensionPath + "jquery.js");
	}
	//Pushing any other js files	
	jsfiles.push(extensionPath + "d3.v3.min.js");
	//jsfiles.push(extensionPath + "additionalfileshere.js");
	
	//now load these and call next function
	 Qva.LoadScript(jsfiles, extensionDone);
							} //end extension_Init

							
							
							
//What I didn't realize is that in order to use the HTML select, you need to include extra code in your script.js file:
if (Qva.Mgr.mySelect == undefined) {
    Qva.Mgr.mySelect = function (owner, elem, name, prefix) {
        if (!Qva.MgrSplit(this, name, prefix)) return;
        owner.AddManager(this);
        this.Element = elem;
        this.ByValue = true;
 
        elem.binderid = owner.binderid;
        elem.Name = this.Name;
 
        elem.onchange = Qva.Mgr.mySelect.OnChange;
        elem.onclick = Qva.CancelBubble;
    }
    Qva.Mgr.mySelect.OnChange = function () {
        var binder = Qva.GetBinder(this.binderid);
        if (!binder.Enabled) return;
        if (this.selectedIndex < 0) return;
        var opt = this.options[this.selectedIndex];
        binder.Set(this.Name, 'text', opt.value, true);
    }
    Qva.Mgr.mySelect.prototype.Paint = function (mode, node) {
        this.Touched = true;
        var element = this.Element;
        var currentValue = node.getAttribute("value");
        if (currentValue == null) currentValue = "";
        var optlen = element.options.length;
        element.disabled = mode != 'e';
        //element.value = currentValue;
        for (var ix = 0; ix < optlen; ++ix) {
            if (element.options[ix].value === currentValue) {
                element.selectedIndex = ix;
            }
        }
        element.style.display = Qva.MgrGetDisplayFromMode(this, mode);
 
    }
} //end with the HTML select magic


function extensionDone() {


	Qva.AddExtension(extensionName , function(){

		//Load a CSS style sheet
		Qva.LoadCSS(extensionPath + "style.css");
		
		//make this equal _this		
			var _this = this;
			
		//setup html
			var html = "";		
		
			
		
		
		//add a unique name to the extension in order to prevent conflicts with other extensions.
		//basically, take the object ID and add it to a DIV
		var divName = _this.Layout.ObjectId.replace("\\", "_");
		if(_this.Element.children.length == 0) {//if this div doesn't already exist, create a unique div with the divName
			var ui = document.createElement("div");
			ui.setAttribute("id", divName);
			_this.Element.appendChild(ui);
		} else {
			//if it does exist, empty the div so we can fill it again
			$("#" + divName).empty();
		}
	


//****************************************************************************************************************
//start your extension code here	
//****************************************************************************************************************
var data = [];
var nodesArray = [];
var parents = [];
var selectedNode = '';
var showValues = false;
var selectedNodes = [];
var parentTitles = '';

//layout shizzle

//var diameter = _this.Layout.Text0.text.toString();
//var parentTitles = _this.Layout.Text1.text.toString();

//do the data stuff here

for (var f = 0; f < _this.Data.Rows.length; f++) {
    var row = _this.Data.Rows[f];
    var dim1 = row[0].text;
    var dim2 = row[1].text;
    var measure1 = parseFloat(parseFloat(row[2].text).toFixed(2));
    //shove this into our node:
    var node = [{
        "name": dim2
    }, {
        "parent": dim1
    }, {
        "size": measure1
    }];
    nodesArray.push(node);
    parents.push(row[0].text);
}




// This code appears in most D3 extensions which require data in a JSON format
//therefore lets just reuse it to create the data in the correct format rather than re-inventing the wheel
//start copied code here

var uniqueParents = parents.filter(function(itm, i, a) {
    return i == a.indexOf(itm);

});

if (uniqueParents.length == 0) {
    nodesArray.push([{
        "name": uniqueParents[0]
    }, {
        "parent": '-'
    }, {
        "size": 1
    }]);

} else {
    if (selectedNode) {
        for (var i = 0; i < uniqueParents.length; i++) {
            if (uniqueParents[i] == selectedNode) {
                nodesArray.push([{
                    "name": uniqueParents[i]
                }, {
                    "parent": '-'
                }, {
                    "size": 1
                }]);

            }
        }
    }

}

var nodesJson = createJSON(nodesArray);


function createJSON(Data) {
    var happyData = Data.map(function(d) {
        return {
            name: d[0].name,
            parent: d[1].parent,
            size: d[2].size
        };
    });


    function getChildren(name) {
        return happyData.filter(function(d) {
                return d.parent === name;
            })
            .map(function(d) {
                var values = '';
                if (showValues == true) {
                    values = ' (' + parseInt(d.size).toLocaleString() + ')';
                }
                return {
                    name: d.name + '' + values,
                    size: d.size,
                    children: getChildren(d.name)
                };
            });
    }
    return getChildren('-')[0];
}

function traverse(o) {
    for (i in o) {
        if (typeof(o[i]) == "object") {
            if (o[i].name) {
                selectedNodes.push((o[i].name));
            }

            traverse(o[i]);
        }
    }
}

function removeProp(obj, propName) {
    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            if (p == propName) {
                delete obj[p];
            } else if (typeof obj[p] == 'object') {
                removeProp(obj[p], propName);
            }
        }
    }
    return obj;
}

// end copied code here			

//Start the D3 code here				

var root = nodesJson;

//add some basic niceties to resize the object in the window
var diameter = Math.min(_this.GetWidth(), _this.GetHeight());
var margin = diameter / 30;


var color = d3.scale.linear()
    .domain([-1, 5])
    .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
    .interpolate(d3.interpolateHcl);

var pack = d3.layout.pack()
    .padding(2)
    .size([diameter - margin, diameter - margin])
    .value(function(d) {
        return d.size;
    })

var chart = d3.select("#" + divName)
    .append("svg")
    .attr("width", diameter)
    .attr("height", diameter)
    .append("g")
    .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");


var focus = root,
    nodes = pack.nodes(root),
    view;

var circle = chart.selectAll("circle")
    .data(nodes)
    .enter().append("circle")
    .attr("class", function(d) {
        return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root";
    })
    .style("fill", function(d) {
        return d.children ? color(d.depth) : null;
    })
    .on("click", function(d) {
        if (focus !== d) zoom(d), d3.event.stopPropagation();
    });

var text = chart.selectAll("text")
    .data(nodes)
    .enter().append("text")
    .attr("class", "label")
    .style("fill-opacity", function(d) {
        return d.parent === root ? 1 : 0;
    })
    .style("display", function(d) {
        return d.parent === root ? "inline" : "none";
    })
    .text(function(d) {
        return d.name;
    });

var node = chart.selectAll("circle,text");

d3.select("body")
    .style("maincircle", color(-1))
    .on("click", function() {
        zoom(root);
    });

zoomTo([root.x, root.y, root.r * 2 + margin]);

function zoom(d) {
    var focus0 = focus;
    focus = d;

    var transition = d3.transition()
        .duration(d3.event.altKey ? 7500 : 750)
        .tween("zoom", function(d) {
            var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 + margin]);
            return function(t) {
                zoomTo(i(t));
            };
        });

    transition.selectAll("text")
        .filter(function(d) {
            return d.parent === focus || this.style.display === "inline";
        })
        .style("fill-opacity", function(d) {
            return d.parent === focus ? 1 : 0;
        })
        .each("start", function(d) {
            if (d.parent === focus) this.style.display = "inline";
        })
        .each("end", function(d) {
            if (d.parent !== focus) this.style.display = "none";
        });
}

function zoomTo(v) {
    var k = diameter / v[2];
    view = v;
    node.attr("transform", function(d) {
        return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")";
    });
    circle.attr("r", function(d) {
        return d.r * k;
    });
}


d3.select(self.frameElement).style("height", diameter + "px");



//end the D3 code here
	
			
			
//****************************************************************************************************************
//end your extension code here
//****************************************************************************************************************


			
			
			},true); //end add extension				
						
						}; //end extensionDone


//This loads up firebug within the qlikview application comment it out in live!

 //Qva.LoadScript('https://getfirebug.com/firebug-lite.js', function(){  //comment this row out in live


extensionInit(); //call the function that kicks everything off 

// }); //comment this row out in live

