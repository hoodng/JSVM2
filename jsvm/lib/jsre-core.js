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


/**

  Copyright 2007-2015, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */

js.lang.Math = function(){
    var Class = js.lang.Class, D = (1<<16)+(1<<8)+1,
        CRCT = [0x00000000,0x77073096,0xEE0E612C,0x990951BA,
            0x076DC419,0x706AF48F,0xE963A535,0x9E6495A3,
            0x0EDB8832,0x79DCB8A4,0xE0D5E91E,0x97D2D988,
            0x09B64C2B,0x7EB17CBD,0xE7B82D07,0x90BF1D91,
            0x1DB71064,0x6AB020F2,0xF3B97148,0x84BE41DE,
            0x1ADAD47D,0x6DDDE4EB,0xF4D4B551,0x83D385C7,
            0x136C9856,0x646BA8C0,0xFD62F97A,0x8A65C9EC,
            0x14015C4F,0x63066CD9,0xFA0F3D63,0x8D080DF5,
            0x3B6E20C8,0x4C69105E,0xD56041E4,0xA2677172,
            0x3C03E4D1,0x4B04D447,0xD20D85FD,0xA50AB56B,
            0x35B5A8FA,0x42B2986C,0xDBBBC9D6,0xACBCF940,
            0x32D86CE3,0x45DF5C75,0xDCD60DCF,0xABD13D59,
            0x26D930AC,0x51DE003A,0xC8D75180,0xBFD06116,
            0x21B4F4B5,0x56B3C423,0xCFBA9599,0xB8BDA50F,
            0x2802B89E,0x5F058808,0xC60CD9B2,0xB10BE924,
            0x2F6F7C87,0x58684C11,0xC1611DAB,0xB6662D3D,
            0x76DC4190,0x01DB7106,0x98D220BC,0xEFD5102A,
            0x71B18589,0x06B6B51F,0x9FBFE4A5,0xE8B8D433,
            0x7807C9A2,0x0F00F934,0x9609A88E,0xE10E9818,
            0x7F6A0DBB,0x086D3D2D,0x91646C97,0xE6635C01,
            0x6B6B51F4,0x1C6C6162,0x856530D8,0xF262004E,
            0x6C0695ED,0x1B01A57B,0x8208F4C1,0xF50FC457,
            0x65B0D9C6,0x12B7E950,0x8BBEB8EA,0xFCB9887C,
            0x62DD1DDF,0x15DA2D49,0x8CD37CF3,0xFBD44C65,
            0x4DB26158,0x3AB551CE,0xA3BC0074,0xD4BB30E2,
            0x4ADFA541,0x3DD895D7,0xA4D1C46D,0xD3D6F4FB,
            0x4369E96A,0x346ED9FC,0xAD678846,0xDA60B8D0,
            0x44042D73,0x33031DE5,0xAA0A4C5F,0xDD0D7CC9,
            0x5005713C,0x270241AA,0xBE0B1010,0xC90C2086,
            0x5768B525,0x206F85B3,0xB966D409,0xCE61E49F,
            0x5EDEF90E,0x29D9C998,0xB0D09822,0xC7D7A8B4,
            0x59B33D17,0x2EB40D81,0xB7BD5C3B,0xC0BA6CAD,
            0xEDB88320,0x9ABFB3B6,0x03B6E20C,0x74B1D29A,
            0xEAD54739,0x9DD277AF,0x04DB2615,0x73DC1683,
            0xE3630B12,0x94643B84,0x0D6D6A3E,0x7A6A5AA8,
            0xE40ECF0B,0x9309FF9D,0x0A00AE27,0x7D079EB1,
            0xF00F9344,0x8708A3D2,0x1E01F268,0x6906C2FE,
            0xF762575D,0x806567CB,0x196C3671,0x6E6B06E7,
            0xFED41B76,0x89D32BE0,0x10DA7A5A,0x67DD4ACC,
            0xF9B9DF6F,0x8EBEEFF9,0x17B7BE43,0x60B08ED5,
            0xD6D6A3E8,0xA1D1937E,0x38D8C2C4,0x4FDFF252,
            0xD1BB67F1,0xA6BC5767,0x3FB506DD,0x48B2364B,
            0xD80D2BDA,0xAF0A1B4C,0x36034AF6,0x41047A60,
            0xDF60EFC3,0xA867DF55,0x316E8EEF,0x4669BE79,
            0xCB61B38C,0xBC66831A,0x256FD2A0,0x5268E236,
            0xCC0C7795,0xBB0B4703,0x220216B9,0x5505262F,
            0xC5BA3BBE,0xB2BD0B28,0x2BB45A92,0x5CB36A04,
            0xC2D7FFA7,0xB5D0CF31,0x2CD99E8B,0x5BDEAE1D,
            0x9B64C2B0,0xEC63F226,0x756AA39C,0x026D930A,
            0x9C0906A9,0xEB0E363F,0x72076785,0x05005713,
            0x95BF4A82,0xE2B87A14,0x7BB12BAE,0x0CB61B38,
            0x92D28E9B,0xE5D5BE0D,0x7CDCEFB7,0x0BDBDF21,
            0x86D3D2D4,0xF1D4E242,0x68DDB3F8,0x1FDA836E,
            0x81BE16CD,0xF6B9265B,0x6FB077E1,0x18B74777,
            0x88085AE6,0xFF0F6A70,0x66063BCA,0x11010B5C,
            0x8F659EFF,0xF862AE69,0x616BFFD3,0x166CCF45,
            0xA00AE278,0xD70DD2EE,0x4E048354,0x3903B3C2,
            0xA7672661,0xD06016F7,0x4969474D,0x3E6E77DB,
            0xAED16A4A,0xD9D65ADC,0x40DF0B66,0x37D83BF0,
            0xA9BCAE53,0xDEBB9EC5,0x47B2CF7F,0x30B5FFE9,
            0xBDBDF21C,0xCABAC28A,0x53B39330,0x24B4A3A6,
            0xBAD03605,0xCDD70693,0x54DE5729,0x23D967BF,
            0xB3667A2E,0xC4614AB8,0x5D681B02,0x2A6F2B94,
            0xB40BBE37,0xC30C8EA1,0x5A05DF1B,0x2D02EF8D];

    var last = (new Date()).getTime();

    this.uuid = function(hash){
        hash = hash || this.hash();
        return ["s", hash.toString(16)].join("");
    };

    this.hash = function(){
        var now = (new Date()).getTime();
        if(now <= last){
            now = last + D;
        }
        return (last = now);
    };

    this.crc32 = function(str){
        var crc = 0, c, i, len, n;

        if(!Class.isString(str)) return "0";
        
        crc = crc ^ (-1);
        i = 0; len = str.length;
        while(i < len){
            c = str.charCodeAt(i++);
            if(c <= 0x7f){
                crc = _crc(crc, c);
            }else if(c >= 0x80 && c <= 0x7fff){
                crc = _crc(crc, ((c >> 6) & 0x1f) | 0xc0);
                crc = _crc(crc, (c & 0x3f) | 0x80);
            }else{
                crc = _crc(crc, (c >> 12) | 0xe0);
                crc = _crc(crc, ((c >> 6) & 0x3f) | 0x80);
                crc = _crc(crc, (c & 0x3f) | 0x80);
            }
        }

        return ((crc ^ (-1)) >>> 0).toString(16);  
    };

    var _crc = function(crc, c){
        return (crc >>> 8) ^ CRCT[(crc ^ c) & 0xff];
    };

    return this;

}.call(Math);


