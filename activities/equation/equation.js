(function($) {
    // Activity default parameters
    var defaults = {
        name        : "equation",               // The activity name
        template    : "template.html",          // Activity html template
        css         : "style.css",              // Activity css style sheet
        lang        : "fr-FR",                  // now localization
        url         : "desktop/equation.svg",   // The equation svg
        font        : 1,                        // Font size of the exercice
        scalemax    : 2,                        // The scale max
        source      : [],                       // Source element
        top         : 20,                       // top position of the first equation
        debug       : true                      // Debug mode
    };

    var c = {
        val         : 0,
        op          : 1,
        div         : 2,
        bra         : 5
    };

    var div = {
        root        : 0,
        numerator   : 1,
        denominator : 2
    }

    // private methods
    var helpers = {
        // @generic: Check the context
        checkContext: function(_settings){
            var ret         = "";
            if (!_settings.context)         { ret = "no context is provided in the activity call."; } else
            if (!_settings.context.onQuit)  { ret = "mandatory callback onQuit not available."; }

            if (ret.length) {
                ret+="\n\nUsage: $(\"target\")."+_settings.name+"({'onQuit':function(_ret){}})";
            }
            return ret;
        },
        // Get the settings
        settings: function($this, _val) { if (_val) { $this.data("settings", _val); } return $this.data("settings"); },
        // Quit the activity by calling the context callback
        end: function($this) {
            var settings = helpers.settings($this);
            settings.context.onQuit({'status':'success', 'score':settings.score});
        },
        loader: {
            css: function($this) {
                var settings = helpers.settings($this), cssAlreadyLoaded = false, debug = "";
                if (settings.debug) { var tmp = new Date(); debug="?time="+tmp.getTime(); }

                if (settings.context.onload) { settings.context.onload(true); }

                $("head").find("link").each(function() {
                    if ($(this).attr("href").indexOf("activities/"+settings.name+"/"+settings.css) != -1) { cssAlreadyLoaded = true; }
                });

                if(cssAlreadyLoaded) { helpers.loader.template($this); }
                else {
                    $("head").append("<link>");
                    var css = $("head").children(":last");
                    var csspath = "activities/"+settings.name+"/"+settings.css+debug;

                    css.attr({ rel:  "stylesheet", type: "text/css", href: csspath }).ready(
                        function() { helpers.loader.template($this); });
                }
            },
            template: function($this) {
                var settings = helpers.settings($this), debug = "";
                if (settings.debug) { var tmp = new Date(); debug="?time="+tmp.getTime(); }

                // Load the template
                var templatepath = "activities/"+settings.name+"/"+settings.template+debug;
                $this.load( templatepath, function(response, status, xhr) {
                    if (status=="error") {
                        settings.context.onquit({'status':'error', 'statusText':templatepath+": "+xhr.status+" "+xhr.statusText});
                    }
                    else { helpers.loader.svg($this); }
                });
            },
            // Load the svg if require
            svg:function($this) {
                var settings = helpers.settings($this),debug = "";
                if (settings.debug) { var tmp = new Date(); debug="?time="+tmp.getTime(); }
                var elt= $("<div></div>").appendTo($this.find("#svg"));
                elt.svg();
                settings.svg = elt.svg('get');
                $(settings.svg).attr("class",settings.class);
                settings.svg.load('res/img/'+settings.url + debug,
                    { addTo: true, changeSize: true, onLoad:function() { helpers.loader.build($this); }
                });
            },
            build: function($this) {
                var settings = helpers.settings($this);
                if (settings.context.onLoad) { settings.context.onLoad(false); }
                $this.css("font-size", Math.floor($this.height()/12)+"px");

                // LOCALE HANDLING
                $this.find("h1#label").html(settings.label);
                if (settings.locale) { $.each(settings.locale, function(id,value) { $this.find("#"+id).html(value); }); }

                // EXERCICE AND FIGURE
                if (settings.figure) { $this.find("#figure").html("<img src='res/img/"+settings.figure+"'/>"); }
                if (settings.exercice) {
                    if ($.isArray(settings.exercice)) {
                        $this.find("#exercice").html("");
                        for (var i in settings.exercice) { $this.find("#exercice").append("<p>"+settings.exercice[i]+"</p>"); }
                    }
                    else { $this.find("#exercice").html("<p>"+settings.exercice+"</p>"); }
                }
                $this.find("#exercice p").css("font-size",(0.6*settings.font)+"em");

                // SOURCE
                for (var i in settings.source) {
                    var $val = $("#template .val.type"+c.val, settings.svg.root()).clone().appendTo($("#source", settings.svg.root()));
                    $val.attr("transform","translate(40,"+(40+i*50)+")").attr("class","val source").attr("id",i);
                    $("text",$val).text(settings.source[i]);
                    $val.bind("mousedown touchstart", function(e) {
                        var settings = helpers.settings($(this).closest(".equation"));
                        if (settings.interactive) {
                            var ve = (e && e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length)?
                                      e.originalEvent.touches[0]:e;
                            var eq = helpers.equations.get($this);
                            var now= new Date();
                            settings.action.pos=[ve.clientX,ve.clientY];
                            settings.action.node={elt:[{$svg:$(this), pos:{now:[-eq.margin.now[0]/40 - 1.1/eq.scale.now,
                                (-eq.margin.now[1]-eq.top/eq.scale.now)/40+(1+1.25*parseInt($(this).attr("id")))/eq.scale.now]}}]};
                            settings.action.node.value = $(this).find("text").text();
                            settings.action.time = now.getTime();
                            settings.action.source = ($(this).find("text").text().length?1:2);
                        }
                        e.preventDefault();
                    });
                }

                // EQUATIONS
                settings.ratio = 640/$this.width();
                var ok = true;
                for (var i=0; i<settings.data.length; i++) {
                    settings.data[i] = $.extend(helpers.equation(), settings.data[i]);
                    settings.data[i].$svg = $("#template .equ", settings.svg.root()).clone().appendTo($("#equ", settings.svg.root()));
                    settings.data[i].$svg.attr("id",i).find(".large").hide();
                    settings.data[i].$svg.find("#target").hide();
                    settings.data[i].$svg.find("#maximize").bind('touchstart mousedown', function(event) {
                        var settings = helpers.settings($(this).closest(".equation"));
                        if (settings.interactive && !settings.emptymode) {
                            var vEvent = (event && event.originalEvent && event.originalEvent.touches && event.originalEvent.touches.length)?
                                    event.originalEvent.touches[0]:event;
                            helpers.equations.display($(this).closest(".equation"),  $(this).closest(".equ").attr("id"),300);
                        }
                        event.preventDefault();
                    });
                    ok &= settings.data[i].init($this);
                }
                if (!ok) {
                    for (var i in settings.data) for (var j in settings.data[i].value2tree.errors) {
                        $this.find("#error div").append("<p>"+settings.data[i].value2tree.errors[j]);
                    }
                    $this.find("#error").show();
                }
                else {
                    helpers.equations.display($this, 0,0);
                    for (var i in settings.data) {
                        settings.data[i].update($this);
                        settings.data[i].display();
                    }

                    $this.bind("mousemove touchmove",function(e) {
                        var $this = $(this), settings = helpers.settings($this);
                        if (settings.interactive && settings.action.node!=0 && !settings.emptymode) {
                            var ve = (e && e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length)?
                                      e.originalEvent.touches[0]:e;

                            var eq = helpers.equations.get($this);
                            if (settings.action.helper) {
                                // MOVE THE HELPER

                                settings.action.coord = [
                                    ((eq.margin.now[0]+settings.action.node.elt[0].pos.now[0]*40)+
                                    (ve.clientX-settings.action.pos[0])*settings.ratio/eq.scale.now),
                                    ((eq.margin.now[1]+settings.action.node.elt[0].pos.now[1]*40)+
                                    (ve.clientY-settings.action.pos[1])*settings.ratio/eq.scale.now) ];
                                settings.action.helper.attr("transform","translate("+
                                    settings.action.coord[0]+","+settings.action.coord[1]+")");

                                // FIND THE CLOSEST TARGET
                                var coord   = eq.html2svg($this, [ve.clientX, ve.clientY]);
                                settings.action.target = 0;

                                if (settings.action.source!=1) {
                                    settings.action.target = eq.over(coord, [0,0]);
                                    if (settings.action.target==settings.action.node) { settings.action.target = 0; }

                                    if (!settings.action.target) {
                                        eq.$svg.find("#over").attr("class","");

                                        var dx = Math.pow((ve.clientX-settings.action.pos[0])*settings.ratio/(40*eq.scale.now),2);
                                        var dy = Math.pow((ve.clientY-settings.action.pos[1])*settings.ratio/(40*eq.scale.now),2);
                                        var d2 = dx + dy;
                                        if (d2>0.05 && d2<0.5) {
                                            if (dy==0 || dx/dy>1.5) {
                                                eq.$svg.find("#target").
                                                        attr("class",(ve.clientX>settings.action.pos[0])?"left":"right"); } else
                                            if (dx==0 || dy/dx>1.5) {
                                                eq.$svg.find("#target").
                                                        attr("class",(ve.clientY>settings.action.pos[1])?"top":"bottom"); }
                                        }
                                        else { eq.$svg.find("#target").attr("class",""); }
                                    }
                                    else {
                                        settings.action.target.elt[0].$svg.find("#over").attr("class","s");
                                        eq.$svg.find("#target").attr("class","");
                                    }
                                }

                                if (!settings.action.target && settings.action.source==1) {
                                    if (coord[0]>0 && coord[1]>0 && coord[1]<40) {
                                        eq.$svg.find("#header").attr("class","banner");
                                    }
                                    else {
                                        eq.$svg.find("#header").attr("class","banner hide");
                                        if (coord[0]>0 && coord[1]>200 && coord[1]<240) {
                                            eq.$svg.find("#footer").attr("class","banner");
                                        }
                                        else {
                                            eq.$svg.find("#footer").attr("class","banner hide");
                                        }
                                    }
                                }

                            }
                            else {
                                // BEGIN TO MOVE: SHOW THE TARGET, CREATE THE HELPER AND ORGANIZE STACK
                                var t = new Date(), delta = t.getTime() - settings.action.time;
                                if (delta>100) {
                                    settings.action.coord = [
                                        eq.margin.now[0]+settings.action.node.elt[0].pos.now[0]*40,
                                        eq.margin.now[1]+settings.action.node.elt[0].pos.now[1]*40 ];
                                    if (settings.action.source!=0) {
                                        settings.action.helper = settings.action.node.elt[0].$svg.clone().attr("class","val type0")
                                            .attr("transform","translate("+settings.action.coord[0]+","+settings.action.coord[1]+")")
                                            .appendTo(eq.$svg.find("#content"));
                                    }
                                    else {
                                        eq.$svg.find("#target")
                                            .attr("transform","translate("+settings.action.coord[0]+","+settings.action.coord[1]+")")
                                            .detach().appendTo(eq.$svg.find("#content")).show();

                                        settings.action.node.elt[0].$svg.detach().appendTo(eq.$svg.find("#content"));
                                        settings.action.helper = settings.action.node.elt[0].$svg.clone().appendTo(eq.$svg.find("#content"));
                                        settings.action.node.elt[0].$svg.attr("class","val type0 source");
                                    }
                                }
                            }
                        }
                    });

                    $this.bind("mouseup touchend", function(e) {
                        var $this = $(this), settings = helpers.settings($this);
                        if (settings.interactive) {
                            var ve = (e && e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length)?
                                      e.originalEvent.touches[0]:e;
                            if (settings.action.node!=0) {


                                var eq = helpers.equations.get($this);

if (settings.emptymode) {
    if (settings.action.node.value!="0" && !isNaN(parseInt(settings.action.node.value))) {
        eq.$svg.find(".empty").each( function() { settings.nodes[$(this).attr("id")].value = settings.action.node.value; });
        settings.emptymode = false;
    }
}
else
{




                                eq.$svg.find("#target").hide();
                                var t = new Date(), delta = t.getTime() - settings.action.time;
                                var distx = Math.pow(ve.clientX-settings.action.pos[0],2);
                                var disty = Math.pow(ve.clientY-settings.action.pos[1],2);
                                var dist = 100* Math.sqrt(distx + disty) / ($this.width()*eq.scale.now);

//----------------------------------------------
if (!settings.action.helper) {
    // SIMPLE CLICK

    var done = false;

    // LOOKING FOR A PARENT BRACKET
    var bra = settings.action.node;
    while (bra!=eq.tree && bra.type!=c.bra) { bra = bra.parent; }
    if (bra.type==c.bra) {
        var cbra = bra.children[0];
        // CURRENT NODE IS INSIDE A BRACKET : CAN WE REMOVE IT
        if (cbra.value=="*" || cbra.type==c.val || cbra.type==c.bra || bra.parent.value=="+" || bra.parent.value=="=") {
            eq.remove(cbra);
            eq.replace(eq.hide(bra), cbra);
            done = true;
        }
    }

    if (!done) {
    if (settings.action.node.value=="0") {
        if (settings.action.node.parent.value=="+") { eq.hide(eq.remove(settings.action.node)); } else
        if (settings.action.node.parent.value=="*") {
            eq.remove(settings.action.node);
            eq.replace(eq.hide(settings.action.node.parent), settings.action.node);
        } else
        if (settings.action.node.parent.value=="/" && settings.action.node.parent.children[0]==settings.action.node) {
            eq.remove(settings.action.node);
            eq.replace(eq.hide(settings.action.node.parent), settings.action.node);
        }
    }
    else
    if (settings.action.node.value=="1") {
        if (settings.action.node.parent.value=="*") { eq.hide(eq.remove(settings.action.node)); } else
        if (settings.action.node.parent.value=="/" && settings.action.node.parent.children[1]==settings.action.node) {
           eq.hide(eq.remove(settings.action.node));
        }
    }
    else {
        var val = parseInt(settings.action.node.value);

        // DECOMPOSE THE VALUE INTO A MULTIPLICATION
        var elt = helpers.element(settings.action.node.parent, settings.action.node.div);
        elt.type = c.op; elt.value = "*";
        elt.origin = [settings.action.node.elt[0].pos.now[0], settings.action.node.elt[0].pos.now[1]];
        var child = helpers.element(elt, settings.action.node.div);
        child.type = c.val; child.value = "-1";
        child.origin = [settings.action.node.elt[0].pos.now[0], settings.action.node.elt[0].pos.now[1]];
        elt.children=[child,settings.action.node];

        if (isNaN(val)) {
            if (settings.action.node.value[0]=='-') { settings.action.node.value=settings.action.node.value.substr(1); }
            else                                    { settings.action.node.value="-"+settings.action.node.value; }
        }
        else {
            if (val<0)  { settings.action.node.value=settings.action.node.value.substr(1); }
            else {
                var d = 0; for (var i=2; i<val && !d; i++) { if (val%i==0) { d=i; } }
                if (d)  { settings.action.node.value=Math.floor(val/d); child.value = d; }
                else    { settings.action.node.value="-"+settings.action.node.value; }
            }
        }

        eq.replace(settings.action.node, elt);
        settings.action.node.parent = elt;
    }
    }
}
else {
    // A VALUE HAS BEEN MOVED

    var coord   = eq.html2svg($this, [ve.clientX, ve.clientY]);
    if (settings.action.source==1) {
        // VALUE COMES FROM SOURCE ZONE (BUT ITS NOT A BRACKET NOR A SAVE)

        var op = "";
        if (eq.$svg.find("#header").attr("class").indexOf("hide")==-1) { eq.$svg.find("#header").attr("class","banner hide"); op="*";
        } else
        if (eq.$svg.find("#footer").attr("class").indexOf("hide")==-1) { eq.$svg.find("#footer").attr("class","banner hide"); op="/";
        } else if (coord[0]>0&&coord[0]<540&&coord[1]>0&&coord[1]<240) { op = "+"; }

        if (op!="") {
            for (var i=0; i<eq.tree.children.length; i++) {
                var node = eq.tree.children[i];

                operator = op;
                if (operator=="/" && node.value==operator) { operator="*"; node = eq.tree.children[i].children[1]; }

                if (node.value==operator) {
                    var elt = helpers.element(node, node.div);
                    elt.type = c.val; elt.value = settings.action.helper.find("text").text();
                    elt.origin = [(coord[0]/eq.scale.now-eq.margin.now[0])/40,(coord[1]/eq.scale.now-eq.margin.now[1])/40];
                    node.origin = [(coord[0]/eq.scale.now-eq.margin.now[0])/40,(coord[1]/eq.scale.now-eq.margin.now[1])/40];
                    node.children.push(elt);
                }
                else {
                    var elt = helpers.element(node.parent, node.div);
                    elt.type = (operator=="/")?c.div:c.op; elt.value = operator;
                    elt.origin = [(coord[0]/eq.scale.now-eq.margin.now[0])/40,(coord[1]/eq.scale.now-eq.margin.now[1])/40];
                    var child = helpers.element(elt, (operator=="/")?div.denominator:node.div);
                    child.type = c.val; child.value = settings.action.helper.find("text").text();
                    child.origin = [(coord[0]/eq.scale.now-eq.margin.now[0])/40,(coord[1]/eq.scale.now-eq.margin.now[1])/40];
                    eq.div(node,div.numerator);
                    elt.children=[node,child];
                    eq.replace(node, elt);
                    elt.parent = node.parent;
                    elt.children[0].parent = elt;
                    elt.children[1].parent = elt;
                }
            }
        }
        settings.action.helper.detach();
        settings.action.helper = 0;
    }
    else {
        settings.action.node.elt[0].$svg.attr("class","val type0");
        eq.$svg.find("#over").attr("class","");
        var a = false;          // REMOVE settings.action.node IF TRUE
        var helper = true;      // REMOVEE helper IF TRUE

        if (settings.action.target) {

            // THE VALUE HAS BEEN MOVED OVER ANOTHER VALUE

            if (settings.action.source==0) {

                var vnode = parseInt(settings.action.node.value);
                var vtarget = parseInt(settings.action.target.value);

                if (settings.action.target.parent==settings.action.node.parent && settings.action.target.parent.value!="/") {

                    // NODE AND SOURCE HAVE THE SAME PARENT (EASY CASE)

                    if (settings.action.target.parent.value=="*") {
                        if (isNaN(vnode) && vtarget == -1) {
                            if (settings.action.node.value[0]=='-')   { settings.action.target.value=settings.action.node.value.substr(1); }
                            else                                      { settings.action.target.value="-"+settings.action.node.value; }
                            a = true;
                        } else
                        if (vnode == -1 && isNaN(vtarget)) {
                            if (settings.action.target.value[0]=='-') { settings.action.target.value=settings.action.target.value.substr(1); }
                            else                                      { settings.action.target.value="-"+settings.action.target.value; }
                            a = true;
                        } else
                        if (!isNaN(vnode) && !isNaN(vtarget))         { settings.action.target.value = (vnode*vtarget).toString(); a = true; }
                    }
                    else
                    if (settings.action.target.parent.value=="+") {
                        if (!isNaN(vnode) && !isNaN(vtarget))         { settings.action.target.value = (vnode+vtarget).toString(); a = true; }
                    }
                }
                else {
                    var operator = 0;

                    // REMOVE TWO SAME VALUE ON THE SAME DIVISION
                    if (settings.action.node.value==settings.action.target.value) {
                        var divnode = eq.isindiv(settings.action.node);
                        var divtarget = eq.isindiv(settings.action.target);

                        for (var i in divnode) for (var j in divtarget)
                            if (divnode[i].node==divtarget[j].node && divnode[i].div!=divtarget[j].div) { operator = divnode[i].node; }

                        if (operator!=0) {
                            settings.action.target.value = "1";
                            settings.action.node.value = "1";
                            a = true;
                            if (settings.action.node.div==div.numerator) { settings.action.node = settings.action.target; }
                        }
                    }

                    if (!operator) {
                        // HANDLE INSERTION INTO A BRACKET
                        var bratarget = settings.action.target;
                        while (bratarget!=eq.tree && bratarget.type!=c.bra) { bratarget = bratarget.parent; }


                        if (bratarget.type==c.bra) {
                            // TRY TO INSERT THE VALUE NODE (OR ITS OWN BRACKET) INTO THE TARGET BRACKET
                            var n = [ settings.action.node ];
                            var branode = settings.action.node;
                            while (branode!=eq.tree && branode.type!=c.bra) { branode = branode.parent; }
                            if (branode.type == c.bra) { n.push(branode); }

                            for (var i in n) {
                                if (n[i].parent==bratarget.parent) {
                                    var pos = [-1,-1];
                                    for (var j in bratarget.parent.children) {
                                            if (bratarget.parent.children[j]==n[i]) { pos[0] = parseInt(j); } else
                                            if (bratarget.parent.children[j]==bratarget) { pos[1] = parseInt(j); }
                                    }

                                    if (pos[0]!=-1 && pos[1]!=-1) {
                                        var side = pos[0]>pos[1];

                                        switch(n[i].parent.value) {
                                            case "+" :
                                                var elt = helpers.element(bratarget, bratarget.div);
                                                elt.type = c.op; elt.value = "+";
                                                elt.origin = [bratarget.parent.elt[side?pos[0]-1:pos[0]].pos.now[0],
                                                              bratarget.parent.elt[side?pos[0]-1:pos[0]].pos.now[1]];
                                                eq.remove(n[i]);
                                                eq.insert(elt, bratarget.children[0]);
                                                if (pos[0]>pos[1])  { elt.children= [elt.children[0], n[i]]; }
                                                else                { elt.children= [n[i], elt.children[0]]; }
                                                n[i].parent = elt;
                                                break;
                                            case "*" :
                                                alert(bratarget.children[0].value);
                                                break;
                                        }
                                    }

                                    break;


                                }
                            }

                        }

                    }

                }
            }
            else {
                // ADD A BRACKET
                var vtarget = settings.action.target;
                while (vtarget!=eq.tree && (vtarget.parent.value=="*" || vtarget.parent.value=="/")) { vtarget = vtarget.parent; }
                if (vtarget.parent && vtarget.parent.type!=c.bra) {
                    var elt = helpers.element(vtarget, vtarget.div);
                    elt.type = c.bra; elt.value = '(';
                    elt.origin=[settings.action.target.elt[0].pos.now[0],settings.action.target.elt[0].pos.now[1]];
                    eq.insert(elt, vtarget);
                }
            }
        }
        else {

            // NO TARGET SO WE ONLY LOOK AT THE MOVEMENT

            var $class = eq.$svg.find("#target").attr("class");

            if ($class.indexOf("left")!=-1 || $class.indexOf("right")!=-1) {
                var elt = helpers.element(settings.action.node.parent, settings.action.node.div);
                elt.type = c.op; elt.value = "*";
                elt.origin = [settings.action.node.elt[0].pos.now[0], settings.action.node.elt[0].pos.now[1]];
                var child = helpers.element(elt, settings.action.node.div);
                child.type = c.val; child.value = "1";
                child.origin = [settings.action.node.elt[0].pos.now[0], settings.action.node.elt[0].pos.now[1]];
                elt.children=($class.indexOf("right")!=-1)?[child,settings.action.node]:[settings.action.node,child];
                eq.replace(settings.action.node, elt);
                settings.action.node.parent = elt;
            }
            else if ($class.indexOf("top")!=-1 || $class.indexOf("bottom")!=-1) {
                if (settings.action.node.value=="1") {
                    var elt = helpers.element(settings.action.node.parent, settings.action.node.div);
                    elt.type = c.div; elt.value = "/";
                    elt.origin = [settings.action.node.elt[0].pos.now[0], settings.action.node.elt[0].pos.now[1]];
                    var child = helpers.element(elt, div.denominator);
                    child.type = c.val; child.value = "";
                    child.origin = [settings.action.node.elt[0].pos.now[0], settings.action.node.elt[0].pos.now[1]];
                    elt.children=[settings.action.node,child];
                    eq.replace(settings.action.node, elt);
                    settings.action.node.parent = elt;
                    settings.action.node.div = div.numerator;
                    settings.action.node.value = "";
                    settings.emptymode = true;
                }
                else {
                }
            }

        }

        if (a) { eq.remove(eq.hide(settings.action.node)); }

        if (helper) {
            settings.action.helper.detach();
            settings.action.helper = 0;
        }
    }
}


eq.$svg.find("#target").attr("class","");

}

helpers.equations.get($this).update($this);
helpers.equations.get($this).display(500);
helpers.equations.get($this).label();

// alert(helpers.equations.get($this).dump());

//----------------------------------------------
                            }
                        }
                        settings.action.node = 0;
                    });
                }

                if (!$this.find("#splash").is(":visible")) { setTimeout(function() { $this[settings.name]('next'); }, 500); }
            }
        },
        element: function(_parent, _div) {
            return { type : 0, value : "", children : [], elt: [], div:_div, parent: _parent, origin:[0,0] }
        },

        // THE EQUATION MANAGER
        equations: {
            get         : function($this) { return this.id!=-1?helpers.settings($this).data[this.id]:0; },
            id          : -1,       // THE OPENED EQUATION
            to          : -1,       // THE EQUATION TO OPEN
            // OPEN A NEW EQUATION AND DISPLAY EVERY ONES
            display     : function($this, _id, _anim) {
                var settings= helpers.settings($this);
                var begin   = 0;

                this.to     = _id;
                settings.data[this.to].$svg.find(".small").hide();
                settings.data[this.to].$svg.find(".large").show();
                settings.data[this.to].$svg.detach().appendTo($("#equ", settings.svg.root()));

                if (this.id==-1) {
                    _anim = 0;
                }
                else {
                    if (_anim) {
                        settings.data[this.id].$svg.find(".small").hide();
                        settings.data[this.id].$svg.find(".large").show();
                        settings.data[this.to].$svg.find(".large").attr("transform","scale(1,0.2)");
                        var now = new Date(); begin=now.getTime();
                    }
                }
                this.displayex($this, begin, _anim , _anim?1:0);
            },
            displayex     : function($this, _begin, _anim, _scale) {
                var settings = helpers.settings($this);
                var t=settings.top;

                for (var i=0; i<settings.data.length; i++) {
                    settings.data[i].top = t;
                    settings.data[i].$svg.attr("transform","translate(85,"+settings.data[i].top+")").attr("class","equ");
                    if (i==this.id) {
                        settings.data[i].$svg.find(".large").attr("transform","scale(1,"+(0.2+0.8*_scale)+")");
                        t += 200*_scale+50;
                    } else
                    if (i==this.to) {
                        settings.data[i].$svg.find(".large").attr("transform","scale(1,"+(1-0.8*_scale)+")");
                        t += 200*(1-_scale)+50;
                    } else { t += 50; }
                }

                if (_anim && _scale!=0) {
                    var now = new Date(); _scale=(_begin+_anim-now.getTime())/_anim;
                    if (_scale<0) { _scale=0; }
                    setTimeout( function() { helpers.equations.displayex($this, _begin, _anim, _scale); },1);
                }
                else {
                    if (this.id!=-1) {
                        settings.data[this.id].$svg.find(".large").hide();
                        settings.data[this.id].$svg.find(".small").show();
                    }
                    this.id = this.to;
                }
            }
        },

        // THE EQUATION DATA
        equation: function() {
            return {
            $svg        : 0,                            // SVG DATA
            value       : "",                           // EQUATION WITH TEXT FORMAT
            sep         : 0,                            // SEPARATOR POSITION IF ANY (IN PIXEL FROM MARGIN.NOW[0])
            top         : 0,                            // TOP OFFSET OF THE EQUATION (IN PIXEL)
            tree        : {},                           // EQUATION ELEMENT TREE
            margin      : { now:[0,0], to:[0,0] },      // MARGIN OF THE EQUATION (IN PIXEL)
            scale       : { now:1, to:1 },              // SIZE OF THE EQUATION

            // CONVERT HTML COORD INTO SVG EQUATION COORD - (0,0) is the upper-left corner of this equation .large rect
            html2svg    : function($this, _pos) {
                var settings = helpers.settings($this); return [ _pos[0]*settings.ratio - 85, _pos[1]*settings.ratio - this.top ];
            },
            // FIND A NODE WITH THIS COORD
            over        : function(_pos, _offset, _node) {
                if (!_node) {
                    _node = this.tree;
                    _pos = [ (_pos[0]/this.scale.now-this.margin.now[0])/40, (_pos[1]/this.scale.now - this.margin.now[1])/40];
                }
                var ret = 0;
                if (_node.type==c.val) {
                    ret= ( _node.elt[0].pos.now[0]-0.5+_offset[0] < _pos[0] && _node.elt[0].pos.now[0]+0.5+_offset[0] > _pos[0] &&
                           _node.elt[0].pos.now[1]-0.5+_offset[1] < _pos[1] && _node.elt[0].pos.now[1]+0.5+_offset[1] > _pos[1] )?_node:0;
                }
                else { for (var i in _node.children) { if (!ret) { ret = this.over(_pos, _offset, _node.children[i]); } } }
                return ret;
            },
            // CONVERT A TEXT EQUATION INTO A TREE OF ELEMENTS
            value2tree  : {
                errors  : [],                           // LIST OF ERRORS DURING THE CONSTRUCTION OF THE TREE
                // LOOK FOR A EQUALITY OPERATOR
                eq      : function(_value) {
                    var r = -1;
                    for (var i=0; i<_value.length; i++) {
                        if (_value[i]=='=' || _value[i]=='<' || _value[i]=='>') {
                            if (r==-1) { r = i; } else { this.errors.push("More than one equality operand"); }
                    }}
                    return r;
                },
                // GET THE DIFFERENT POSITION FOR AN OPERATOR
                token   : function(_value, _char) {
                    var r = [], deep = 0;
                    for (var i=0; i<_value.length; i++) {
                        switch(_value[i]) {
                            case _char          : if (deep==0) { r.push(i); } break;
                            case '('            : deep++; break;
                            case ')'            : deep--; if (deep<0) { this.errors.push("Bracket error"); } break;
                        }
                    }
                    return r;
                },
                // GET THE POSITION OF THE DIVISION OPERATOR
                get    : function(_value) {
                    var r = -1, deep = 0;
                    for (var i=0; i<_value.length; i++) {
                        switch(_value[i]) {
                            case '/'            : if (deep==0) { if (r!=-1) { this.errors.push("Division error"); } else { r=i; } } break;
                            case '('            : deep++; break;
                            case ')'            : deep--; if (deep<0) { this.errors.push("Bracket error"); } break;
                        }
                    }
                    return r;
                },

                // BUILD THE TREE
                process : function(_value, _parent, _div) {
                    var elt = helpers.element(_parent, _div);
                    var done = false;

                    // EQUALITY
                    var pos =this.eq(_value);
                    if ((done=(pos!=-1))) {
                        elt.type = c.op; elt.value = _value.substr(pos,1);
                        elt.children=[this.process(_value.substr(0,pos), elt, div.root), this.process(_value.substr(pos+1), elt, div.root)];
                    }

                    // ADDITION THEN MULTIPLICATION
                    if (!done) {
                        var op = ['+','*'];
                        for (var k in op) if (!done) {
                            var elts = this.token(_value,op[k]);
                            if ((done=(elts.length!=0))) {
                                elt.type = c.op; elt.value = op[k];
                                for (var i=0,j=0; i<elts.length; i++ ) {
                                    elt.children.push(this.process(_value.substr(j,elts[i]-j), elt, _div));
                                    j=elts[i]+1;
                                }
                                elt.children.push(this.process(_value.substr(elts[elts.length-1]+1), elt,_div));
                            }
                        }
                    }

                    // DIVISION
                    if (!done) {
                        var pos =this.get(_value);
                        if ((done=(pos!=-1))) {
                            elt.type = c.div; elt.value = '/';
                            var child1 = this.process(_value.substr(0,pos), elt, div.numerator);
                            var child2 = this.process(_value.substr(pos+1), elt, div.denominator);
                            elt.children=[child1, child2];
                        }
                    }

                    // BRACKET
                    if (!done) {
                        if ((done=((_value[0]=='(')&&(_value[_value.length-1]==')')))) {
                            var elttmp = this.process(_value.substr(1,_value.length-2), elt, (_parent.type==c.div)?_div:div.root);
                            if (_parent.type==c.div) { elt = elttmp; elt.parent = _parent; }
                            else {
                                elt.type = c.bra; elt.value = '(';
                                elt.children=[elttmp];
                            }
                        }
                    }

                    // VALUE
                    if (!done) { elt.type = c.val; elt.value = _value; }

                    return elt;
                }
            },

            // CONVERT A TREE OF ELEMENTS INTO A TEXT FORM
            tree2value  : function(_node) {
                if (!_node) { _node = this.tree; }
                var ret = "";
                switch(_node.type) {
                    case c.op: case c.div:
                        for (var i=0; i<_node.children.length; i++) {
                            if (i!=0) ret+=_node.value;
                            var child = this.tree2value(_node.children[i]);
                            if (_node.value=="/" && (child.indexOf("+")!=-1 ||child.indexOf("/")!=-1 ||child.indexOf("*")!=-1 ) ) {
                                child="("+child+")"; }
                            ret += child;
                        }
                        break;
                    case c.bra: ret = "("+this.tree2value(_node.children[0])+")"; break;
                    case c.val: ret = (_node.value[0]=='-')?"("+_node.value+")":_node.value; break;
                }
                return ret.toString();
            },

            // INIT THE TREE
            init        : function($this) {
                this.tree = this.value2tree.process(this.value, 0, 0);
                if (this.value!=this.tree2value()) { this.value2tree.errors.push("Value error: "+this.tree2value()); }
                this.label();
                return (this.value2tree.errors.length==0);
            },

            label       : function() { this.value= this.tree2value(); this.$svg.find(".label").text(this.value); },

            display     : function(_anim) {
                var begin = 0;
                if (_anim) { var now = new Date(); begin=now.getTime(); }
                this.displayex(this.tree, begin, _anim , _anim?1:0);
            },
            displayex     : function(_node, _begin, _anim,_ratio) {
                var margin = [
                    this.margin.now[0]*_ratio+this.margin.to[0]*(1-_ratio),
                    this.margin.now[1]*_ratio+this.margin.to[1]*(1-_ratio)
                ]
                for (var i in _node.elt) {
                    _node.elt[i].$svg.attr("transform","translate("+
                        ((_node.elt[i].pos.now[0]*_ratio+_node.elt[i].pos.to[0]*(1-_ratio)) *40+margin[0])+","+
                        ((_node.elt[i].pos.now[1]*_ratio+_node.elt[i].pos.to[1]*(1-_ratio))*40+margin[1])+")");
                    if (_ratio==0) { _node.elt[i].pos.now = [ _node.elt[i].pos.to[0], _node.elt[i].pos.to[1] ]; }

                    if (_node.elt[i].scale) {
                        _node.elt[i].$svg.find(".scale").attr("transform","scale(1,"+
                            (_node.elt[i].scale.now*_ratio+_node.elt[i].scale.to*(1-_ratio)) +")");
                        if (_ratio==0) { _node.elt[i].scale.now =  _node.elt[i].scale.to; }
                    }
                }
                for (var i in _node.children) {
                    this.displayex(_node.children[i], _begin, _anim, _ratio);
                }
                if (_node==this.tree) {
                    var scale = this.scale.now*_ratio+this.scale.to*(1-_ratio);
                    this.$svg.find("#content").attr("transform","scale("+scale+")");

                    if (_node.value=="=") {
                        this.sep = (_node.elt[0].pos.now[0]*_ratio+_node.elt[0].pos.to[0]*(1-_ratio))*40;
                        this.$svg.find("#sep").attr("x1",(this.sep+margin[0])*scale).attr("x2",(this.sep+margin[0])*scale);
                    }
                    else { this.$svg.find("#sep").hide(); }

                    if (_anim && _ratio!=0) {
                        var now = new Date(); _ratio=(_begin+_anim-now.getTime())/_anim;
                        if (_ratio<0) { _ratio=0; }
                        var tree = this;
                        setTimeout( function() { tree.displayex(_node, _begin, _anim, _ratio); },1);
                    }
                    else {
                        this.scale.now = this.scale.to;
                        this.margin.now = [ this.margin.to[0], this.margin.to[1] ];
                    }
                }
            },

            // CHECK THE TREE VALIDITY AND UPDATE IF NECESSARY
            check       : function(_node) {
                if (!_node) { _node = this.tree; }

                // OPERATION WITH SINGLE OPERAND
                if (_node.type==c.op  && _node.children.length==1) {
                    this.replace(_node, _node.children[0]); return this.check(_node.parent);
                }
                else if (_node.value=="*") {
                    var minus1 = [];
                    for (var i=0; i<_node.children.length; i++) {
                        if (_node.children[i].value=="+") {
                            // ADD BRACKET IF NEED
                            var elt = helpers.element(_node, _node.div);
                            elt.type = c.bra; elt.value = '(';
                            this.insert(elt, _node.children[i]);
                        }
                        else if (_node.children[i].value=="*") {
                            if (_node.div != _node.children[i].div) { alert("div error"); }
                            // MERGE TWO MULTIPLICATIONS
                            _node.origin = [_node.children[i].origin[0], _node.children[i].origin[1]];
                            var children = _node.children[i].children;
                            var elt      = _node.children[i].elt;
                            _node.children.splice(i, 1);
                            for (var j=children.length-1; j>=0; j--) {
                                _node.children.splice(i,0, children[j]);
                                children[j].parent = _node;
                                if (j!=0) { if (elt.length) { _node.elt.splice(i,0, elt[j-1]); }
                                            else            { _node.elt.splice(i,0, 0);} }
                            }
                            return this.check(_node);
                        }
                        else if (_node.children[i].value=="-1") { minus1.push(_node.children[i]); }
                    }

                    // REMOVE TWO -1 INSIDE THE SAME MULTIPLICATION
                    if (minus1.length>=2 && _node.children.length>2) {
                        this.remove(this.hide(minus1[0]));
                        this.remove(this.hide(minus1[1]));
                    }
                }
                else if (_node.type==c.div) {
                    if (_node.children.length==1) {
                        this.div(_node.children[0],_node.parent?_node.parent.div:div.root);
                        this.replace(_node, _node.children[0]);
                        return this.check(_node.parent);
                    }

                    for (var i=0; i<2; i++) {
                        // ONE OF THE DIVISION CHILDREN IS ALSO A DIVISION
                        if (_node.children[i].value=="/") {
                            var other = _node.children[1-i];    // THE OTHER PART OF THE PARENT DIVISION

                            // GET THE TWO CHILDREN
                            var elt1 = _node.children[i].children[0], elt2 = _node.children[i].children[1];
                            this.remove(elt1); this.remove(elt2);

                            var elt = helpers.element(_node, div.root);
                            elt.type = c.op; elt.value = "*";
                            elt.children = [ elt2, other ];
                            this.div(elt, i==0?div.denominator:div.numerator);

                            this.replace(other, elt);
                            other.parent = elt;
                            elt2.parent = elt;
                            this.replace(this.hide(_node.children[i]), elt1);
                            this.div(elt1, i==0?div.numerator:div.denominator);

                            return this.check(_node);
                        }
                    }
                }

                // CHECK PARENT/CHILDREN
                for (var i in _node.children) {
                    if (_node.children[i].parent!=_node) {
                        alert("Parent: ["+_node.type+"] "+_node.value+" Child: ["+_node.children[i].type+"] "+_node.children[i].value+
                              " False: ["+_node.children[i].parent.type+"] "+_node.children[i].parent.value);
                    }
                    this.check(_node.children[i]);
                }
            },

            // COMPUTE THE POSITION OF THE ELEMENTS
            update      : function($this, _node, _pos) {
                var settings    = helpers.settings($this);
                var ret         = [1,1,0.5];
                if (!_node) { this.check(); _node = this.tree; }
                if (!_pos)  { _pos = [0,0]; }

                switch(_node.type) {
                    case c.val :
                        if (_node.elt.length==0) {
                            var elt = { $svg: $("#template .val.type"+_node.type, settings.svg.root()).clone()
                                                    .attr("id", settings.nodes.length).appendTo(this.$svg.find("#content")),
                                        pos : { now:[_node.origin[0],_node.origin[1]], to:[_node.origin[0],_node.origin[1]] } };
                            elt.$svg.bind("mousedown touchstart", function(e) {
                                var $this=$(this).closest(".equation"), settings = helpers.settings($this);
                                if (settings.interactive) {
                                    var ve = (e && e.originalEvent && e.originalEvent.touches && e.originalEvent.touches.length)?
                                                e.originalEvent.touches[0]:e;
                                    settings.action.pos=[ve.clientX,ve.clientY];
                                    settings.action.node=settings.nodes[$(this).attr("id")];
                                    var now = new Date();
                                    settings.action.time = now.getTime();
                                    settings.action.source = 0;
                                }
                                e.preventDefault();
                            });
                            _node.elt.push(elt);
                            settings.nodes.push(_node);
                        }
                        if (_node.value.length==0) { _node.elt[0].$svg.attr("class","val empty type"+_node.type); }
                        else                       { _node.elt[0].$svg.attr("class","val type"+_node.type); }
                        _node.elt[0].$svg.find("text").text(_node.value);
                        _node.elt[0].pos.to = [_pos[0],_pos[1]];
                    break;
                    case c.op :
                        ret = [0,1,0];
                        for (var i=0; i<_node.children.length; i++) {
                            if (i!=0) {
                                if (_node.elt.length<i || !_node.elt[i-1]) {
                                    var elt = { $svg : $("#template .val.type"+_node.type, settings.svg.root()).clone()
                                                    .attr("class","val type"+_node.type).appendTo(this.$svg.find("#content")),
                                                pos : { now:[_node.origin[0],_node.origin[1]], to:[_node.origin[0],_node.origin[1]] } };
                                    elt.$svg.find("text").text(_node.value);
                                    if (_node.elt.length<i) { _node.elt.push(elt); } else { _node.elt.splice(i-1, 1, elt); }
                                }
                                _node.elt[i-1].pos.to = [_pos[0]+ret[0]-.25,_pos[1]];
                                ret[0]+=.5;
                            }
                            var size=this.update($this, _node.children[i], [_pos[0]+ret[0], _pos[1]]);
                            ret[0]+=size[0]; if (size[1]>ret[1]) { ret[1] = size[1]; } if (size[2]>ret[2]) { ret[2] = size[2]; }
                        }
                        if (ret[1]>1) {
                            var offset = (_node.div==1)?ret[2]-ret[1]+0.5:ret[2]-0.5;
                            if (_node.div!=0 && offset) { this.offset(_node, 0, offset); }
                        }
                    break;
                    case c.div :
                        var pos1=[_pos[0], _pos[1]-0.6], pos2=[_pos[0], _pos[1]+0.6];
                        var size1 = this.update($this, _node.children[0], [_pos[0],_pos[1]-0.6]);
                        var size2 = this.update($this, _node.children[1], [_pos[0],_pos[1]+0.6]);
                        var x = Math.max(size1[0], size2[0]);
                        if (size1[0]<size2[0])  {this.offset(_node.children[0], (size2[0]-size1[0])/2,0); }
                        else                    {this.offset(_node.children[1], (size1[0]-size2[0])/2,0); }

                        if (_node.elt.length==0) {
                            var elt = { $svg : $("#template .val.type"+_node.type, settings.svg.root()).clone()
                                                    .attr("class","val type"+_node.type).appendTo(this.$svg.find("#content")),
                                        pos : { now:[_node.origin[0],_node.origin[1]], to:[_node.origin[0],_node.origin[1]] } };
                            _node.elt.push(elt);
                        }
                        _node.elt[0].$svg.find("line").attr("x2",40*(x-0.5));
                        _node.elt[0].pos.to = [_pos[0],_pos[1]];
                        ret=[x, size1[1]+size2[1]+0.2, size1[1]+0.1];
                    break;
                    case c.bra :
                        var size = this.update($this, _node.children[0], [_pos[0]+0.5,_pos[1]]);

                        if ( _node.elt.length==0) {
                            var elt = { $svg : $("#template .val.type"+_node.type, settings.svg.root()).clone()
                                                    .attr("class","val type"+_node.type).appendTo(this.$svg.find("#content")),
                                        pos : { now:[_node.origin[0],_node.origin[1]], to:[_node.origin[0],_node.origin[1]] },
                                        scale: { now:1, to:1} };
                            elt.$svg.find("text").text("(");
                            elt.$svg.find(".scale").attr("transform","scale(1,"+size[1]+")");
                            _node.elt.push(elt);

                            var elt = { $svg : $("#template .val.type"+_node.type, settings.svg.root()).clone()
                                                    .attr("class","val type"+_node.type).appendTo(this.$svg.find("#content")),
                                        pos : { now:[_node.origin[0],_node.origin[1]], to:[_node.origin[0],_node.origin[1]] },
                                        scale: { now:1, to:1} };
                            elt.$svg.find("text").text(")");
                            elt.$svg.find(".scale").attr("transform","scale(1,"+size[1]+")");
                            _node.elt.push(elt);
                        }

                        _node.elt[0].pos.to = [_pos[0]-.25,_pos[1]+(size[1]/2-size[2])];
                        _node.elt[0].scale.to = size[1];
                        _node.elt[1].pos.to = [_pos[0]+size[0]+.25,_pos[1]+(size[1]/2-size[2])];
                        _node.elt[1].scale.to = size[1];

/*
                        if (size[1]>1 && _node.children[0].type == c.op) {
                            var offset = (_node.div==1)?size[2]-size[1]+0.5:size[2]-0.5;
                            if (_node.div!=0 && offset) {
                                for (var i in _node.elt) { _node.elt[i].pos.to=[_node.elt[i].pos.to[0], _node.elt[i].pos.to[1]+offset]; }
                            }
                        }
*/
                        ret = [size[0]+1, size[1], size[2]];
                    break;
                }
                if (_node==this.tree) {
                    this.scale.to = Math.min((240-10)/(ret[1]*40),(540-10)/(ret[0]*40));
                    if (this.scale.to > settings.scalemax) { this.scale.to = settings.scalemax; }
                    this.margin.to = [ Math.floor((540/this.scale.to + (1-ret[0])*40)/2),
                                       Math.floor(ret[2]*40 + ( 240/this.scale.to - ret[1]*40)/2)];
                }

                return ret;
            },

            isindiv: function(_node) {
                var ret = [];

                if (_node.parent.value=="/") { ret.push({node:_node.parent, div :_node.div }); }

                if (_node.parent.value=="*") {
                    if (_node.parent.parent && _node.parent.parent.value=="/") {
                        ret.push({node:_node.parent.parent, div : _node.parent.div });
                    }

                    for (var i in _node.parent.children) {
                        if (_node.parent.children[i].value=="/") { ret.push({node:_node.parent.children[i],div:div.numerator}); }
                    }
                }

                return ret;
            },

            dump : function(_node, _level) {
                if (!_node) { _node = this.tree; _level=0;}
                var ret = "";
                for (var i=0; i<_level; i++) { ret+="  "; }
                ret += "["+_node.value+"] ("+_node.elt.length+"/"+_node.children.length+") ("+_node.div+")\n";
                for (var i in _node.children) { ret+=this.dump(_node.children[i], _level+1); }
                return ret;
            },

            // ADD AN OFFSET TO ALL CHILDREN OF NODE
            offset      : function(_node, _left, _top) {
                for (var i in _node.elt) { _node.elt[i].pos.to=[_node.elt[i].pos.to[0]+_left, _node.elt[i].pos.to[1]+_top]; }
                for (var i in _node.children) { this.offset(_node.children[i], _left, _top); }
            },

            // HIDE THE SVG ELEMENT
            hide       : function(_node) {
                for (var i in _node.elt) if (_node.elt[i].$svg) { _node.elt[i].$svg.detach(); }
                for (var i in _node.children) { this.hide(_node.children[i]); }
                return _node;
            },

            // REMOVE A NODE FROM ITS PARENT
            remove      : function(_node) {
                var pos = -1;
                for (var i in _node.parent.children) { if (_node.parent.children[i]==_node) { pos = parseInt(i); }}
                if (pos!=-1) {
                    var last = _node.parent.elt.length-1;
                    if (last!=-1) {
                        if (_node.parent.elt[pos>last?last:pos].$svg) _node.parent.elt[pos>last?last:pos].$svg.hide();
                        _node.parent.elt.splice(pos>last?last:pos,1);
                    }

                    _node.parent.children.splice(pos,1);

                }
                return _node;
            },

            // INSERT A NEW NODE
            insert      : function(_node, _source) {
                var pos = -1;
                for (var i in _source.parent.children) { if (_source.parent.children[i]==_source) { pos = parseInt(i); }}
                if (pos!=-1) {
                    _source.parent.children[pos] = _node;
                    _node.parent = _source.parent;
                    _node.children.push(_source);
                    _source.parent = _node;
                }
            },

            // REPLACE A NODE BY A NEW NODE
            replace     : function(_source, _dest) {
                if (_source==this.tree) {
                    _dest.parent = 0;
                    this.tree = _dest;
                }
                else {
                    var pos = -1;
                    for (var i=0; i<_source.parent.children.length; i++) {
                        if (_source.parent.children[i]==_source) { pos = parseInt(i); }}
                    if (pos!=-1) {
                        _dest.parent = _source.parent;
                        _source.parent.children[pos]=_dest;
                    }
                }
            },

            // UPDATE THE DIV OF A NODE (AND ITS CHILDREN)
            div     : function(_node, _value) {
                _node.div = _value;
                if (_node.type!=c.div) {
                    for (var i in _node.children) { if (_node.children[i].type!=c.div) { this.div(_node.children[i], _value); } }
                }
            }
        }}
    };

    // The plugin
    $.fn.equation = function(method) {

        // public methods
        var methods = {
            init: function(options) {
                // The settings
                var settings = {
                    score           : 0,                        // The score
                    interactive     : false,                    // Entry allowed or not
                    emptymode       : false,                    // Need to fill an empty cell
                    action          : {                         // Touch parameter
                        source      : 0,                        // 0: from equation, 1: value from source, 2: operation from source
                        time        : 0,                        // Time of the mouse down
                        node        : 0,                        // Source node
                        target      : 0,                        // Authorized target node
                        helper      : 0,                        // Clone of the source nod
                        pos         : 0,                        // Position of origin
                        coord       : 0                         // Coordinate of the helper
                    },
                    ratio           : 1,                        // SVG pixel size/HTML pixel size
                    nodes           : []                        // List of value nodes
                };

                 // Check the context and send the load
                return this.each(function() {
                    var $this = $(this);
                    $(document).unbind("keypress");
                    this.onselectstart = function() { return false; }

                    var $settings = $.extend({}, defaults, options, settings);
                    var checkContext = helpers.checkContext($settings);
                    if (checkContext.length) {
                        alert("CONTEXT ERROR:\n"+checkContext);
                    }
                    else {
                        $this.removeClass();
                        if ($settings.class) { $this.addClass($settings.class); }
                        helpers.settings($this.addClass(defaults.name), $settings);
                        helpers.loader.css($this);
                    }
                });
            },
            next: function() {
                var settings = $(this).data("settings");
                $(this).find("#splash").hide();
                settings.interactive=true;
            },
            quit: function() {
                var $this = $(this) , settings = helpers.settings($this);
                if (settings.timer.id) { clearTimeout(settings.timer.id); settings.timer.id=0; }
                settings.finish = true;
                settings.context.onQuit({'status':'abort'});
            },
            submit: function() { helpers.submit($(this)); },
            dump: function() {
                var $this = $(this) , settings = helpers.settings($this);
                alert(helpers.equations.get($this).dump());
            }
        };

        if (methods[method])    { return methods[method].apply(this, Array.prototype.slice.call(arguments, 1)); } 
        else if (typeof method === 'object' || !method) { return methods.init.apply(this, arguments); }
        else { $.error( 'Method "' +  method + '" does not exist in equation plugin!'); }
    };
})(jQuery);

