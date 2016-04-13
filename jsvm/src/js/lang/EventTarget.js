/**

  Copyright 2007-2016, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */

js.lang.EventTarget = function(def){

    var CLASS = js.lang.EventTarget, thi$ = CLASS.prototype;
    if(CLASS.__defined__){
        this._init.apply(this, arguments);
        return;
    }
    
    var Class = js.lang.Class, System = J$VM.System,
        OBJ = new js.lang.Object(), Q = [], running, 
        eTable = {}; // {type:{uuid:[handler,...]}}

    /**
     * 
     */
    thi$.attachEvent = function(type, fn){
        var U = this.__local__, uuid = this.uuid(),
            map = eTable[type] = (eTable[type] || {}),
            handlers = map[uuid] = (map[uuid] || []);

        handlers.push(fn);

        U.eventHandlers[type] = handlers;
    };

    /**
     * 
     */
    thi$.detachEvent = function(type, fn){
        var uuid = this.uuid(), map = eTable[type],
            handlers = map ? map[uuid] : null;
        if(!handlers) return;

        for(var i=0, len=handlers.length; i<len; i++){
            if(handlers[i] === fn){
                handlers.splice(i, 1);
                break;
            }
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

        if(typeof (fn = this[["on",t].join("")]) === "function"){
            try{
                fn.call(this, e);    
            } catch (x) {
                System.err.println(x);
            }
        }
        
        if(handlers){
            for(i=0, len=handlers.length; i<len; i++){
                try{
                    handlers[i].call(this, e);
                } catch (x) {
                    System.err.println(x);
                }
            }
        }

        if(e.canBubble() &&
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

    /**
     * 
     */
    thi$.dispatchEvent = function(e){
        this.postMessage(e.getType(), e, [this.uuid()]);
    };

    thi$.postMessage = function(type, data, recvs, device){
        recvs = (Class.isArray(recvs) && recvs.length > 0) ?
            recvs : null;
        
        Q.push([type, data, recvs, device]);

        if(!running){
            running = true;
            _schedule.$while(function(){
                return Q.length > 0;
            });
        }
    };

    var _schedule = function(){
        var pack, type, data, recv, devi, msg, i, len,
            j, jen, map, handlers, uuid, target;
        
        pack = Q.shift();
        
        type = pack[0];
        data = pack[1];
        devi = pack[3];

        if(devi && devi.postMessage){
            msg = JSON.stringify([type, data]);
            if(J$VM.isworker){
                devi.postMessage(msg);
            }else{
                devi.postMessage(msg, "*");
            }
        }else{
            map = eTable[type];
            recv = pack[2] || Class.keys(map);
            for(i=0, len=recv.length; i<len; i++){
                uuid = recv[i];
                target = OBJ.getObject(uuid);
                handlers = map[uuid];
                if(handlers && (jen = handlers.length) > 0){
                    for(j=0; j<jen; j++){
                        handlers[j].$delay(1, target, data);
                    }
                }
            }
        }

        running = (Q.length > 0);
        
    };

    /**
     * 
     */
    thi$.destroy = function(){
        var uuid = this.uuid(), type,
            types = this.__local__.eventHandlers;
        
        for(type in types){
            eTable[type][uuid] = null;
        }
        
        $super(this);
        
    }.$override(this.destroy);

    /**
     * 
     */
    thi$._init = function(def){
        if(arguments.length === 0) return;
        
        $super(this);

        var U = this.__local__;
        U.disabledEvents = {};
        U.eventHandlers = {};
        
    }.$override(this._init);

    this._init.apply(this, arguments);

}.$extend(js.lang.Object);

