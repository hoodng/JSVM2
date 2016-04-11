/**

  Copyright 2007-2015, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */

self.js = self.js || {};

(function(){

    J$VM = {};
    J$VM.__version__ = "1.0.";
    J$VM.env = {
        j$vm_ajax_nocache: true,
        j$vm_ajax_timeout: 600000
    };
    J$VM.isworker = function(){
        return !self.document;
    }();
    
    var TYPES = [
        "Null", "Undefined","Function", "Object",
        "Array", "Boolean", "Number","String","Date"],

        SANDBOX = {name:"j$vm-sandbox"},
        BREAKLOOP = "break-loop", 
        sliceArgs = Array.prototype.slice,
        typeString= Object.prototype.toString,
    
        lang = this.lang = {Class:{}, System:{}},
        Class = lang.Class, System = lang.System,
    
        typeOf = Class.typeOf = function(x, type){
            var s = typeString.call(x);
            s = s.substring(8, s.length-1);
            return arguments.length > 1 ? s === type : s;
        };

    (function(){
        TYPES.forEach(function(type){
            this["is"+type] = function(x){
                return typeOf(x, type);
            };
        });
    }).call(Class);

    (function(){
        var props = J$VM.env, os;
            
        // Init standard output
        (function(){
            if(!J$VM.isworker){
                os = self.console || {
                    info: function(s){},
                    error: function(s){},
                    log: function(s){}
                };
            }else{
                var post = self.postMessage;
                os = {};
                os.info = function(s){
                    post({type:"inf", data:s});
                };
                os.error = function(s){
                    post({type:"err", data:s});
                };
                os.log = function(s){
                    post({type:"log", data:s});
                };
            }
        })();

        this.out = {println: function(s){os.info(s);}};
        this.err = {println: function(s){os.error(s);}};
        this.log = {println: function(s){
            if(this.logEnabled()) os.log(s);}};
        
        this.logEnabled = function(){
            return this.getProperty("j$vm_log") === true;
        };

        this.hasProperty = function(key){
            return props.hasOwnProperty(key);
        };

        this.getProperty = function(key, defValue){
            return this.hasProperty(key) ?
                props[key] || defValue : defValue;
        };

        this.setProperty = function(key, value){
            var pre = null;
            if(key){
                pre = props[key];
                props[key] = value;
            }
            return pre;
        };

        this.forArray = function(set, fn, thi$, args){
            var BK = BREAKLOOP;
            thi$ = thi$ || SANDBOX;
            args = sliceArgs.call(arguments, 3);
            for(var i=0, len=set.length; i<len; i++){
                try{
                    fn.apply(thi$, [set[i], i, set].concat(args));
                } catch (x) {
                    if(x === BK) break;
                    throw x;
                }
            }
        };

        this.forObject = function(set, fn, thi$, args){
            var BK = BREAKLOOP, has = Object.prototype.hasOwnProperty;
            thi$ = thi$ || SANDBOX;
            args = sliceArgs.call(arguments, 3);
            for(var i in set){
                if(!has.call(set, i)) continue;
                try{
                    fn.apply(thi$, [set[i], i, set].concat(args));
                } catch (x) {
                    if(x === BK) break;
                    throw x;
                }
            }
        };

        this.objectCopy = function(src, des, deep, unmerge){
            switch(Class.typeOf(src)){
                case "Object":
                des = des || {};
                this.forObject(src, function(v, k){
                    des[k] = (!deep || !Class.isObject(v)) ? v :
                        this.objectCopy(v, (unmerge ? null : des[k]),
                                        deep, unmerge);
                }, this);
                break;
                case "Array":
                des = this.arrayCopy(src, 0, des, 0, src.length, deep);
                break;
                default:
                des = src;
            }
            return des;
        };

        this.arrayCopy = function(src, srcIdx, des, desIdx, length, deep){
            var len = src.length - srcIdx, BK = BREAKLOOP;
            length = Class.isNumber(length) ?
                ((length > len) ? len:length) : len;
            des = des || [];
            this.forArray(src, function(v, i){
                if(i < srcIdx) return;
                if(i > srcIdx + length -1) throw BK;
                des[desIdx+i-srcIdx] = (!deep || !Class.isObject(v)) ? v :
                    this.objectCopy(v, null, deep);
            }, this);
            return des;
        };

        
        var tasks = [], scheduled;
        this.queued = function(fn, callback, thi$, args){
            /*
             * state: 0: pendding, 1:doing, 2:done 
             */
            var task = {state:0, fn: fn, data: null},
                curTask = tasks.length > 0 ?
                tasks[tasks.length-1] : null;

            fn.ctx = {thi$: thi$ || SANDBOX,
                      callback: callback,
                      args:sliceArgs.call(arguments, 3)}

            if(!curTask || curTask.state === 1){
                tasks.push(task);
                scheduled = false;
            }else{
                curTask.tasks = curTask.tasks || [];
                curTask.tasks.push(task);
            }

            if(!scheduled){
                scheduled = true;
                _run.$delay(0, this);
            }
        };

        var _run = function(){
            var fn, ctx, promise, 
                curTask = tasks.length > 0 ?
                tasks[tasks.length-1] : null;
            
            if(!curTask){
                scheduled = false;
                return;
            }

            fn = curTask.fn; ctx = fn.ctx;
            switch(curTask.state){
                case 0: // Pendding state
                curTask.state = 1; // change to doing state
                promise = {data: curTask.data,
                           done: _done.$bind(this)};
                fn.apply(ctx.thi$, [promise].concat(ctx.args));
                break;

                case 2: // Done state
                if(Class.isFunction(ctx.callback)){
                    ctx.callback.apply(
                        ctx.thi$, [curTask.data].concat(ctx.args));
                }
                fn.ctx = null;

                var task = curTask.tasks ?
                    curTask.tasks.shift() : null;
                if(task){
                    // task.state shoule be 0
                    task.data  = curTask.data;
                    task.tasks = curTask.tasks;
                    tasks[tasks.length-1] = task;
                }else{
                    curTask = tasks.pop();
                    task = tasks.length > 0 ?
                        tasks[tasks.length-1] : null;
                    if(task){
                        // task.state shoule be 1
                        task.state = 2;
                        task.data = curTask.data;
                    }
                }
                curTask.data = null;
                curTask.tasks= null;
                curTask.fn = null;
                _run.call(this);
                break;

                default:
                throw new Error("Unexcept state: "+curTask.state);
                break;
            }
        };

        var _done = function(data){
            var curTask = tasks[tasks.length-1];
            curTask.state = 2;
            curTask.data = data;
            _run.call(this);
        };
        
        
    }).call(System);

    (function(){
        
        this.$forEach = function(set, thi$, args){
            System["for"+typeOf(set)].apply(
                SANDBOX, [set, this].concat(sliceArgs.call(arguments,1)));
        };

        this.$map = function(set, thi$, args){
            var fn = this, ret = Class.isArray(set) ? [] : {};
            thi$ = thi$ || SANDBOX;
            args = sliceArgs.call(arguments, 2);
            (function(e, i, set){
                ret[i] = fn.apply(thi$, [e, i, set].concat(args));
            }).$forEach(set);

            return ret;
        };

        this.$filter = function(set, thi$, args){
            var fn = this, isA = Class.isArray(set),
                ret = isA ? [] : {};
            thi$ = thi$ || SANDBOX;
            args = sliceArgs.call(arguments, 2);
            (function(e, i, set){
                if(fn.apply(thi$, [e, i, set].concat(args))){
                    isA ? ret.push(e) : ret[i] = e;
                }
            }).$forEach(set);

            return ret;
        };

        this.$some = function(set, thi$, args){
            var fn = this, BK = BREAKLOOP, ret = false;
            thi$ = thi$ || SANDBOX;
            args = sliceArgs.call(arguments, 2);
            (function(e, i, set){
                if(fn.apply(thi$, [e, i, set].concat(args))){
                    ret = true;
                    throw BK;
                }
            }).$forEach(set);

            return ret;
        };
        
        this.$every = function(set, thi$, args){
            var fn = this, BK = BREAKLOOP, ret = true;
            thi$ = thi$ || SANDBOX;
            args = sliceArgs.call(arguments, 2);
            (function(e, i, set){
                if(!fn.apply(thi$, [e, i, set].concat(args))){
                    ret = false;
                    throw BK;
                }
            }).$forEach(set);

            return ret;
        };

        this.$delay = function(timeout, thi$, args){
            var fn = this, timer;
            thi$ = thi$ || SANDBOX;
            args = sliceArgs.call(arguments, 2);
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
            if(arguments.length === 0){
                self.clearTimeout(timers.shift());
            }else if((function(e, k){
                i = k; return timer === e;
            }).$some(timers)){
                timers.splice(i, 1);
                self.clearTimeout(timer);
            }
        };

        this.$while = function(testP, thi$, args){
            var fn = this, hasNext = testP;
            thi$ = thi$ || SANDBOX;
            args = sliceArgs.call(arguments, 2);
            if(Class.isFunction(testP)){
                hasNext = testP.apply(thi$, args);
            }
            if(hasNext){
                fn.apply(thi$, args);
                (function(){
                    fn.$while.apply(fn, [testP, thi$].concat(args));
                }).$delay(1);
            }
        };

        this.$queued = function(callback, thi$, args){
            System.queued.apply(System,[this].concat(
                sliceArgs.call(arguments)))
        };

        this.$bind = function(thi$, args){
            var fn = this;
            args = sliceArgs.call(arguments, 1);
            return function(){
                return fn.apply(
                    thi$,
                    sliceArgs.call(arguments).concat(args));
            };
        };

        this.$override = function(fn){
            this.__super__ = fn;
            return this;
        };

        self.$super = function(thi$, args){
            var caller = self.$super.caller;
            args = arguments.length > 1 ?
                sliceArgs.call(arguments, 1):
                sliceArgs.call(caller.arguments);
            return caller.__super__.apply(thi$, args);
        };

        self.$define = function(fn){
            if(!Class.isFunction(fn)) return;
            
            (function(promise){
                fn.call(SANDBOX);
                promise.done();
            }).$queued();
        };
        
        this.$extend = function(clazz){
            var proto;
            if(Class.isFunction(clazz)){
                proto = new (clazz)(); proto.constructor = clazz;
            }else if(clazz){
                proto = clazz;
            }
            this.prototype = proto;
            return this;
        };

        this.$decorate = function(obj, replace){
            var clazz = this;
            if(!obj) return null;
            if(!clazz.__defined__) new (clazz)();
            replace = replace || {};
            (function(e, k){
                if(Class.isFunction(e) && (!obj[k] || replace[k])){
                    obj[k] = e;
                }
            }).forEach(clazz.prototype);
            return obj;
        };
        
        this.$implements = function(clazz){
            var proto = this.prototype, impls;
            impls = proto.__impls__ = [].concat(proto.__impls__ || []);
            (function(fn){
                if(Class.isFunction(fn)){
                    impls.push(fn);
                    fn.$decorate(proto);
                }
            }).$forEach(sliceArgs.call(arguments));
            return this;
        };

    }).call(Function.prototype);

})();

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