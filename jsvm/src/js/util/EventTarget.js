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


