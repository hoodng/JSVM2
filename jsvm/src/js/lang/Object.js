/**

  Copyright 2007-2016, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */

$package("js.lang");

/**
 * 
 */
js.lang.Object = function(){

    var CLASS = js.lang.Object, thi$ = CLASS.prototype;
    if(CLASS.__defined__){
        return;
    }
    CLASS.__defined__ = "js.lang.Object";

    /**
     * 
     */
    thi$.uuid = function(){
        return Math.uuid(this);
    };

    /**
     * 
     */
    thi$.hashCode = function(){
        return Math.hash(this);
    };
    
    /**
     * 
     */
    thi$.toString = function(){
        return ["Object@",this.uuid()].join("");
    };

}.$extend(Object);

$package("js.util");

/**
 * 
 */
js.util.EventTarget = function(def){

    var CLASS = js.util.EventTarget, thi$ = CLASS.prototype;
    if(CLASS.__defined__){
        this._init.apply(this, arguments);
        return;
    }
    CLASS.__defined__ = "js.util.EventTarget";
    
    var Class = js.lang.Class, Event = js.util.Event,
        J$VMMSG = Event.J$VM_MSG,
        oTable = {}, // {uuid:{}} 
        eTable = {}, // {type:{uuid:[handler,...]}}
        Q = [], running;
    
    /**
     * 
     */
    thi$.attachEvent = function(type, fn, listener, args){
        var uuid = this.uuid(),
            map = eTable[type] = (eTable[type] || {}),
            handlers = map[uuid] = (map[uuid] || []);

        args = Class.sliceArgs(arguments, 3);
        handlers.push([fn, listener, args]);
    };

    /**
     * 
     */
    thi$.detachEvent = function(type, fn){
        var uuid = this.uuid(), map = eTable[type],
            handlers = map ? map[uuid] : null;

        (function(h, i){
            if(h[0] === fn){
                handlers.splice(i, 1);
                throw Class.BREAKLOOP;
            }
        }).$forEach(handlers);

        if(!handlers || handlers.length === 0){
            delete map[uuid];
        }
    };

    /**
     * 
     */
    thi$.disableEvents = function(types){
        var map = this.__local__.disabledEvents, i, len;
        types = types || [];
        for(i=0, len=types.length; i<len; i++){
            map[types[i]] = 1;
        }
    };

    /**
     * 
     */
    thi$.enableEvents = function(types){
        var map = this.__local__.disabledEvents, i, len;
        types = types || [];
        for(i=0, len=types.length; i<len; i++){
            map[types[i]] = null;
        }
    };
    
    /**
     * 
     */
    thi$.fireEvent = function(e){
        var uuid = this.uuid(), type = e.getType(), target,
            t = _checkType.call(this, type), map = eTable[t],
            handlers = map ? map[uuid] : null, fn, i, len;

        if(Class.isFunction(fn = this[["on",null].join(t)])){
            try{
                fn.call(this, e);    
            } catch (x) {
                J$VM.System.err.println(x);
            }
        }

        (function(h){
            fn = h[0];
            try{
                fn.apply((h[1]||this), [e].concat(h[2]));
            } catch (x) {
                J$VM.System.err.println(x);
            }
            
        }).$forEach(handlers);

        e._last = new Date();
        
        if(e._bubble &&
           (target = _findTarget.call(this, type))){
            
            target.fireEvent(e);
        }
    };

    var _checkType = function(type){
        return this.__local__.disabledEvents[type] ? null : type;
    };

    var _findTarget = function(type){
        var parent = this.getParent(), map, handlers;
        while(parent){
            map = eTable[_checkType.call(parent, type)];
            handlers = map ? map[parent.uuid()] : null;
            if(handlers && handlers.length > 0){
                break;
            }else{
                parent = parent.getParent();
            }
        }
        return parent;
    };

    var getTarget = function(uuid){
        var ctx = oTable[uuid];
        return ctx ? ctx["."] : null;
    };    

    /**
     * 
     */
    thi$.dispatchEvent = function(e){
        e.cancelBubble();
        this.postMessage(e.getType(), e);
    };

    /**
     * 
     */
    thi$.postMessage = function(type, data, recvs, device){
        recvs = (Class.isArray(recvs) && recvs.length > 0) ?
            recvs : null;
        
        Q.push([type, data, recvs, device]);

        if(!running){
            running = true;
            schedule.$delay(0);
        }
    };

    /**
     * 
     */
    thi$.sendMessage = function(type, data, recvs, device){
        dispatch([type, data, recvs, device]);
    };

    var schedule = function(){
        dispatch(Q.shift());

        if((running = (Q.length > 0))){
            schedule.$delay(0);
        }
    };

    var dispatch = function(pack){
        var type, data, recv, devi, msg,
            map, target, fn;
        
        type = pack[0];
        data = pack[1];
        devi = pack[3];

        if(devi){
            if(Class.isString(devi)){
                devi = self.document.getElementById(devi);
                devi = devi ? devi.contentWindow : self.parent;
            }
            msg = JSON.stringify([J$VMMSG, {type:type, data:data}]);
            if(J$VM.isworker){
                devi.postMessage(msg);
            }else{
                devi.postMessage(msg, "*");
            }
        }else{
            map = eTable[type];
            recv = pack[2] || Class.keysOf(map);
            (function(uuid){
                target = getTarget(uuid);
                if(!target) {
                    delete map[uuid];
                    return;
                }

                if(data instanceof Event){
                    target.fireEvent(data);
                }else{
                    (function(h){
                        fn = h[0];
                        target = h[1] || target;
                        fn.apply(target,[data].concat(h[2]));
                    }).$forEach(map[uuid]);
                }
            }).$forEach(recv);
        }
    };

    /**
     * 
     */
    thi$.setParent = function(parent){
        if(parent instanceof CLASS){
            this.__local__.parent = parent;    
            if(!this.linkContext()){
                this.linkContext(parent.uuid());
            }
        }
    };

    /**
     * 
     */
    thi$.getParent = function(){
        return this.__local__.parent;
    };

    /**
     * 
     */
    thi$.linkContext = function(uuid){
        var ctx = this.getContext();
        return oTable[((uuid) ? (ctx[".."] = uuid) : ctx[".."])];
    };

    /**
     * 
     */
    thi$.getContext = function(){
        return oTable[this.__uuid__];
    };

    /**
     * 
     */
    thi$.getContextAttr = function(name){
        var ctx = this.getContext();

        if(ctx.hasOwnProperty(name)){
            return ctx[name];
        }else{
            ctx = this.getEventTarget(ctx[".."]);
            return ctx ? ctx.getContextAttr(name) : null;
        }
    };

    /**
     * 
     */
    thi$.putContextAttr = function(name, value){
        var ctx = this.getContext();
        
        if(name){
            ctx[name] = value;
        }
    };
    
    /**
     * 
     */
    thi$.getEventTarget = function(uuid){
        return getTarget(uuid);
    };

    /**
     * 
     */
    thi$.getRuntime = function(){
        this.getContextAttr("__runtime__");
    };
    
    /**
     * 
     */
    thi$.destroy = function(){
        var uuid = this.__uuid__, ctx = oTable[uuid];

        ctx["."] = null;
        oTable[uuid] = null;
        this.__locale__ = null;
        
    };
    
    /**
     * 
     */
    thi$._init = function(def){
        if(arguments.length === 0) return;

        var uuid = this.__uuid__ = (def.uuid || this.uuid()),
            ctx = oTable[uuid] = {
                "." : this,
                ".." : def.context
            };

        this.__local__= {
            disabledEvents:{}
        };
        
    };

    this._init.apply(this, arguments);

}.$extend(js.lang.Object);

