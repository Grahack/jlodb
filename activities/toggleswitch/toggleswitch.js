(function($) {
    // Activity default options
    var defaults = {
        name        : "toggleswitch",                           // The activity name
        label       : "Toggle switch"            ,              // The activity label
        templateX   : "template.html",                          // Activity's html template
        css         : "style.css",                              // Activity's css style sheet
        lang        : "en-US",                                  // Current localization
        score       : 1,                                        // The score (from 1 to 5)
        number      : 0,                                        // Pages number
        show        : true,                                     // Show the wrong responses
        toggle      : "a",                                      // Active class
        result      : "",
        init        : "",
        font        : 1,                                        // Template font
        debug       : false                                     // Debug mode
    };

    // private methods
    var helpers = {
        // @generic: Check the context
        checkContext: function(_settings){
            var ret         = "";
            if (!_settings.context)         { ret = "no context is provided in the activity call."; } else
            if (!_settings.context.onquit)  { ret = "mandatory callback onquit not available."; }

            if (ret.length) {
                ret+="\n\nUsage: $(\"target\")."+_settings.name+"({'onquit':function(_ret){}})";
            }
            return ret;
        },
        // Get the settings
        settings: function($this, _val) { if (_val) { $this.data("settings", _val); } return $this.data("settings"); },
        // Binding clear
        unbind: function($this) {
            $(document).unbind("keypress keydown");
            $this.unbind("mouseup mousedown mousemove mouseout touchstart touchmove touchend touchleave");
        },
        // Quit the activity by calling the context callback
        end: function($this) {
            var settings = helpers.settings($this);
            helpers.unbind($this);
            settings.context.onquit($this,{'status':'success','score':settings.score});
        },
        loader: {
            css: function($this) {
                var settings = helpers.settings($this), cssAlreadyLoaded = false, debug = "";
                if (settings.debug) { var tmp = new Date(); debug="?time="+tmp.getTime(); }

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
                var templatepath = "activities/"+settings.name+"/"+settings.templateX+debug;
                $this.load( templatepath, function(response, status, xhr) { helpers.loader.build($this); });
            },
            build: function($this) {
                var settings = helpers.settings($this);
                if (settings.context.onload) { settings.context.onload($this); }
                $this.css("font-size", Math.floor($this.height()/12)+"px");

                // Locale handling
                $this.find("h1#label").html(settings.label);
                $this.find("#guide").html(settings.guide);
                $.each(settings.locale, function(id,value) { $this.find("#"+id).html(value); });
                setTimeout(function() { helpers.build($this); }, 500);
                if (!$this.find("#splashex").is(":visible")) { setTimeout(function() { $this[settings.name]('next'); }, 500); }
            }
        },
        // REFRESH A TOGGLE ELEMENT
        refresh: function($this, elt) {
            var settings = helpers.settings($this), o = elt.state;
            if (settings.states.style) {
                var style   = {};
                if (o<0 && settings.show && settings.wrong && settings.wrong.style ) { style = settings.wrong.style; }
                if (o>=0) { style = settings.states.style[o%settings.states.style.length]; }
                for (var i in style) { elt.elt.css(i, style[i]); }
            }

            if (settings.states.content)
            {
                var content = "";
                if (o<0 && settings.show && settings.wrong && settings.wrong.content ) { content = settings.wrong.content; }
                if (o>=0) { content = settings.states.content[o%settings.states.content.length]; }

                if (settings.regexp) {
                    vRegexp = new RegExp(settings.regexp.from, "g");
                    content = content.replace(vRegexp, settings.regexp.to);
                }

                if (content.length) { elt.elt.html(content); }
            }
            if (settings.states["class"]) {
                var cl = "";

                if (o<0 && settings.show && settings.wrong && settings.wrong["class"] ) { cl = settings.wrong["class"]; }
                if (o>=0) { cl = settings.states["class"][o%settings.states["class"].length]; }

                if (cl.length) { elt.elt.attr("class",cl); }
            }
        },
        // CHANGE A STATUT
        click: function($this, id) {
            var settings = helpers.settings($this);
            if (settings.interactive) {
                var elt = settings.current.elts[id];

                var isOk = true;
                if (settings.current.onclick) {
                    isOk = eval('('+settings.current.onclick+')')($this, settings.current.elts, id); }

                if (isOk) {
                    elt.state=(elt.state+1)%((settings.states.nb)?settings.states.nb:2);
                    helpers.refresh($this, elt);
                }
            }
        },
        fill: function($this) {
            var settings = helpers.settings($this);
            settings.current.elts = [];
            $this.find("."+settings.toggle).each(function(index) {
                var elt={ elt:$(this), state:0 };
                if (settings.init.length>index) { elt.state = parseInt(settings.init[index]); }
                settings.current.elts.push(elt);
                helpers.refresh($this,elt);
                $(this).bind("mousedown touchstart",function(event){ helpers.click($this,index); event.preventDefault();});
            });
            settings.interactive = true;
        },
        // Build the question
        build: function($this) {
            var settings = helpers.settings($this);
            $this.find("#submit").removeClass("good").removeClass("wrong");
            $this.find("#effects").hide();
            $this.removeClass("end");

            if (!settings.number)   { settings.number = (settings.values)?settings.values.length:1; }

            // 3 CASES : GEN (FUNCTION), VALUES (ARRAY), DATA (SINGLE)
            settings.current=settings.values?settings.values[settings.it%settings.values.length]:settings;
            if (settings.current.gen) {
                var gen = eval('('+settings.current.gen+')')();
                settings.current.t      = gen.t;
                settings.current.result = gen.result;
                if (gen.data) { settings.current.data   = gen.data; }
            }

            if (settings.exercice) {
                if ($.type(settings.exercice)=="string") {
                    $this.find("#exercice #content").html(settings.exercice);
                } else {
                    $this.find("#exercice #content").html(settings.exercice.value);
                    if (settings.exercice.label) { $this.find("#exercice #label").html(settings.exercice.label).show(); }
                    if (settings.exercice.font) { $this.find("#exercice #content").css("font-size",settings.exercice.font+"em"); }
                }
                $this.find("#exercice").show();
            } else
            if (settings.current.exercice) {
                $this.find("#exercice #content").html(settings.current.comment);
                $this.find("#exercice").show(); }
            else { $this.find("#exercice").hide(); }

            if (settings.current.template) {
                var debug = "";
                if (settings.debug) { var tmp = new Date(); debug="?time="+tmp.getTime(); }

                var vRegexp = 0;
                if (settings.regexp) { vRegexp = new RegExp(settings.regexp.from, "g"); }

                if (settings.current.template.indexOf(".svg")!=-1) {
                    var templatepath = "res/img/"+settings.current.template+debug;
                    var elt= $("<div id='svg'></div>").appendTo($this.find("#data"));
                    elt.svg();
                    settings.svg = elt.svg('get');
                    $(settings.svg).attr("class",settings["class"]);
                    settings.svg.load(templatepath, { addTo: true, changeSize: true, onLoad:function() {
                        $this.find(".t").each(function(index) {
                            var value = settings.current.t[index];
                            if (vRegexp) { value = value.replace(vRegexp, settings.regexp.to); }
                            if (settings.current.t && settings.current.t.length>index) { $(this).text(value); }});
                        helpers.fill($this); }
                    });
                }
                else {
                    var templatepath = "activities/"+settings.name+"/template/"+settings.current.template+".html"+debug;
                    $this.find("#data").load(templatepath, function(response, status, xhr) {
                        $this.find(".t").each(function(index) {
                            var value = settings.current.t[index];
                            if (vRegexp) { value = value.replace(vRegexp, settings.regexp.to); }
                            if (settings.current.t && settings.current.t.length>index) {
                                $(this).html("<div style='font-size:"+settings.font+"em;margin-top:"+
                                             (1-settings.font)/(2*settings.font)+"em;'>"+value+"</div>"); }});
                        helpers.fill($this);
                    });
                }
            }
            else {
                $this.find("#data").html(settings.current.data);
                $this.find(".t").each(function(index) {
                    var value = settings.current.t[index];
                    if (vRegexp) { value = value.replace(vRegexp, settings.regexp.to); }
                    if (settings.current.t && settings.current.t.length>index) { $(this).text(value); }});
                helpers.fill($this);
            }
        }

    };

    // The plugin
    $.fn.toggleswitch = function(method) {

        // public methods
        var methods = {
            init: function(options) {
                // The settings
                var settings = {
                    interactive : false,
                    it          : 0,
                    wrongs      : 0,        // number of false response
                    current     : {         // the current page
                        elt     : "",
                        t       : [],
                        result  : "",
                        values  : []
                    },
                    svg         : 0
                };

                return this.each(function() {
                    var $this = $(this);
                    helpers.unbind($this);
                    this.onselectstart = function() { return false; }

                    var $settings = $.extend({}, defaults, options, settings);

                    var checkContext = helpers.checkContext($settings);
                    if (checkContext.length) {
                        alert("CONTEXT ERROR:\n"+checkContext);
                    }
                    else {
                        $this.removeClass();
                        if ($settings["class"]) { $this.addClass($settings["class"]); }
                        helpers.settings($this.addClass(defaults.name), $settings);
                        helpers.loader.css($this);
                    }
                });
            },
            valid: function() {
                var $this   = $(this) , settings = helpers.settings($this);
                if (settings.interactive) {
                    settings.interactive = false;
                    var result  = "";
                    var wrongs  = 0;
                    for (var i=0; i<settings.current.elts.length; i++) {
                        result+=settings.current.elts[i].state;
                        if(settings.current.result.length<i || settings.current.elts[i].state!=settings.current.result[i]) {
                            wrongs++;
                            settings.current.elts[i].state = -1;
                            helpers.refresh($this, settings.current.elts[i]);
                        }
                    }
                    var value = wrongs?"wrong":"good";
                    $this.find("#submit").addClass(value);
                    settings.wrongs+=wrongs;
                    settings.it++;
                    $this.addClass("end");

                    $this.find("#effects>div").hide();
                    if (!wrongs) { $this.find("#effects #good").show(); }
                    else         { $this.find("#effects #wrong").show(); }
                    $this.find("#effects").show();

                    if (settings.it>=settings.number) {

                        settings.score = 5-settings.wrongs;
                        if (settings.score<0) { settings.score = 0; }
                        $(this).find("#valid").hide();
                        setTimeout(function() { helpers.end($this); }, wrongs?2000:1000);
                    }
                    else {
                        setTimeout(function() { helpers.build($this); }, wrongs?2000:1000);
                    }
                }
            },
            quit: function() {
                var $this = $(this) , settings = helpers.settings($this);
                settings.interactive = false;
                settings.context.onquit($this,{'status':'abort'});
            },
            next: function() {
                var $this = $(this) , settings = helpers.settings($this);
                $(this).find("#submit").show();
            },
            refresh: function() {
                var $this = $(this) , settings = helpers.settings($this);
                for (var i in settings.current.elts) { helpers.refresh($this, settings.current.elts[i]); }
            }
        };

        if (methods[method])    { return methods[method].apply(this, Array.prototype.slice.call(arguments, 1)); } 
        else if (typeof method === 'object' || !method) { return methods.init.apply(this, arguments); }
        else { $.error( 'Method "' +  method + '" does not exist in toggleswitch plugin!'); }
    };
})(jQuery);

