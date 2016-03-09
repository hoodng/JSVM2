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
    J$VM.__product__ = "J$VM";
    J$VM.__version__ = "1.0.";
    J$VM.env = {
        j$vm_ajax_nocache: true,
        j$vm_ajax_timeout: 600000,
        j$vm_ajax_concurrent: 8
    };
    J$VM.isworker = function(){
        return !self.document
    }();

    this.lang = {Class:{}, System:{}};

    var sliceArgs = Array.prototype.slice;
    var Class = J$VM.Class = function(){
        var toTypeString = Object.prototype.toString,
            types = ["Null", "Undefined","Function", "Object",
                "Array", "Boolean", "Number","String","Date"];

        this.typeOf = function(x, typeStr){
            var s = toTypeString.call(x);
            s = s.substring(8, s.length-1);
            return arguments.length > 1 ? s == typeStr : s;
        };

        var isType = function(type){
            return function(x){
                var b = this.typeOf(x, type);
                return type !== "Number" ? b : (b && !isNaN(x));
            };
        };

        for(var i=types.length-1; i>=0; i--){
            var type = types[i]
            this["is"+type] = isType(type);
        }

        this.isHtmlElement = function(x){
            var s = this.typeOf(x).toLowerCase();
            return s.startsWith("html") && s.endsWith("element");
        };

        return this;
        
    }.call(js.lang.Class);

    var System = J$VM.System = function(){
        var props = J$VM.env, os;

        (function(){
            if(!J$VM.isworker){
                os = self.console || {
                    info :function(s){},
                    error: function(s){},
                    log  : function(s){}
                };
            }else{
                var msg = self.postMessage;
                os = {
                    info :function(s){msg({type: "inf", data:s});},
                    error:function(s){msg({type: "err", data:s});},
                    log  :function(s){msg({type: "log", data:s});}
                };
            }
        })();

        this.out = {println: function(s){os.info(s);}};
        this.err = {println: function(s){os.error(s);}};
        this.log = {println: function(s){
            if(System.logEnabled()) os.log(s);}};

        this.logEnabled = function(){
            return this.getProperty("j$vm_log") == true;
        };
        
        this.hasProperty = function(key){
            return props.hasOwnProperty(key);
        };

        this.getProperty = function(key, defValue){
            return this.hasProperty(key) ? props[key] : defValue;
        };

        this.setProperty = function(key, value){
            var pre = props[key];
            props[key] = value;
            return pre;
        };

        this.rmvProperty = function(key){
            var pre = props[key];
            delete props[key];
            return pre;
        };

        this.BREAKLOOP = "break-loop";
        this.SANDBOX = {name:"j$vm-sandbox"};

        this.objectCopy = function(src, des, deep, unmerge){
            switch(Class.typeOf(src)){
                case "Object":
                des = des || {};
                this.forObject(src, function(v, k){
                    des[k] = !deep ? v :
                        this.objectCopy(v, (unmerge ? null : des[k]),
                            deep, unmerge);
                }, this);
                break;
                case "Array":
                des = this.arrayCopy(src, 0, des, 0, src.length, deep);
                break;
                default:
                des = src;
                break;
            }
            return des;
        };

        this.arrayCopy = function(src, srcIndex, des, desIndex,
            length, deep){
            var len = src.length - srcIndex;
            length = Class.isNumber(length) ?
                ((length > len) ? len : length) : len;
            des = des || [];
            this.forArray(src, function(v, i){
                if(i < srcIndex) return;
                if(i > srcIndex + length - 1)
                    throw System.BREAKLOOP;
                des[desIndex + i - srcIndex] = !deep ? v :
                    this.objectCopy(v, null, deep);
            }, this);
            return des;
        };

        this.forArray = function(set, fn, thi$, args){
            thi$ = thi$ || this.SANDBOX;
            args = sliceArgs.call(arguments, 3);
            for(var i=0, len=set.length; i<len; i++){
                try{
                    fn.apply(thi$, [set[i], i, set].concat(args));
                }catch(ex){
                    if(ex === System.BREAKLOOP) break;
                    throw ex;
                }
            }
        };

        this.forObject = function(set, fn, thi$, args){
            thi$ = thi$ || this.SANDBOX;
            args = sliceArgs.call(arguments, 3);
            for(var i in set){
                if(!set.hasOwnProperty(i)) continue;
                try{
                    fn.apply(thi$, [set[i], i, set].concat(args));
                }catch(ex){
                    if(ex === System.BREAKLOOP) break;
                    throw ex;
                }
            }
        };

        var tasks = [], scheduled;
        this.queued = function(fn, callback, thi$, args){
            /*
             * state: 0: pendding, 1:doing, 2:done 
             */
            var task = {state:0, fn: fn, data: null},
                curTask = tasks.length > 0 ?
                tasks[tasks.length-1] : null;

            task.fn.ctx = {thi$: thi$, callback: callback,
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
                fn.apply(ctx.thi$ || this.SANDBOX,
                    [promise].concat(ctx.args));
                break;

                case 2: // Done state
                if(Class.isFunction(ctx.callback)){
                    ctx.callback.apply(ctx.thi$ || this.SANDBOX,
                        [curTask.data].concat(ctx.args));
                }
                delete fn.ctx;

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

        return this;

    }.call(js.lang.System);

    Function.prototype.$forEach = function(set, thi$, args){
        System["for"+Class.typeOf(set)].apply(
            Class, [set, this].concat(sliceArgs.call(arguments, 1)));
    };

    Function.prototype.$map = function(set, thi$, args){
        var fn = this, ret = Class.isArray(set) ? [] : {};
        thi$ = thi$ || System.SANDBOX;
        args = sliceArgs.call(arguments, 2);
        (function(e, i, set){
            ret[i] = fn.apply(thi$, [e, i, set].concat(args));
        }).$forEach(set);
        return ret;
    };

    Function.prototype.$filter = function(set, thi$, args){
        var fn = this, isA = Class.isArray(set), ret = isA ? [] : {};
        thi$ = thi$ || System.SANDBOX;
        args = sliceArgs.call(arguments, 2);
        (function(e, i, set){
            if(fn.apply(thi$, [e, i, set].concat(args))){
                if(isA){ret.push(e);}else{ret[i]=e;}
            }
        }).$forEach(set);
        return ret;
    };

    Function.prototype.$some = function(set, thi$, args){
        var fn = this, ret = false;
        thi$ = thi$ || System.SANDBOX;
        args = sliceArgs.call(arguments, 2);
        (function(e, i, set){
            if(fn.apply(thi$, [e, i, set].concat(args))){
                ret = true; throw System.BREAKLOOP;
            }
        }).$forEach(set);
        return ret;
    };

    Function.prototype.$every = function(set, thi$, args){
        var fn = this, ret = true;
        thi$ = thi$ || System.SANDBOX;
        args = sliceArgs.call(arguments, 2);
        (function(e, i, set){
            if(!fn.apply(thi$, [e, i, set].concat(args))){
                ret = false; throw System.BREAKLOOP;
            }
        }).$forEach(set);
        return ret;
    };

    Function.prototype.$delay = function(timeout, thi$, args){
        var fn = this, timer;
        thi$ = thi$ || System.SANDBOX;
        args = sliceArgs.call(arguments, 2);
        timer = self.setTimeout(function(){
            fn.$cancel(timer);
            fn.apply(thi$, args);
        }, timeout||1);
        fn.__timer__ = (fn.__timer__||[]);
        fn.__timer__.push(timer);
        return timer;
    };

    Function.prototype.$cancel = function(timer){
        var timers = this.__timer__, i;
        if(!timers || timers.length == 0) return;
        if(arguments.length === 0){
            self.clearTimeout(timers.shift());
        }else if(function(e, k){
            i = k; return timer === e;
        }.$some(timers)){
            timers.splice(i, 1);
            self.clearTimeout(timer);
        }
    };

    Function.prototype.$while = function(test, thi$, args){
        var fn = this, hasNext = test;
        thi$ = thi$ || System.SANDBOX;
        args = sliceArgs.call(arguments, 2);
        if(Class.isFunction(test)){
            hasNext = test.apply(thi$, args);
        }
        if(hasNext){
            fn.apply(thi$, args);
            (function(){
                fn.$while.apply(fn, [test, thi$].concat(args));
            }).$delay(1000);
        }
    };

    Function.prototype.$queued = function(callback, thi$, args){
        System.queued.apply(System, [this].concat(
            sliceArgs.call(arguments)));
    };

    Function.prototype.$bind = function(thi$, args){
        var fn = this, agent;
        args = sliceArgs.call(arguments, 1);
        agent = function(){
            return fn.apply(thi$,
                sliceArgs.call(arguments).concat(args));
        };
        return agent;
    };

    Function.prototype.$override = function(fn){
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
    
    self.$inject = function(target, fnName, inject, after){
        var fn = target[fnName], ret;
        if(!Class.isFunction(fn) ||
                !Class.isFunction(inject)) return;

        target[fnName] = function(){
            if(!after){
                inject(arguments);
                ret = self.$super(this);                
            }else{
                ret = self.$super(this);
                inject(arguments);
            }
            return ret;
        }.$override(fn);

    };

    self.$debug = function(target, fnName){
        self.$inject(target, fnName,
                function(){debugger;});
    };

    self.$define = function(fn){
        if(!Class.isFunction(fn)) return;
        (function(promise){
            fn.call(System.SANDBOX);
            promise.done();
        }).$queued();
    };

    Function.prototype.$extend = function(clazz){
        var proto;
        if(Class.isFunction(clazz)){
            proto = new (clazz)(); proto.constructor = clazz;
        }else if(clazz){
            proto = clazz;
        }
        this.prototype = proto;
        return this;
    };

    var extkeys = {
        __impls__:1, __super__:1, __hostf__:1,
        __timer__:1, __defined__:1};

    Function.prototype.$decorate = function(obj){
        var clazz = this;
        if(!obj) return null;
        if(!clazz.__defined__) new (clazz)();
        (function(e, k){
            if (!extkeys[k]){
                obj[k] = e;
            }
        }).$forEach(clazz.prototype);
        return obj;
    };

    Function.prototype.$implements = function(clazz){
        var proto = this.prototype, impls;
        impls = proto.__impls__ = [].concat(proto.__impls__||[]);
        (function(fn){
            if(Class.isFunction(fn)){
                impls.push(fn);
                fn.$decorate(proto);
            }
        }).$forEach(sliceArgs.call(arguments));
        return this;
    };

}).call(self.js);

js.lang.Class = function(){

    var Class = this, classes = {"js.lang.Class": this};

    /**
     * Define a package with specified name
     * 
     * @param {String} name The package name with form "org.jsvm"
     * 
     * @return {Object | Function}  
     */
    self.$package = function(name){
        var clazz = classes[name], names;
        if(clazz) return clazz;
        clazz = self, names = name.split(".");
        (function(v){
            var o = clazz[v];
            if(!Class.isObject(o)) o = (clazz[v] = {});
            clazz = o;
        }).$forEach(names);
        classes[name] = clazz;
        return clazz;
    };

    self.$import = function(className){
        var clazz = classes[className];
        if(clazz) return;
        (function(promise){
            _loadClass.call(this, className, promise.done);
        }).$queued(null, Class);
    };

    this.forName = function(className){
        var clazz = classes[className];
        return clazz;
    };

    var _loadClass = function(className, callback){
        var clazz;
        // from local storage, database or xhr
        console.log("load class: "+className);
        classes[className] = clazz;
        callback(clazz);
    };

    var _onreadscript = function(e){
        var script, head, xhr = e.getData(),
            code = xhr.responseText();
        xhr.close();

        script = document.createElement("script");
        head = document.getElementsByTagName("head")[0];
        script.type= "text/javascript";
        script.text = code;
        head.appendChild(script);
        head.removeChild(script);

    };

    this.loadScript = function(filePath, text){
        var b = !text;
        this.getResource(filePath, function(e){
            var xhr = e.getData();
            text = xhr.responseText();
            
        }, b);
        text = text || this.getResource(filePath, !this.isString(text));
        var script = document.createElement("script");
        var head = document.getElementsByTagName("head")[0];
        script.type= "text/javascript";
        script.text = text;
        head.appendChild(script);
        head.removeChild(script);
        
        if(b){
            this.packages.push(filePath);
        }
        
        return text;
    };

    /**
     * Return the content with the specified url
     *
     * @param {String} url, the url to load content
     * @param {Function} callback
     * @param {Boolean} nocache
     */
    this.getResource = function(url, callback, nocache){
        var xhr = J$VM.XHRPool.getXHR(true);
        xhr.setNoCache(nocache || false);
        xhr.onsuccess = xhr.ontimeout = xhr.onhttperr = callback;
        xhr.open("GET", url);
    };

    return this;

}.call(js.lang.Class);