/**
 * 
 */
js.util.Event = function(type, data, source, canBubble){

    var CLASS = js.util.Event, thi$ = CLASS.prototype;
    if(CLASS.__defined__){
        this._init.apply(this, arguments);
        return;
    }
    CLASS.__defined__ = "js.util.Event";
    
    var Class = js.lang.Class;

    /**
     * 
     */
    thi$.getType = function(){
        return this._type;
    };

    /**
     * 
     */
    thi$.setType = function(type){
        this._type = type;
    };

    /**
     * 
     */
    thi$.getData = function(){
        return this._data;
    };

    /**
     * 
     */
    thi$.setData = function(data){
        this._data = data;
    };

    /**
     * 
     */
    thi$.getEventSource = function(){
        return this._source;
    };

    /**
     * 
     */
    thi$.setEventSource = function(src){
        if(!(src instanceof js.util.EventTarget))
            throw "The target must be an instance of EventTarget";

        this._source = src;
    };

    /**
     * 
     */
    thi$.cancelBubble = function(){
        var e = this._event;
        if(e){
            if(e.stopPropagation){
                e.stopPropagation();
            }else{
                try{// For IE
                    e.cancelBubble = true;
                } catch (x) {

                }
            }
        }
        return (this._bubble = false);
    };

    /**
     * 
     */
    thi$.cancelDefault = function(){
        var e = this._event;
        if(e){
            if(e.preventDefault){
                e.preventDefault();
            }else{
                try{// For IE
                    e.returnValue = false;
                } catch (x) {

                }
            }
        }
        return (this._default = false);
    };

    /**
     * 
     */
    thi$.getTimeStamp = function(){
        return this._time;
    };

    var BTNS = [1, 4, 2, 8, 16],
        DomE = !J$VM.isworker? self.document.documentElement:null,
        Body = !J$VM.isworker? self.document.body : null;
    
    var _initRealEvent = function(e){
        this._type = e.type;
        this._data = this._event = e;

        if(e.altKey !== undefined){
            this.altKey = e.altKey;
            this.ctrlKey = e.ctrlKey;
            this.shiftKey = e.shiftKey;
            this.metaKey = e.metaKey;

            this.keyCode = e.which || e.keyCode;
        }

        if(e.pageX !== undefined || e.clientX !== undefined){
            // Left:1, Right:2, Middle:4
            this.button = e.buttons ? e.buttons :
                (!J$VM.ie && e.button >=0) ? BTNS[e.button]:e.button;

            this.pointerId = e.pointerId || 0;

            this.absX = !isNaN(e.pageX) ? e.pageX :
                (e.clientX + DomE.scrollLeft - Body.clientLeft);
            this.absY = !isNaN(e.pageY) ? e.pageY :
                (e.clientY + DomE.scrollTop - Body.clientTop);
            this.eventXY = function(){
                return {x: this.absX, y:this.absY};};
        }

        this.srcElement = e.srcElement || e.target;
        // EventSource
    };

    var _initJsvmEvent = function(type, data, source, canBubble){
        this._type = type;
        this._data = data;
        this._source = source;
        this._bubble = (canBubble === undefined) || canBubble;
    };
    
    /**
     * 
     */
    thi$._init = function(type, data, source, canBubble){
        if(arguments.length === 0) return;

        if(!Class.isString(type)){
            _initRealEvent.call(this, type || self.event);
        }else{
            _initJsvmEvent.apply(this, arguments);
        }

        this._default = true;
        this._time = new Date();
    };

    this._init.apply(this, arguments);

}.$extend(js.lang.Object);