/**

  Copyright 2007-2015, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */

js.lang.String = function(){

    var REGX_HTML_ENCODE = /"|&|'|<|>|[\x00-\x20]|[\x7F-\xFF]|[\u0100-\u2700]/g;

    var REGX_HTML_DECODE = /&\w+;|&#(\d+);|<br\/>/g;

    var REGX_REGEXP_METACHARS = /[\^\$\.\*\+\?\|\\\(\)\[\]\{\}]/g;

    var REGX_REGEXP_ESCAPEDMETACHARS = /\\([\^\$\.\*\+\?\|\\\(\)\[\]\{\}])/g;

    var HTML_DECODE = {
        "&lt;"  : "<",
        "&gt;"  : ">",
        "&amp;" : "&",
        "&nbsp;": " ",
        "&quot;": "\"",
        "&copy;": "©",
        "<br/>" : String.fromCharCode(0x0A)
        // Add more
    };

    var Class = js.lang.Class;

    this.encodeHtml  = function encodeHtml(s, nobreak, ignoreSpace){
        s = s || this.toString();
        var o;
        return (typeof s != "string") ? s :
            s.replace(REGX_HTML_ENCODE,
                function($0){
                    var c = $0.charCodeAt(0), r = ["&#"];
                    if(c == 0x0D && nobreak != true){
                        o = c;
                        return "<br/>";
                    }

                    if(c == 0x0A && nobreak != true){
                        return (o == 0x0D) ? "" : "<br/>";
                    }

                    // 0xA0 (160) doesn't belong to the ASCII. 
                    // Only 0x20 (32) is the ASCII of space.
                    // In fact, large than 127 should belong to UNICODE.
                    // So 0xA0 (160) isn't a english space.
                    // 
                    // For html span, the 0xA0 (160) will be converted
                    // as the "&nbsp;" by the browser.
                    if(c == 0x20 || c == 0xA0){
                        if(ignoreSpace !== true){
                            // Make the whitespace as "&nbsp;"
                            c = (c == 0x20) ? 0xA0 : c;
                        }else{
                            // Keep the ASCII whitespace to make the
                            // text string can be word-wrap by word.
                            c = (c == 0xA0) ? 0x20 : c;
                            return String.fromCharCode(c);
                        }
                    }

                    r.push(c); r.push(";");
                    return r.join("");
                });
    };

    this.decodeHtml = function decodeHtml(s, nobreak){
        s = (s != undefined) ? s : this.toString();
        return (typeof s != "string") ? s :
            s.replace(REGX_HTML_DECODE,
                function($0, $1){
                    var c = HTML_DECODE[$0];
                    if(c == undefined){
                        // Maybe is Entity Number
                        if(!isNaN($1)){
                            c = String.fromCharCode(
                                ($1 == 160) ? 32 : $1);
                        }else{
                            c = $0;
                        }
                    }
                    return c;
                });
    };

    /**
     * Escape regular expression's meta-characters as literal characters.
     */
    this.escapeRegExp = function escapeRegExp(){
        var str = this.toString();
        return str.replace(REGX_REGEXP_METACHARS,
            function($0){return "\\" + $0;});
    };

    this.unescapeRegExp = function unescapeRegExp(){
        var str = this.toString();
        return str.replace(REGX_REGEXP_ESCAPEDMETACHARS,
            function($0, ch){return ch;});
    };

    var REGX_TRIM = /(^\s*)|(\s*$)/g;
    this.trim = this.trim || function trim(){
        var str = this.toString();
        return str.replace(REGX_TRIM, "");
    };

    this.endsWith = this.endsWith || function endsWith(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };

    this.startsWith = this.startsWith || function startsWith(suffix) {
        return this.indexOf(suffix) === 0;
    };

    this.hashCode = this.hashCode || function hashCode(){
        var hash = this.__hash__, c, i, len;
        if(hash) return hash;

        hash = 0;
        for (i = 0, len=this.length; i < len; i++) {
            c = this.charCodeAt(i);
            hash = 31*hash + c;
            hash = hash & hash; // Convert to 32bit integer
        }
        hash = hash & 0x7fffffff;
        return (this.__hash__ = hash);
    };

    return String;

}.call(String.prototype);


