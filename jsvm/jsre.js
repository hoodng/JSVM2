/**

  Copyright 2007-2015, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */

self.js = self.js || {};

(function(){

    var typeOf = this.typeOf = function(x, type){
        var s = Object.prototype.toString.call(x);
        s = s.substring(8, s.length-1);
        return type ? s === type : s;
    },

    types = [
        "Null", "Undefined","Function", "Object",
        "Array", "Boolean", "Number","String","Date"],

    j$vmkeys = {
        __impls__:1, __super__:1, __hosts__:1, __timer__:1,
        __defined__:1 },

    BREAKLOOP = "break-loop",

    slice = Array.prototype.slice;

    (function($){
        types.forEach(function(type){
            this["is"+type] = function(x){
                return typeOf(x, type);
            };
        });
    }).call(this);

    (function($){

        this.$extend = function(clazz){
            var proto, cons;
            if($.isFunction(clazz)){
                cons = clazz; proto = new (clazz)();
                proto.constructor = clazz;
            }else if(clazz){
                cons = clazz.constructor; proto = clazz;
                proto.constructor = cons;
            }
            this.prototype = proto;

            return this;
        };

        this.$implements = function(clazz){
            var proto = this.prototype, impls;

            impls = proto.__impls__ = [].concat(proto.__impls__ || []);

            (function(fn){
                if($.isFunction(fn)){
                    impls.push(fn);
                    fn.$decorate(proto);
                }
            }).$forEach(slice.call(arguments));

            return this;
        };

        this.$decorate = function(obj, replace){
            replace = replace || {};
            if(!this.__defined__) new (this)();

            (function(e, k, set){
                if(!j$vmkeys[k] && !obj[k] || replace[k]){
                    obj[k] = e;
                }
            }).forEach(this.prototype);

            return obj;
        };

        this.$override = function(fn){
            this.__super__ = fn;
            return this;
        };

        this.$bind = function(thi$, args){
            var fn = this, agent; args = slice.call(arguments, 1);
            agent = function(){
                return fn.apply(thi$,
                    args.concat(slice.call(arguments)));
            };

            return agent;
        };

        this.$listen = function(thi$, eventClass, args){
            var fn = this, agent; args = slice.call(arguments, 2);
            agent = function(e){
                return fn.apply(thi$,
                    [new (eventClass)(e)].concat(args));
            };
            agent.__hosts__ = fn;

            return agent;
        };

        this.$delay = function(thi$, timeout, args){
            var fn = this, timer; args = slice.call(arguments, 2);
            timer = self.setTimeout(function(){
                fn.$cancel(timer);
                fn.apply(thi$, args);
            }, timeout || 1);

            fn.__timer__ = (fn.__timer__ || []);
            fn.__timer__.push(timer);

            return timer;
        };

        this.$cancel = function(timer){
            var timers = this.__timer__, i;
            if(!timers || timers.length == 0) return;
            if(!timer){
                self.clearTimer(timers.shift());
            }else if((function(e, k, set){
                i = k;
                return timer === e;
            }).$some(timers)){
                timers.splice(i, 1);
                self.clearTimer(timer);
            }
        };

        var loop = {
            "Array": function(fn, set, thi$, args){
                for(var i=0, len=set.length; i<len; i++){
                    try{
                        fn.apply(thi$, [set[i], i, set].concat(args));
                    }catch(ex){
                        if(BREAKLOOP === ex) break;
                        throw ex;
                    }
                }
            },

            "Object": function(fn, set, thi$, args){
                for(var i in set){
                    if(!set.hasOwnProperty(i)) continue;

                    try{
                        fn.apply(thi$, [set[i], i, set].concat(args));
                    }catch(ex){
                        if(BREAKLOOP === ex) break;
                        throw ex;
                    }
                }
            }
        };

        this.$forEach = function(set, thi$, args){
            loop[typeOf(set)](
                this, set, thi$, slice.call(arguments, 2));
        };

        this.$map = function(set, thi$, args){
            var fn = this, ret = $.isArray(set) ? [] : {};

            args = slice.call(arguments, 2);
            (function(e, i, set){
                ret[i] = fn.apply(thi$, [e, i, set].concat(args));
            }).$forEach(set);

            return ret;
        };

        this.$filter = function(set, thi$, args){
            var fn = this, isArray = $.isArray(set),
                ret = isArray ? [] : {};

            args = slice.call(arguments, 2);
            (function(e, i, set){
                if(fn.apply(thi$, [e, i, set].concat(args))){
                    isArray ? ret.push(e) : ret[i] = e;
                }
            }).$forEach(set);

            return ret;
        };

        this.$some = function(set, thi$, args){
            var fn = this, ret = false;

            args = slice.call(arguments, 2);
            (function(e, i, set){
                if(fn.apply(thi$, [e, i, set].concat(args))){
                    ret = true;
                    throw BREAKLOOP;
                }
            }).$forEach(set);

            return ret;
        };
        
        this.$every = function(set, thi$, args){
            var fn = this, ret = true;

            args = slice.call(arguments, 2);
            (function(e, i, set){
                if(!fn.apply(thi$, [e, i, set].concat(args))){
                    ret = false;
                    throw BREAKLOOP;
                }
            }).$forEach(set);

            return ret;
        };

        this.$async = function(){
            var fn = this;
            asyncQ.submit(fn.$bind.apply(self, slice.call(arguments)));
        };

    }).call(Function.prototype, this);

    var asyncQ = new function(){

        this.submit = function(fn){
        };

    }();

    this.lang = {};
    this.util = {};
    this.net = {};

}).call(js);

