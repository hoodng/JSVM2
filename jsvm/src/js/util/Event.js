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