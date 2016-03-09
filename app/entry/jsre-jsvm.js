/**

  Copyright 2010-2011, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */
var js = js || {};

if(!js.__j$vm__){(function(){
    
    this.__j$vm__ = true;

    //// Extends Object.prototype
    (function(){
        var slice = Array.prototype.slice;

        var v = function(o){
            return this.__tester__ ? o : this;
        };

        var t = function(o){
            var s = Object.prototype.toString.call(o);
            return s.substring(8, s.length-1).toLowerCase();
        };

        this.typeOf = function(o){
            return t(v.call(this, o));
        };

        this.isNull = function(o){
            return v.call(this, o) === null;
        };

        this.isUndefined = function(o){
            return v.call(this, o) === undefined;
        };

        this.isValid = function(o){
            o = v.call(this, o);
            return o !== null && o !== undefined;
        };

        this.isBoolean = function(o){
            return t(v.call(this, o)) === "boolean";
        };

        this.isNumber = function(o){
            o = v.call(this, o);
            return !isNaN(o) && t(o) === "number";
        };

        this.isString = function(o){
            return t(v.call(this, o)) === "string";
        };

        this.isDate = function(o){
            o = v.call(this, o);
            return !isNaN(o) && t(o) === "date";
        };

        this.isObject = function(o){
            return t(v.call(this, o)) === "object";
        };

        this.isArray = function(o){
            return t(v.call(this, o)) === "array";
        };
        
        this.isFunction = function(o){
            return t(v.call(this, o)) === "function";
        };

        this.isHtmlElement = function(o){
            return t(v.call(this, o)).indexOf("html") === 0; 
        };

        this.instanceOf = function(clazz){
            var ret, imps = this.__imps__; //@see $implements
            if(imps){
                ret = imps.some(function(c){return c === clazz;});
            }
            return ret | (this instanceof clazz);
        };

        this.forEach = function(fn, thi$){
            var v, k;

            for(k in this){
                if(!this.hasOwnProperty(k)) continue;
                try{
                    fn.apply(thi$, [this[k], k, this]);
                }catch(x){
                    if("break-loop" === x) break;
                    throw x;
                }
            }
        };

        this.map = function(fn, thi$){
            var ret = {};

            this.forEach(function(v, k, set){
                var o = fn.apply(thi$, [v, k, set]);
                ret[o[0]] = o[1];
            });

            return ret;
        };

        this.filter = function(fn, thi$){
            var ret = {}, args = slice.call(arguments, 2);

            this.forEach(function(v, k, set){
                if(fn.apply(thi$, [v, k, set].concat(args))){
                    ret[k] = v;
                }
            });

            return ret;
        };

        this.some = function(fn, thi$){
            var ret = false;

            this.forEach(function(v, k, set){
                if(fn.apply(thi$, [v, k, set])){
                    ret = true;
                    throw "break-loop";
                }
            });

            return ret;
        };

        this.every = function(fn, thi$){
            var ret = true;

            this.forEach(function(v, k, set){
                if(!fn.apply(thi$, [v, k, set])){
                    ret = false;
                    throw "break-loop";
                }
            });

            return ret;
        };

    }).call(Object.prototype);

    //// Extends Function.prototype
    (function($){
        
        var G = self, slice = Array.prototype.slice;

        /**
         * @member Function.prototype
         * Bind a function to the specified scope.
         * 
         * function.$bind(thi$ [,args])
         * 
         * @param {Object} thi$ the function execute scope.
         * 
         * @return {Function} A new function bind to the specified scope.
         */
        this.$bind = function(thi$){
            var fn = this, args = slice.call(arguments, 1);

            return function(){
                return fn.apply(thi$, args.concat(slice.call(arguments)));
            };
        };

        /**
         * @member Function.prototype
         * Delay a function with specified timeout.
         * 
         * function.$delay(thi$, tiemout [,args])
         * 
         *     @example
         *     var fun =  function(arg1, arg2){
         *         // do something
         *     };
         *     
         *     // The fun will be delay 100 millisecons to execute. 
         *     fun.$delay(this, 100, arg1, arg2..);
         * 
         * @param {Object} thi$ The function execute scope.
         * @param {Number} timeout
         * 
         * @return {Timer} A timer made by setTimeout()
         */
        this.$delay = function(thi$, timeout){
            var fn = this, args = slice.call(arguments, 2);

            fn.__timer__ = (fn.__timer__ || []);

            var t = G.setTimeout(function(){
                fn.$clearTimer(t);
                fn.apply(thi$, args);
            }, timeout);

            fn.__timer__.push(t);

            return t;
        };

        /**
         * @member Function.prototype
         * Clear the specified timer which created by $delay call.
         * 
         * function.$clearTimer(timer)
         * 
         *     @example
         *     var fun =  function(arg1, arg2){
         *         // do something
         *     };
         * 
         *     // The fun will be delay 100 millisecons to execute. 
         *     var timer = fun.$delay(this, 100, arg1, arg2..);
         * 
         *     // Clear the delayed fun
         *     fun.$clearTimer(timer);
         * 
         * @param {Timer} timer The timer return by setTimeout()
         */
        this.$clearTimer = function(timer){
            var i, ts = this.__timer__;

            if(!$.isArray(ts) || ts.length == 0) return;

            if(timer === null || timer === undefined){
                G.clearTimeout(ts.shift());
            }else{
                if(ts.some(function(v, k){i=k; return v === timer;})){
                    ts.splice(i, 1);
                    G.clearTimeout(timer);
                }
            }
        };

        /**
         * @member Function.prototype
         * Override the specified function.
         * 
         *     @example
         *     this.fun = function(){
         *         // do A thing
         *     };
         * 
         *     this.fun = function(){
         *         // You can call super do A before do B
         *         arguments.callee.__super__.apply(this, arguments);
         * 
         *         // do B thing
         *         
         *         // Or you will call super do A after do B
         *         arguments.callee.__super__.apply(this, arguments);
         * 
         *     }.$override(this.fun);
         * 
         * @param {Function} func The function which need overwrite
         * 
         * @return {Function} This function
         */
        this.$override = function(func){
            this.__super__ = func;

            return this;
        };

        /**
         * @member Function.prototype
         * Provides inheritance to javascript class.
         *
         * For example:
         *
         *     @example
         *     var A = function(){
         *     };
         *
         *     // B will extends A
         *
         *     var B = function(){
         *
         *     }.$extends(A)
         *
         *     new B() instanceof A // true
         *
         * @param {function} superC super class
         * 
         * @return {function} A class which extends from superC
         *
         */
        this.$extends = function(superC){
            var obj, cons, proto;

            if($.isFunction(superC)){
                cons= superC; obj = new (cons)();
            }else if($.isObject(superC)){
                cons= superC.constructor; obj = superC;
            }else{
                throw new Error("$extend must from a function or object.");
            }

            proto = this.prototype = obj;
            proto.constructor = cons;

            return this;
        };

        /**
         * @member Function.prototype
         * Provides implement interface to javascript class.
         *
         * For example:
         *
         *     @example
         *     var IA = function(){
         *         this.funA = function(){
         *         };
         *     };
         *
         *     var IB = function(){
         *         this.funB = function(){
         *         };
         *     };
         *
         *     var C = function(){
         *
         *     }.$implements(IA, IB);
         *
         *     var t = new C();
         *     t.instanceOf(IA) // true
         *     t.instanceOf(IB) // true
         *
         * @param {function} superCs interfaces
         * 
         * @return {function} A class which implements superCs interfaces.
         */
        this.$implements = function(superCs){
            var proto = this.prototype,
                imps = proto.__imps__ = [].concat(proto.__imps__ || []);

            slice.call(arguments, 0).forEach(function(iface){
                if($.isFunction(iface)){
                    imps.push(iface);
                    iface.$decorate(proto);
                }
            });

            return this;
        };

        this.$decorate = function(obj, except){
            if($.isNull(obj) || $.isUndefined(obj) ||
                    $.isBoolean(obj) || $.isNumber(obj)) return obj;

            except = except || {};
            except.__imps__ = true;
            if(!this.__defined__) this.$getInstance();

            this.prototype.forEach(function(v, k, set){
                if(!except[k]){ obj[k] = v;}
            });

            return obj;
        };

        this.$getInstance = function(){
            var o = this.__instance__;
            if(!o){
                o = this.__instance__ = new (this)();
            }
            return o; 
        };

        this.$async = function(){
            asyncQ.submit(this);
        };
        
    }).call(Function.prototype, this);

    // Async supporting
    var asyncQ = new function(){
        var curTask, scheduled;

        this.submit = function(fn){

           var task = {state:0, fn: fn, data:null, next:null};
            debugger;
            if(!curTask){
                curTask = task;
            }else if(curTask.state === 0){
                curTask.next = task;
            }else{
                task.next = curTask;
                curTask = task;
            }

            _run.call(this);
        };

        var _run = function(){
            if(!scheduled){
                scheduled = true;
                _run.$delay(this, 0);
                return;
            }
            debugger;
            if(curTask && curTask.state === 0){
                curTask.state = 1;
                if(curTask.next){
                    curTask.fn(curTask.data, _callback.$bind(this));
                }else{
                    var fn = curTask.fn, data = curTask.data;
                    curTask.forEach(_clean);
                    curTask = null;
                    fn(data);
                }
            }
            scheduled = false;
        };

        var _callback = function(data){
            debugger;

            var task = curTask.next;

            if(task && task.state === 1){
                curTask.forEach(_clean);
                curTask = task;
            }

            task = curTask.next;
            if(task){
                task.data = data;
                curTask.forEach(_clean);
                curTask = task;
            }else{
                curTask.forEach(_clean);
                curTask = null;
            }
        };

        var _clean = function(v, k, s){
            s[k] = null;
        };

    }();

    this.lang = {};

}).call(js);
}