var boot = function(){

    var cache = new function(){
        var local, session;

        this.setItem = function(key, value){
            try{
                local.removeItem(key);
                local.setItem(key, value);
            } catch (e1) {
                try{
                    session.removeItem(key);
                    session.setItem(key, value);
                } catch (e2) {
                }
            }
        };

        this.getItem = function(key){
            var value;

            try{
                value = session.getItem(key);
            } catch (e1) {
            }

            if(!value){
                try{
                    value = local.getItem(key);
                } catch (e2) {
                }
            }

            return value;
        };

        var _init = function(){
            local  = self.localStorage;
            session= self.sessionStorage;
        }();

    }();

    var reader = new function(){

        var createXHR = function(){
            var PV = {
                progid: undefined,
                progids:["MSXML2.XMLHTTP.6.0",
                    "MSXML2.XMLHTTP",
                    "Microsoft.XMLHTTP"]
            }, xhr;

            if(self.XMLHttpRequest != undefined){
                xhr = new XMLHttpRequest();
            }else{
                // IE
                if(PV.progid != undefined){
                    xhr = new ActiveXObject(PV.progid);
                }else{
                    for(var i=0; i<PV.progids.length; i++){
                        PV.progid = PV.progids[i];
                        try{
                            xhr = new ActiveXObject(PV.progid);
                            break;
                        } catch (x) {
                            // Nothing to do
                        }
                    }// For
                }// progid
            }
            return xhr;
        };

        this.read = function(path, callback){
            var xhr = createXHR(), status;
            xhr.onreadystatechange = function(){
                switch(xhr.readyState){
                    case 2:
                    case 3:
                    status = 200;
                    try{
                        status = xhr.status;
                    }catch(x){
                    }
                    if(status != 200 && status != 304){
                        throw "http status "+status + ": " + xhr.statusText;
                    }
                    break;
                    case 4:
                    status = xhr.status;
                    if(status == 200 || status == 304){
                        callback(xhr.responseText);
                    }else{
                        throw "http status "+status + ": " + xhr.statusText;
                    }
                    break;
                    default:
                    break;
                }
            };

            xhr.open("GET", path, true);
            self.setTimeout(function(){xhr.send();}, 0);
        };
        
    }();

    var evalJS = function(text){
        var doc = self.document,
            script = doc.createElement("script"),
            header = doc.getElementsByTagName("head")[0];
        script.type = "text/javascript";
        script.text = text;
        header.appendChild(script);
        header.removeChild(script);
    };
    
    var script = document.getElementById("j$vm");
    if(!script) return;

    var j$vm_home = script.getAttribute("crs") || script.src, 
        p, packages, srcpath, corefile = "lib/jsre-core.jz";

    if(j$vm_home.indexOf("http") !==0){
        // Not absolute path, we need construct j$vm_home with
        // script.src and script.crs.
        srcpath = script.src;
        p = srcpath.lastIndexOf("/");
        srcpath = srcpath.substring(0, p+1);
        j$vm_home = srcpath + j$vm_home;
    }
    p = j$vm_home.lastIndexOf("/");
    j$vm_home = j$vm_home.substring(0, p+1);
    
    // Use A tag to get a canonical path,
    // here, just for compressing "../" in path. 
    p = document.createElement("A");
    p.href = j$vm_home;
    j$vm_home = p.href;
    
    if(self.JSON == undefined){
        srcpath = j$vm_home+"lib/json2.jz";
        reader.read(srcpath, function(text){
            evalJS(text);
            loadPackageVer();
        });
    }else{
        loadPackageVer();
    }

    var loadPackageVer = function(){
        srcpath = j$vm_home + "package.jz?__=1.0.s"+new Date().getTime();
        reader.read(srcpath, function(text){
            packages = self.j$vm_pkgversion = JSON.parse(text);
            loadJsreCore();
        })
    };

    var loadJsreCore = function(){
        srcpath = j$vm_home + corefile;
        var cached = cache.getItem(corefile), code;
        if(cached){
            cached = JSON.parse(cached);
            if(cached.build === packages[corefile]){
                code = cached.text;
            }
        }

        if(code == undefined){
            srcpath = srcpath + "?__=1.0."+packages["package.jz"];
            reader.read(srcpath, function(text){
                code = text;
                cache.setItem(corefile, JSON.stringify({
                    build: packages[corefile],
                    text: text
                }));
            })
        }

        evalJS(code);
    };

}();

boot.then