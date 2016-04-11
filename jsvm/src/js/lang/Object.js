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

    thi$.getRuntime = function(){
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