(function(){

    // URL reader
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
                        debugger;
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

    // Cache supporting
    var cache = new (function(){
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

    })();

    var evalJS = function(text){
        var doc = self.document,
            script = doc.createElement("script"),
            header = doc.getElementsByTagName("head")[0];
        script.type = "text/javascript";
        script.text = text;
        header.appendChild(script);
        header.removeChild(script);
    };

///////////////////////////////////////////////////////////////////
    
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
        reader.read.$bind(reader, srcpath).$async();
        (function(data, callback){
            evalJS(data);
            callback();
        }).$async();
    }

    // Load package.jz
    (function(data, callback){
        srcpath = j$vm_home + "package.jz?__=1.0.s"+new Date().getTime();
        reader.read.$bind(reader, srcpath).$async();        
        (function(data, callback){
            debugger;
            packages = self.j$vm_pkgversion = JSON.parse(data);
            callback();
        }).$async();
    }).$async();


    // Load jsre-core
    (function(data, callback){
        debugger;
        srcpath = j$vm_home+corefile;
        var cached = cache.getItem(corefile), text;
        if(cached){
            cached = JSON.parse(cached);
            if(cached.build === packages[corefile]){
                text = cached.text;
            }
        }

        if(text == undefined){
            srcpath = srcpath+"?__=1.0."+packages["package.jz"];
            reader.read.$bind(reader, srcpath).$async();
            (function(data, callback){
                debugger;
                cache.setItem(corefile, JSON.stringify({
                    build: packages[corefile],
                    text: data
                }));

                evalJS(data);
                callback();
            }).$async();
        }
    }).$async();

})();

////////////////////////////////////////////////////////////////////////

(function(){

    var env = {
        j$vm_pid: "s1234567890",
        getsEntry: "./vt",
        postEntry: ".vt",
        theme: "default",
        heartbeat: 15000,
        j$vm_max_inactive: 600000
    };
    debugger;
    /*
    J$VM.exec(null, function(){
        var Class = js.lang.Class;

        //Class.forName("org.jsvm.RuntimeDecorator").call(this, env);
        //Class.forName("org.jsvm.ServiceDecorator").call(this.getService());

    }); */

}).$async();
