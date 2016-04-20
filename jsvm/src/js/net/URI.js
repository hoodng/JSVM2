/**

  Copyright 2007-2016, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */

$package("js.net");

/**
 * 
 */
js.net.URI = function(){

    var CLASS = js.net.URI, thi$ = CLASS.prototype;
    if(CLASS.__defined__){
        this._init.apply(this, arguments);
        return;
    }
    CLASS.__defined__ = "js.net.URI";

    var Class = js.lang.Class,
        keys = ["protocol", "username", "password",
                "hostname","port", "path", "query",
                "fragment", "origin"];

    /**
     * 
     */
    thi$.uriPath = function(){
        return [this.protocol, this.protocol ? "//": null,
                this.username, this.password ? ":" : null,
                this.password, this.username ? "@" : null,
                this.hostname, this.port ? ":" : null,
                this.port, this.path].join("");
    };
    
    thi$.toString = function(){
        return [this.uriPath(), this.file, this.query,
                this.fragment].join("");
    };
    
    var _assign = function(v, i){
        this[keys[i]] = v;
    };
    
    thi$._init = function(){
        if(arguments.length === 0) return;
        
        _assign.$forEach(Class.sliceArgs(arguments), this);

        var path = this.path;
        if(path){
            var p = path.lastIndexOf("/");
            if(p != -1){
                this.file = path.substring(p+1);
                this.path = path.substring(0, p+1);
            }
        }

        if(this.query){
            this.params = CLASS.parseParams(this.query.substring(1));
        }
    };

    this._init.apply(this, arguments);
};

(function(){

    var A = self.document ? document.createElement("A") : {},
        Class = js.lang.Class, URI = this;

    /**
     * 
     */
    this.parse = function(uri){
        if(!uri) return null;

        A.href = decodeURI(uri);
        return new URI(A.protocol, A.username, A.password,
                       A.hostname, A.port, A.pathname,
                       A.search, A.hash, A.href);
    };

    /**
     * 
     */
    this.parseParams = function(query){
        var params = {};
        if(query){
            query = query.split("&");
            _split.$forEach(query, params);
        }
        return params;
    };

    var _split = function(v){
        v = v.trim().split("=");
        if(v.length === 2){
            this[v[0].trim()] = v[1].trim();
        }
    };

    /**
     * 
     */
    this.makeURIString = function(parent, path){
        A.href = Class.sliceArgs(arguments).join("");
        return A.href;
    };
    
}).call(js.net.URI);
