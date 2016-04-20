/**

  Copyright 2007-2016, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */

$package("js.util");

js.util.Storage = function(){

    var Class = js.lang.Class, MemoryStorage = js.util.MemoryStorage;
    
    this.setItem = function(key, value){
        
        this.removeItem(key);
        
        if(!(this instanceof MemoryStorage)){
            switch(Class.typeOf(value)){
                case "Object":
                case "Array":
                value = JSON.stringify(value);
                break;
            }
            $super(this, key, value);
        }else{
            $super(this);
        }
        
    }.$override(this.setItem);

    this.getItem = function(key){
        var value = $super(this);
        try{
            value = JSON.parse(value);
        } catch (x) {
        }
        return value;
    }.$override(this.getItem);

    return this;
};

js.util.MemoryStorage = function(capacity){

    var CLASS = js.util.MemoryStorage, thi$ = CLASS.prototype;
    if(CLASS.__defined__){
        this._init.apply(this, arguments);
        return;
    }
    CLASS.__defined__ = "js.util.MemoryStorage";

    var Class = js.lang.Class;

    thi$.setItem = function(key, value){
        if(this.length >= this.capacity){
            _reduce.call(this);
        }

        var map = this._vals, keys = this._keys;
        if(!Class.hasKey(map, key)){
            keys.push(key);
        }
        map[key] = {key:key, count:1, data:value};
        this.length = keys.length;
        
    };
    
    thi$.getItem = function(key){
        var map = this._vals, keys = this._keys,
            ele = map[key], ret;

        if(ele){
            ele.count++;
            ret = ele.data;
        }
        return ret;
    };

    thi$.removeItem = function(key){
        var map = this._vals, keys = this._keys,
            ele = map[key], ret;
        if(ele){
            delete map[key];
            (function(v, i){
                if(v === key){
                    keys.splice(i, 1);
                    throw Class.BREAKLOOP;
                }
            }).$forEach(keys);
            this.length = keys.length;
        }
        return ret;
    };

    thi$.keys = function(){
        return this._keys;
    };

    thi$.key = function(index){
        return this._keys[index];
    };

    thi$.clear = function(){
        this._keys = [];
        this._vals = {};
        this.length = 0;
    };

    var _reduce = function(){
        var array = Class.valuesOf(this._vals).sort(
            function(a, b){return a.count - b.count;}
        ), len = Math.floor(this.capacity/10), tmp;

        len = len < 1 ? 1 : len;
        while(len > 0){
            tmp = array.shift();
            this.removeItem(tmp.key);
            len--;
        }
    };
     
    thi$._init = function(capacity){
        this.capacity = 
            Class.isNumber(capacity) ? capacity : 1024;
        
        this.clear();
    };

    this._init.apply(this, arguments);
    
}.$extend(js.lang.Object);

(function(){

    var _local, _session, _memory, _cache;
    
    this.local = function(){
        return _local ? _local :
            (_local = this.call(self.localStorage));
    };

    this.session = function(){
        return _session ? _session :
            (_session = this.call(self.sessionStorage));
    };

    this.memory = function(){
        return _memory ? _memory :
            (_memory = this.call(new js.util.MemoryStorage()))
    };

    this.classCache = function(){
        var storage = this;
        
        return _cache ? _cache : new (function(){
            storage.local(); storage.session(); storage.memory();
            
            this.setItem = function(key, value){
                try{
                    _local.setItem(key, value);
                } catch (ex1) {
                    try{
                        _session.setItem(key, value);
                    } catch (ex2) {
                        _memory.setItem(key, value);
                    }
                }
            };

            this.getItem = function(key){
                var value = _memory.getItem(key);
                if(!value){
                    value = _session.getItem(key);
                    if(!value){
                        value = _local.getItem(key);
                    }
                }
                return value;
            };
        })();
    };
    
}).call(js.util.Storage);

