/**

  Copyright 2007-2016, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */

self.js = self.js || {};

(function(){

    var TYPES = [
        "Null", "Undefined","Function", "Object",
        "Array", "Boolean", "Number","String","Date"],

        lang = js.lang = {Class:function(){}},
        Class = lang.Class, Func = Function.prototype,
        SANDBOX = Class.SANDBOX = {name:"j$vm-sandbox"},
        BREAKLOOP = Class.BREAKLOOP = "break-loop",
        sliceArgs = Array.prototype.slice,
        typeString= Object.prototype.toString,
        hasKey = Object.prototype.hasOwnProperty;
    
    (function(){
        var REGX_TRIM = /(^\s*)|(\s*$)/g;
        
        this.trim = this.trim || function(){
            return this.toString().replace(REGX_TRIM, "");
        };

        this.startsWith = this.startsWith || function(s){
            return this.indexOf(s) === 0;
        };

        this.endsWith = this.endsWith || function(s){
            return this.indexOf(s, this.length - s.length) !== -1;
        };
        
    }).call(String.prototype);
    
    /**
     * 
     */
    Class.typeOf = function(x, type){
        var s = typeString.call(x);
        s = s.substring(8, s.length-1);
        return arguments.length > 1 ? s === type : s;
    };

    /**
     * 
     */
    Class.sliceArgs = function(args, n){
        return sliceArgs.call(args, n || 0);
    };

    /**
     * 
     */
    Class.hasKey = function(obj, key){
        return hasKey.call(obj, key);
    };

    /**
     * 
     */
    Class.keysOf = function(obj){
        var keys = [];
        (function(v, k){keys.push(k)}).$forEach(obj);
        return keys;
    };
    
    /**
     * 
     */
    Class.entrySet = function(obj){
        var keys = [];
        (function(v, k){
            keys.push({key:k, value:v});}).$forEach(obj);
        return keys;
    };
    
    /**
     * 
     */
    Math.forArray = function(set, fn, thi$, args){
        thi$ = thi$ || SANDBOX;
        args = sliceArgs.call(arguments, 3);
        for(var i=0, len=set.length; i<len; i++){
            try{
                fn.apply(thi$, [set[i], i, set].concat(args));
            } catch (x) {
                if(x === BREAKLOOP) break;
                throw x;
            }
        }
    };

    /**
     * 
     */
    Math.forObject = function(set, fn, thi$, args){
        thi$ = thi$ || SANDBOX;
        args = sliceArgs.call(arguments, 3);
        for(var i in set){
            if(!hasKey.call(set, i)) continue;
            try{
                fn.apply(thi$, [set[i], i, set].concat(args));
            } catch (x) {
                if(x === BREAKLOOP) break;
                throw x;
            }
        }
    };

    /**
     * 
     */
    Func.$forEach = function(set, thi$, args){
        if(!set) return;
        Math[["for",null].join(Class.typeOf(set))].apply(
            SANDBOX, [set, this].concat(sliceArgs.call(arguments,1)));
    };

    /**
     * 
     */
    (function(type){
        Class[["is",null].join(type)] = function(x){
            return this.typeOf(x, type);
        };
    }).$forEach(TYPES);

    
    /**
     * 
     */
    var last = (new Date()).getTime(), DIFF = (1<<16)+(1<<8)+1;    
    Math.hash = function(obj){
        var now = obj ? obj.__hash__ : null;
        if(!now){
            now = (new Date()).getTime();
            if(now <= last){
                now = last + DIFF;
            }
            if(obj){
                obj.__hash__ = now;
            }
            last = now;
        }
        return now;
    };

    /**
     * 
     */
    Math.uuid = function(obj){
        var id = obj ? obj.__uuid__ : null;
        if(!id){
            id = [null, this.hash(obj).toString(16)].join("s");
            if(obj){
                obj.__uuid__ = id;
            }
        }
        return id;
    };
    
    /**
     * 
     */
    Func.$bind = function(thi$, args){
        var fn = this;
        args = sliceArgs.call(arguments, 1);
        return function(){
            return fn.apply(
                thi$,
                sliceArgs.call(arguments).concat(args));
        };
    };

    /**
     * 
     */
    Func.$override = function(fn){
        this.__super__ = fn;
        return this;
    };

    /**
     * 
     */
    self.$super = function(thi$, args){
        var caller = self.$super.caller;
        args = arguments.length > 1 ?
            sliceArgs.call(arguments, 1):
            sliceArgs.call(caller.arguments);
        return caller.__super__.apply(thi$, args);
    };

    /**
     * 
     */
    var tTable = {}; //{uuid:[timer1,....]}
    Func.$delay = function(timeout, thi$, args){
        var fn = this, uuid = Math.uuid(fn), timer,
            ts = tTable[uuid] = (tTable[uuid] || []);

        thi$ = thi$ || SANDBOX;
        args = sliceArgs.call(arguments, 2);
        timer = self.setTimeout(function(){
            fn.$cancel(timer);
            fn.apply(thi$, args);
        }, timeout);
        
        ts.push(timer);
        
        return timer;
    };

    /**
     * 
     */
    Func.$cancel = function(timer){
        var fn = this, uuid = Math.uuid(fn),
            ts = tTable[uuid] = (tTable[uuid] || []);

        timer = arguments.length == 0 ? ts.shift() : timer;
        (function(t, i){
            if( t === timer){
                ts.splice(i, 1);
                throw BREAKLOOP;
            }
        }).$forEach(ts)

        if(ts.length === 0){
            delete tTable[uuid];
        }
    };

    /**
     * 
     */
    Func.$loop = function(testP, thi$, args){
        var fn = this;

        thi$ = thi$ || SANDBOX;
        args = sliceArgs.call(arguments, 3);
        if(testP.apply(thi$, args)){
            fn.apply(thi$, args);
            (function(){
                fn.$loop.apply(fn, [testP, thi$].concat(args));
            }).$delay(0);
        }
    };

    /**
     * 
     */
    Func.$queue = function(callback, thi$, args){
        _queue.apply(SANDBOX,[this].concat(
            sliceArgs.call(arguments)))
    };

    /**
     * 
     */
    Func.$extend = function(clazz){
        var proto;
        if(Class.isFunction(clazz)){
            proto = new (clazz)(); proto.constructor = clazz;
        }else if(clazz){
            proto = clazz;
        }
        this.prototype = proto;
        return this;
    };

    /**
     * 
     */
    Func.$decorate = function(obj, replace){
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

    /**
     * 
     */
    Func.$implements = function(clazz){
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
    
    /**
     * 
     */
    var tasks = [], running;
    var _queue = function(fn, callback, thi$, args){
        /*
         * state: 0:pendding, 1:doing, 2:done 
         */
        var task = {state:0, fn: fn, data: null},
            curTask = tasks.length > 0 ?
            tasks[tasks.length-1] : null;

        fn.ctx = {thi$: thi$ || SANDBOX,
                  callback: callback,
                  args:sliceArgs.call(arguments, 3)}

        if(!curTask || curTask.state === 1){
            tasks.push(task);
            running = false;
        }else{
            curTask.tasks = curTask.tasks || [];
            curTask.tasks.push(task);
        }

        if(!running){
            running = true;
            _run.$delay(0);
        }
    };

    var _run = function(){
        var fn, ctx, promise, 
            curTask = tasks.length > 0 ?
            tasks[tasks.length-1] : null;
        
        if(!curTask){
            running = false;
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
        }
    };

    var _done = function(data){
        var curTask = tasks[tasks.length-1];
        curTask.state = 2;
        curTask.data = data;
        _run.call(this);
    };

})();

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
            o = !o ? (clazz[v] = {}) : o;
            clazz = o;
        }).$forEach(names);
        classes[name] = clazz;
        return clazz;
    };
    
    /**
     * 
     */
    self.$import = function(className){
        var clazz = _checkClass(className);
        if(clazz) return;
        
        (function(promise){
            _loadClass.call(this, className, promise.done);
        }).$queue(null, Class);
    };

    /**
     * 
     */
    self.$define = function(fn){
        if(!Class.isFunction(fn)) return;
        
        (function(promise){
            fn.call(Class.SANDBOX);
            promise.done();
        }).$queue();
    };

    var _checkClass = function(className){
        var clazz = classes[className], names;
        if(!clazz){
            clazz = self, names = className.split(".");
            (function(v){
                clazz = clazz[v];
                if(!clazz){
                    throw Class.BREAKLOOP;
                }
            }).$forEach(names);

            if(clazz){
                classes[className] = clazz;
            }
        }
        return clazz;
    };

    /**
     * 
     */
    this.forName = function(className){
        var clazz = _checkClass(className);
        if(!clazz){
            _loadClass.call(this, className);
        }
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