/**

  Copyright 2007-2015, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */

js.lang.Object = function(def){

    var CLASS = js.lang.Object, thi$ = CLASS.prototype;
    if(CLASS.__defined__){
        this._init.apply(this, arguments);
        return;
    }
    var Class = js.lang.Class, objs = {};

    thi$.uuid = function(uuid){
        if(Class.isString(uuid) && uuid){
            this.__uuid__ = uuid;
        }else if(!this.__uuid__){
            this.__uuid__ = Math.uuid(this.hashCode());
        }
        return this.__uuid__;
    };

    thi$.hashCode = function(){
        if(!this.__hash__){
            this.__hash__ = Math.hash();
        }
        return this.__hash__;
    };

    thi$.Runtime = function(){
        this.getContextAttr("__runtime__");
    };

    thi$.getParent = function(){
        return this.parent;
    };

    thi$.getObject = function(uuid){
        var ctx = objs[uuid];
        return ctx ? ctx.__self__ : null;
    };

    thi$.linkContext = function(uuid){
        var ctx = objs[this.uuid()];
        if(uuid && Class.isString(uuid)){
            ctx.__chain__ = uuid;
        }
    };

    thi$.getContextAttr = function(name){
        var ctx = objs[this.uuid()], val;
        if(ctx.hasOwnProperty(name)){
            return ctx[name];
        }else{
            ctx = this.getObject(ctx._chain__);
            return ctx ? ctx.getContextAttr(name) : null;
        }
    };

    thi$.rmvContextAttr = function(name){
        var ctx = objs[this.uuid()];
        if(name) delete ctx[name];
    };

    thi$.putContextAttr = function(name, value){
        var ctx = objs[this.uuid()];
        if(name){
            ctx[name] = value;
        }
    };

    thi$.destroy = function(){
        this.__local__ = null;
        delete objs[this.uuid()];
    };

    thi$._init = function(def){
        if(arguments.length === 0) return;

        var uuid = this.uuid(def.uuid), ctx;
        ctx = objs[uuid] = (objs[uuid] || {});
        ctx.__self__ = this;
        this.linkContext(def.context);
        this.id = def.id;
        this.__local__ = {};
    };

    this._init.apply(this, arguments);

}.$extend(Object);


