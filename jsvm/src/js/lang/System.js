/**

  Copyright 2007-2015, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */

$package("js.lang");

js.lang.System = J$VM = function(env){

    var CLASS = js.lang.System, thi$ = CLASS.prototype;
    if(CLASS.__defined__){
        this._init.apply(this, arguments);
        return;
    }
    CLASS.__defined__ = "js.lang.System";
    
    var Class = js.lang.Class, System = this, Event = js.util.Event,
        URI = js.net.URI, isworker, os, props;
    
    /**
     * 
     */
    thi$.out = {println: function(s){os.info(s);}};

    /**
     * 
     */
    thi$.err = {println: function(s){os.error(s);}};

    /**
     * 
     */
    thi$.log = {println: function(s){
        if(this.logEnabled()) os.log(s);}};

    /**
     * 
     */
    thi$.logEnabled = function(){
        return this.getProperty("j$vm_log") === true;
    };

    /**
     * 
     */
    thi$.enableLogger = function(b){
        b = (b === undefined) || b;
        this.setProperty("j$vm_log", b);
        J$VM.sessnStorage.setItem("j$vm_log", b);
        return ["J$VM logger enabled is ", b].join("");
    };
    
    /**
     * 
     */
    thi$.hasProperty = function(key){
        return Class.hasKey(props, key);
    };

    /**
     * 
     */
    thi$.getProperty = function(key, defValue){
        return this.hasProperty(key) ?
            props[key] || defValue : defValue;
    };

    /**
     * 
     */
    thi$.setProperty = function(key, value){
        var pre = null;
        if(key){
            pre = props[key];
            props[key] = value;
        }
        return pre;
    };

    /**
     * 
     */
    thi$.objectCopy = function(src, des, deep, unmerge){
        switch(Class.typeOf(src)){
            case "Object":
            des = des || {};
            Math.forObject(src, function(v, k){
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

    /**
     * 
     */
    thi$.arrayCopy = function(src, srcIdx, des, desIdx, length, deep){
        var len = src.length - srcIdx;
        length = Class.isNumber(length) ?
            ((length > len) ? len:length) : len;
        des = des || [];
        Math.forArray(src, function(v, i){
            if(i < srcIdx) return;
            if(i > srcIdx + length -1) throw Class.BREAKLOOP;
            des[desIdx+i-srcIdx] = (!deep || !Class.isObject(v)) ? v :
                this.objectCopy(v, null, deep);
        }, this);
        return des;
    };
    
    var _onload = function(e){
        System.out.println(
            [J$VM.__product__, J$VM.__version__, "loading..."].join(" "));

        var U = this.__local__;
        saveUSize(U);
        
        if(self !== self.parent){
            System.out.println("Handshake with outer J$VM.");
            this.postMessage(Event.J$VM_HANDSHAKE,null,null,self.parent);
        }
        
    };

    var _unload = function(e){
        Event.detachEvent(self, "message", _onmessage, this);

        if(!isworker){
            Event.attachEvent(self, "load",   _onload, this);
            Event.attachEvent(self, "unload", _unload, this);
            Event.attachEvent(self, "resize", _resize, this);
            
            self.document.innerHTML = "";
        }

        System.out.println([J$VM.__product__, "unload."].join(" "));
    };

    var _resize = function(e){
        var U = this.__local__;
        if(self.innerWidth != U.userW ||
           self.innerHeight || U.userH){
            saveUSize(U);
            e.setType(Event.J$VM_RESIZE);
            e.setData({width:U.userW, height:U.userH});
            this.dispatchEvent(e);
        }
    };

    var saveUSize = function(U){
        U.userW = self.innerWidth;
        U.userH = self.innerHeight;
    };

    var _onmessage = function(e){
        var _e = e._event, msg;

        if(self === _e.source) return;

        try{
            msg = JSON.parse(_e.data)
        } catch (x) {
            return;
        }

        if(Class.isArray(msg) && msg[0] === Event.J$VM_MSG){
            msg = msg[1];
            e.setType(msg.type);
            e.setData(msg.data);
            this.dispatchEvent(e);
        }
    };
    
    var _onhandshake = function(e){
        var source = e._event.source, ele;
        if(source !== self.parent){
            ele = source.frameElement;
            ele.id = Math.uuid(ele);
            ele.setAttribute("jsvm_embedded","true");
            System.out.println("Handshake with inner J$VM "+ele.id);
            this.postMessage(Event.J$VM_HANDSHAKE,null,null,ele.id);
        }else{
            this.isEmbedded = true;
            System.out.println("This J$VM is embedded.");
        }
    };
    
    var _initWorker = function(){
        os = new function(){
            var type = Event.J$VM_MSG,
                post = self.postMessage,
                msg = function(t, s){
                    return JSON.stringify(
                        [type, {type: t, data:s}]);
                };
            this.info = function(s){post(msg("-j$vm-inf", s));};
            this.error= function(s){post(msg("-j$vm-err", s));};
            this.log  = function(s){post(msg("-j$vm-log", s));};
        }();

        var A = self.location, uri, crs;
        uri = props.j$vm_uri = new URI(A.protocol, A.username, A.password,
                                       A.hostname, A.port, A.pathname,
                                       A.search, A.hash, A.href);
        crs = props.j$vm_crs = "../../../";
        props.j$vm_home = [uri.uriPath(), crs].join("");
        props.j$vm_classpath = [""];
    };

    var _initBrowser = function(){
        os = self.console || {
            info: function(s){},
            error: function(s){},
            log: function(s){}
        };

        var stag = document.getElementById("j$vm"), uri, crs, cp;
        if(stag){
            uri = props.j$vm_uri = URI.parse(
                stag.src || stag.getAttribute("crs"));
            crs = props.j$vm_crs = stag.getAttribute("crs");
            props.j$vm_home = crs.startsWith("http") ? crs :
                URI.makeURIString(uri.uriPath(), crs);
            
            cp = stag.getAttribute("classpath");
            props.j$vm_classpath = cp ? cp.split(";"):[""];
        }

        var storage = js.util.Storage;
        J$VM.localStorage = storage.local();
        J$VM.sessnStorage = storage.session();
        J$VM.classesCache = storage.classCache();
        System.enableLogger(J$VM.sessnStorage.getItem("j$vm_log")
                          || false);
        J$VM.enableLogger = function(){
            return System.enableLogger(true);
        };
        J$VM.disableLogger = function(){
            return System.enableLogger(false);
        };
        
        Event.attachEvent(self, "load",   _onload, this);
        Event.attachEvent(self, "unload", _unload, this);
        Event.attachEvent(self, "resize", _resize, this);
        Event.attachEvent(self, "message", _onmessage, this);
        
        this.attachEvent(Event.J$VM_HANDSHAKE, _onhandshake);        
    };
    
    thi$._init = function(env){
        if(J$VM.System) return;

        $super(this, {uuid: "__system__"});

        self.__uuid__ = this.uuid();
        
        props = env || {};
        
        if((J$VM.isworker = !(self.document))){
            _initWorker.call(this);
        }else{
            _initBrowser.call(this);
        }
        
    }.$override(this._init);
    

    this._init.apply(this, arguments);
    
}.$extend(js.util.EventTarget);

(function(){

    this.__product__ = "J$VM";
    this.__version__ = "1.0.";
    
    this.env = {};
    
    this.System = new js.lang.System(this.env);
    
}).call(J$VM);