(function(){

    var CLASS = this, Class = js.lang.Class,
        agents = {}; // {uuid:agent}

    var hash = function(obj){
        return obj ? Math.hash(obj) : 0;
    };

    var uuid = function(e, t, f, o){
        return [t, hash(e), hash(f), hash(o)].join("");
    };
    
    /**
     * 
     */
    this.attachEvent = function(ele, type, fn, listener, args){
        var id = uuid(ele, type, fn, listener), agent;
        if(agents[id]) return;

        args = Class.sliceArgs(arguments, 4);
        agent = agents[id] = function(){
            return function(e){
                fn.apply(listener, [new CLASS(e)].concat(args));
            };
        }();

        if(ele.addEventListener){
            ele.addEventListener(type, agent, false);
        }else{
            ele.attachEvent(["on",type].join(""), agent);
        }
    };

    /**
     * 
     */
    this.detachEvent = function(ele, type, fn, listener){
        var id = uuid(ele, type, fn, listener), agent;
        if(!(agent = agents[id])) return;

        if(ele.removeEventListener){
            ele.removeEventListener(type, agent, false);
        }else{
            ele.detachEvent(["on",type].join(""), agent);
        }

        delete agents[id];
    };

    this.J$VM_MSG = "-j$vm-message";
    this.J$VM_HANDSHAKE = "-j$vm-handshake";
    this.J$VM_RESIZE = "-j$vm-resize";
    
}).call(js.util.Event);