/**

  Copyright 2007-2015, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */

$package("js.util");

js.util.Event = function(type, data, source, target){

    var CLASS = js.util.Event, thi$ = CLASS.prototype;
    if(CLASS.__defined__){
        this._init.apply(this, arguments);
        return;
    }
    var Class = js.lang.Class;

    thi$.cancelBubble = function(){
        this.bubbleable = false;
    };

    thi$.cancelDefault = function(){
        this.defaultprc = false;
    };

    thi$._init = function(type, data, source, target){
        if(arguments.length === 0) return;

        this.type = type;
        this.data = data;
        this.source = source;
        this.target = target;

        this.bubbleable = true;
        this.defaultprc = true;

        this.timestamp = new Date();
    };

    this._init.apply(this, arguments);

};

(function(){
    var Class = js.lang.Class, Event = this,
        sliceArgs = Array.prototype.slice;

    this.FLAG = {
        EXCLUSIVE  : 0x01 << 0,
        CAPTURED   : 0x01 << 1,
        CUSTOMIZED : 0x01 << 2,

        check : function(f){
            var o = { exclusive:false,
                captured:false, customized:false };
            if(Class.isNumber(f)){
                o.exclusive  = (f & this.EXCLUSIVE) != 0;
                o.captured   = (f & this.CAPTURED)  != 0;
                o.customized = (f & this.CUSTOMIZED)!= 0;
            } else {
                o.exclusive = (f === true);
            }

            return o;
        }
    };

    this.attachEvent = function(target, eType, flag, thi$, handler){
        var fn, args, hs, check = this.FLAG.check(flag);

        args = sliceArgs.call(arguments, 5);
        fn = function(e){
            if(!(e instanceof Event)){
                e = new Event(e.type, e);
            }
            args.unshift(e);
            handler.apply(thi$, args);
        };
        fn.__thi$__  = thi$;
        fn.__hostf__ = handler;
        fn.__check__ = check;

        hs = target.__handlers__ = target.__handlers__ || {};
        hs = hs[eType] = hs[eType] || [];
        hs.push(fn);

        if(check.exclusive){
            target["on"+eType] = fn;
        }else{
            if(target.addEventListener){
                target.addEventListener(eType, fn, check.captured);
            }else{
                target.attachEvent("on"+eType, fn);
            }
        }
        return fn;
    };

    this.detachEvent = function(target, eType, flag, thi$, handler){
        var fn, hs, check;
        hs = target.__handlers__ = target.__handlers__ || {};
        hs = hs[eType] = hs[eType] || [];
        for(var i=0; i<hs.length; i++){
            fn = hs[i];
            if(handler && (fn.__thi$__ !== thi$ ||
                    fn.__hostf__ !== handler)) continue;

            check = fn.__check__;
            if(check.exclusive){
                target["on"+eType] = null;
            }else{
                if(target.removeEventListener){
                    target.removeListener(eType, fn, check.captured);
                }else{
                    target.detachEvent("on"+eType, fn);
                }
            }
            fn.__thi$__  = null;
            fn.__hostf__ = null;
            fn.__check__ = null;
            hs.splice(i, 1);
        }
    };

    this.W3C_EVT_LOAD          = "load";
    this.W3C_EVT_UNLOAD        = "unload";
    this.W3C_EVT_RESIZE        = "resize";
    
}).call(js.util.Event);
/**

  Copyright 2007-2015, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */

