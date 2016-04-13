/**

  Copyright 2007-2016, The JSVM Project. 
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

    /**
     * 
     */
    thi$.uuid = function(){
        var uuid = this.__uuid__;
        if(!uuid){
            uuid = this.__uuid__ = Math.uuid(this.hashCode());
        }
        return uuid;
    };

    /**
     * 
     */
    thi$.hashCode = function(){
        var hash = this.__hash__;
        if(!hash){
            hash = this.__hash__ = Math.hash();
        }
        return hash;
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
    thi$.getObject = function(uuid){
        var ctx = objs[uuid];
        return ctx ? ctx.__self__ : null;
    };

    /**
     * 
     */
    thi$.linkContext = function(uuid){
        var ctx = objs[this.__uuid__];
        if(Class.isString(uuid) && uuid){
            ctx.__chain__ = uuid;
        }
    };

    /**
     * 
     */
    thi$.getContextAttr = function(name){
        var ctx = objs[this.__uuid__], val;
        if(ctx.hasOwnProperty(name)){
            return ctx[name];
        }else{
            ctx = this.getObject(ctx._chain__);
            return ctx ? ctx.getContextAttr(name) : null;
        }
    };

    /**
     * 
     */
    thi$.putContextAttr = function(name, value){
        var ctx = objs[this.__uuid__];
        if(name){
            ctx[name] = value;
        }
    };

    /**
     * 
     */
    thi$.setParent = function(parent){
        var ctx = objs[this.__uuid__];
        if(parent instanceof CLASS){
            this.__local__.parent = parent;    
            if(!ctx.__chain__){
                ctx.__chain__ = parent.uuid();
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
    thi$.destroy = function(){
        this.__local__ = null;
        objs[this.__uuid__] = null;
    };

    /**
     * 
     */
    thi$._init = function(def){
        if(arguments.length === 0) return;

        var uuid = this.__uuid__ = def.uuid || this.uuid(),
            ctx = objs[uuid] = (objs[uuid] || {});

        ctx.__self__ = this;
        this.linkContext(def.context);
        this.id = def.id;
        this.__local__ = {};
    };

    this._init.apply(this, arguments);

}.$extend(Object);

