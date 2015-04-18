(function($) {
    // Activity default options
    var defaults = {
        name        : "marker",                                 // The activity name
        label       : "Marker",                                 // The activity label
        template    : "template.html",                          // Activity's html template
        css         : "style.css",                              // Activity's css style sheet
        lang        : "en-US",                                  // Current localization
        font        : 1,                                        // The font-size multiplicator
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
                var templatepath = "activities/"+settings.name+"/"+settings.template+debug;
                $this.load( templatepath, function(response, status, xhr) { helpers.loader.build($this); });
            },
            build: function($this) {
                var settings = helpers.settings($this);

                // Send the onLoad callback
                if (settings.context.onload) { settings.context.onload($this); }
                $this.css("font-size", Math.floor($this.height()/12)+"px");

                //
                $this.find("#exercice>div").hide();
                for (var i in settings.questions) {
                    $this.find("#exercice #c"+(parseInt(i)+1)+" .legend").html(settings.questions[i].label);
                    $this.find("#exercice #c"+(parseInt(i)+1)).show();
                }

                var content ="";
                var reg = new RegExp("[ ]", "g");
                var t = -1, tnext;

                // PARSE EACH PARAGRAPH
                for (var i=0; i<settings.text.length; i++) {
                    content+="<p>";
                    var text = settings.text[i].split(reg);
                    // BROWSE EACH WORD
                    for (var j=0; j<text.length; j++) {
                        // ADD A SPACE
                        if (j) content+=helpers.word($this,"&nbsp;", 9);

                        // HANDLE PUNCTUATION
                        var begin = 0, end = text[j].length;
                        if (text[j][0]=='"') { begin=1; }

                        for (var k=end; k>begin; k--) {
                            if ((text[j][k-1]=='.')||(text[j][k-1]==',')||(text[j][k-1]==':')||(text[j][k-1]==';')||(text[j][k-1]=='"'))
                                { end=k-1; }
                            else { k=begin; }
                        }
                        var endx = end, beginx = begin;
                        // HANDLE SEPARATOR
                        tnext = t;
                        for (var k in settings.questions) {
                            if (text[j][begin]==settings.questions[k].s) { beginx++; t = (t==k)?-1:k; tnext = t;}
                            if (text[j][end-1]==settings.questions[k].s) { endx--; tnext = (t==k)?-1:k; }
                        }

                        if (begin) { content+=helpers.word($this,text[j][0], 9); }
                        content+=helpers.word($this,text[j].substring(beginx,endx), t);
                        if (end!=text[j].length) { content+=helpers.word($this,text[j].substring(end), 9); }

                        t = tnext;
                    }
                    content+="</p>";
                }
                helpers.color($this,0);

                $this.find("#data>div").css("font-size",settings.font+"em").html(content);
                $("body").bind("mouseup", function() { helpers.mouseup($this); })
                        .bind("touchend", function() { helpers.mouseup($this); });

                // Locale handling
                $this.find("h1#label").html(settings.label);
                $this.find("#exercice").html(settings.exercice);
                if (settings.locale) { $.each(settings.locale, function(id,value) { $this.find("#"+id).html(value); }); }
                if (!$this.find("#splashex").is(":visible")) { setTimeout(function() { $this[settings.name]('next'); }, 500); }
            }
        },
        word: function($this, _word,_t) {
            var settings = helpers.settings($this);
            var ret = "<span id='s"+(settings.it++)+"' ";
            ret+="onmousedown='$(this).closest(\".marker\").marker(\"mousedown\", $(this));' ";
            ret+="ontouchstart='$(this).closest(\".marker\").marker(\"mousedown\", $(this));event.preventDefault();' ";
            ret+="onmousemove='$(this).closest(\".marker\").marker(\"mousemove\", $(this));' ";
            ret+="ontouchmove='$(this).closest(\".marker\").marker(\"touchmove\", event);event.preventDefault();' ";
            ret+=">"+_word+"</span>";
            settings.words.push([-1,-1,_t]);
            return ret;
        },
        mouseup: function($this) {
            var settings = helpers.settings($this);
            if (settings.m.id == settings.m.first) {
                if (settings.words[settings.m.id][1]==settings.color) {
                    settings.words[settings.m.id][0]=-1;
                    helpers.update($this);
                }
            }
            settings.m.first = -1;
        },
        color: function($this, _color) {
            var settings = helpers.settings($this);
            settings.color = _color;
            $this.find("#exercice .color").removeClass("s");
            $this.find("#exercice #c"+(settings.color+1)+" .color").addClass("s");
        },
        update: function($this) {
            var settings = helpers.settings($this);
            for (var i=0; i<settings.words.length; i++) {
                var $elt = $this.find("#s"+i);
                $elt.removeClass();
                if (settings.words[i][0]!=-1) {
                    $elt.addClass("s"+settings.words[i][0]);
                    // COMPUTE CORNER
                    var corner = 0;
                    if ((typeof $elt.prev().attr("id")=="undefined")||settings.words[i-1][0]!=settings.words[i][0]) { corner+=1; }
                    if ((typeof $elt.next().attr("id")=="undefined")||settings.words[i+1][0]!=settings.words[i][0]) { corner+=2; }

                    if (corner) { $elt.addClass("c"+corner); }
                }
            }
        }
    };

    // The plugin
    $.fn.marker = function(method) {

        // public methods
        var methods = {
            init: function(options) {
                // The settings
                var settings = {
                    finish          : false,
                    words           : [],
                    it              : 0,
                    color           : 0,
                    m               : {
                        first       : -1,
                        max         : -1,
                        min         : -1,
                        mode        : 0,
                        order       : -1,
                        id          : -1
                    },
                    score           : 0
                };

                return this.each(function() {
                    var $this = $(this);
                    helpers.unbind($this);

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
            mousedown:function($elt) {
                var $this = $(this) , settings = helpers.settings($this);
                if (!settings.finish) {
                    id = parseInt($elt.attr("id").substr(1));
                    settings.m.first = id;
                    settings.m.mode = 0;
                    settings.m.max = id;
                    settings.m.min = id;
                    settings.m.id = id;
                    if (settings.words[id][0]==settings.color) {
                        var max=id, min=id;
                        while (max<settings.words.length-1 && settings.words[max+1][0]==settings.color) { max++; }
                        while (min>0 && settings.words[min-1][0]==settings.color) { min--; }
                        settings.m.mode = (id-min<max-id)?1:2;
                        if (id-min<max-id) { for (var i=min; i<id; i++) { settings.words[i][0] = -1; }
                        } else { for (var i=id+1; i<=max; i++) { settings.words[i][0] = -1; } }
                    }

                    for (var i in settings.words) { settings.words[i][1] = settings.words[i][0]; }

                    settings.words[settings.m.first][0]=settings.color;
                    helpers.update($this);
                }
            },
            touchmove:function(_event) {
                var $e=$(document.elementFromPoint(_event.pageX,_event.pageY));
                if ($e.attr("id")[0]=='s') { $(this).marker('mousemove',$e); }

            },
            mousemove:function($elt) {
                var $this = $(this) , settings = helpers.settings($this);


                if (settings.m.first!=-1 && !settings.finish)  {
                    var id= parseInt($elt.attr("id").substr(1));

                    if (settings.m.order==-1) { settings.m.order=(id>settings.m.first?0:1); }

                    if (id>settings.m.first) {
                        if (settings.m.mode==1) {
                            for (var i=settings.m.first; i<=id; i++) {
                                if (settings.words[i][1]==settings.color) { settings.words[i][0]=-1; } else { break; }
                            }
                        }
                        else {
                            for (var i=settings.m.first; i<=id; i++) { settings.words[i][0]=settings.color; }
                        }

                        if (id>=settings.m.max) { settings.m.max = id; }
                        for (var i=id+1; i<=settings.m.max; i++) { settings.words[i][0]=settings.words[i][1]; }

                        if (settings.m.order==false) {
                            for (var i=settings.m.min; i<settings.m.first; i++) {  settings.words[i][0]=settings.words[i][1]; }
                        }
                    }
                    else {
                        if (settings.m.mode==2) {
                            for (var i=id; id<=settings.m.first; i++) {
                                if (settings.words[i][1]==settings.color) { settings.words[i][0]=-1; } else { break; }
                            }
                        }
                        else {for (var i=id; i<=settings.m.first; i++) { settings.words[i][0]=settings.color; }}

                        if (id<=settings.m.min) { settings.m.min = id; }
                        for (var i=settings.m.min; i<id; i++) { settings.words[i][0]=settings.words[i][1]; }

                        if (settings.m.order==true) {
                            for (var i=settings.m.first+1; i<=settings.m.max; i++) {  settings.words[i][0]=settings.words[i][1]; }
                       }

                    }

                    settings.m.order=(id>settings.m.first);
                    settings.m.id = id;
                    helpers.update($this);
                }
            },
            next: function() { settings.interactive = true; },
            valid: function() {
                var $this = $(this) , settings = helpers.settings($this);
                if (!settings.finish) {
                    settings.finish = true;
                    settings.score = 5;
                    // FIND THE WRONG WORDS
                    for (var i in settings.words) {
                        if (settings.words[i][2]!=9 && settings.words[i][2]!=settings.words[i][0]) {
                            settings.score--;
                            $(this).find("#s"+i).addClass("wrong");
                            settings.words[i][0]=-2;
                        }
                    }
                    // ESPACE BETWEEN 2 WRONG WORDS BECOMES WRONG TOO
                    for (var i=1;i<settings.words.length-1;i++) {
                        if (settings.words[i][2]==9 && (
                                (settings.words[i-1][0]==-2 && settings.words[i+1][0]==-2) ||
                                (settings.words[i-1][0]==-2 && settings.words[i+1][2]==9) ||
                                (settings.words[i-1][2]==9 && settings.words[i+1][0]==-2))) {
                            $(this).find("#s"+i).addClass("wrong");
                        }
                    }
                    if (settings.score<0) { settings.score = 0; }
                    $(this).find("#valid").hide();
                    setTimeout(function() { helpers.end($this); }, (settings.score!=5)?3000:500);
                }
            },
            color: function(_val) { helpers.color($(this), _val); },
            quit: function() {
                var $this = $(this) , settings = helpers.settings($this);
                settings.finish = true;
                settings.context.onquit($this,{'status':'abort'});
            }
        };

        if (methods[method])    { return methods[method].apply(this, Array.prototype.slice.call(arguments, 1)); } 
        else if (typeof method === 'object' || !method) { return methods.init.apply(this, arguments); }
        else { $.error( 'Method "' +  method + '" does not exist in marker plugin!'); }
    };
})(jQuery);