$package("js.util");

js.util.EventTarget = function(def){

    var CLASS = js.util.EventTarget, thi$ = CLASS.prototype;
    if(CLASS.__defined__){
        this._init.apply(this, arguments);
        return;
    }
    var Class = js.lang.Class, System = J$VM.System,
        Event = js.util.Event, sliceArgs = Array.prototype.slice;

    thi$.attachEvent = function(eType, flag, thi$, fn, args){
        var name = ["on", eType].join(""), handler;

        fn.ctx = { uuid: this.uuid(), thi$: thi$, func: fn,
            args: sliceArgs.call(arguments, 4)},

        handler = this[name] = (this[name] || []);
        handler.push(fn.ctx);
        switch(flag){
            case 0:
            case 1:
            Event.attachEvent(this, eType, flag, thi$, fn, args);
            break;
            case 2:
            var desk = this.getObject("desktop");
            Event.attachEvent(desk, eType, flag, thi$, fn, args);
            break;
            case 4:
            System.attachEvent(eType, flag, thi$, fn, args);
            break;
        }
    };

    thi$.detachEvent = function(eType, flag, thi$, fn){
        
    };

    thi$.dispatchEvent = function(e, channel, recvs){
        System.dispatchEvent(e, channel, recvs);
    };

    thi$.fireEvent = function(e, bubble){
        var handler = this["on"+e.type];

        switch(Class.typeOf(handler)){
            case "Function":
            handler.call(this, e);
            break;

            case "Array":
            _call.$forEach(handler, this, e);
            break;
        }

        if(bubble && e.bubbleable){
            var parent = this.getParent();
            if(parent && parent.fireEvent){
                parent.fireEvent.call(parent, e, bubble);
            }
        }
    };

    var _call = function(ctx, i, arrays, e){
        ctx.fn.apply(ctx.thi$, [e].concat(ctx.args));
    };

    thi$.canCapture = function(){
        if(Class.isHtmlElement(this.view)) return true;

        var b = this.def ? this.def.capture : false;
        if(b){
            var parent = this.getParent();
            b &= ((parent && parent.canCapture) ?
                    parent.canCapture() : false);
        }
        return b;
    };

    thi$.destroy = function(){
        $super(this);
    };

    thi$._init = function(def){
        if(arguments.length === 0) return;
        $super(this);
        
    };

    this._init.apply(this, arguments);

}.$extend(js.lang.Object);



/**

  Copyright 2007-2015, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */

$package("js.lang");

js.lang.System = function(){

    var Class = js.lang.Class, System = this, Event = js.util.Event;

    var _workerSystem = function(){
        return this;
    };

    var _browseSystem = function(){
        Event.attachEvent(self, Event.W3C_EVT_LOAD,
            0, this, _onload);
        Event.attachEvent(self, Event.W3C_EVT_UNLOAD,
            0, this, _onunload);
        return this;
    };

    var _onload = function(e){
        System.out.println(
            [J$VM.__product__, J$VM.__version__].join(" "));
        
    };

    var _onunload = function(e){
        System.out.println("J$VM unload...");
        try{
            self.document.innerHTML = "";
        }catch(x){}
    };

    return J$VM.isworker ? _workerSystem.call(this) :
        _browseSystem.call(this);

}.call(js.lang.System);


