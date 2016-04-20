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
js.net.HttpConnection = function(){

    var CLASS = js.net.HttpConnection, thi$ = CLASS.prototype;
    if(CLASS.__defined__){
        this._init.apply(this, arguments);
        return;
    }
    CLASS.__defined__ = "js.net.HttpConnection";

    var Class = js.lang.Class, System = J$VM.System,
        PV = {
            progids:["MSXML2.XMLHTTP.6.0",
                     "MSXML2.XMLHTTP",
                     "Microsoft.XMLHTTP"]
        };

    /**
     * 
     */
    thi$.contentType = function(){
        var xhr = this.xhr;
        return xhr ? xhr.contentType ||
            this.getResponseHeader("Content-Type") : null;
    };

    /**
     * 
     */
    thi$.getResponseHeader = function(key){
        var xhr = this.xhr;
        return xhr ? xhr.getResponseHeader(key) : null;
    };

    /**
     * 
     */
    thi$.response = function(){
        var xhr = this.xhr;
        return xhr ? xhr.response : null;
    };

    /**
     * 
     */
    thi$.responseText = function(){
        var xhr = this.xhr;
        return xhr ? xhr.responseText : null;
    };

    /**
     * 
     */
    thi$.responseXML = function(){
        var xhr = this.xhr;
        return xhr ? xhr.responseXML : null;
    };

    /**
     * 
     */
    thi$.responseJSON = function(){
        var text = this.responseText(), json = null;
        if(text){
            try{
                json = JSON.parse(text);
            } catch (x) {
            }
        }
        return json;
    };

    /**
     * 
     */
    thi$.status = function(){
        var xhr = this.xhr;
        return xhr ? xhr.status : -1;
    };

    /**
     * 
     */
    thi$.statusText = function(){
        var xhr = this.xhr;
        return xhr ? xhr.statusText : "";
    };

    /**
     * 
     */
    thi$.open = function(method, url, params, options, success, error){
        System.updateLastAccessTime();

        var xhr = this.xhr, query = makeQueryString(params),
            timeout, sync;

        options = options || {};
        timeout = options.timeout ||
            System.getProperty("j$vm_http_timeout", 6000000);
        sync = options.sync; 

        if(!sync){
            xhr.onreadystatechange =
                stateChanged.$bind(this, xhr, success, error);
        }

        _starTimer.$delay(timeout, this, xhr, error);

        xhr.open(method, url, !sync);
        xhr.setRequestHeader("Content-Type",
                             "application/x-www-form-urlencoded");
        
        query = query.join("");
        if(sync){
            xhr.send(query);
        }else{
            (function(){
                xhr.send(query);
            }).$delay(0);
        }
    };

    var stateChanged = function(e, xhr, success, error){
        if(xhr.isTimeout || !J$VM) return;

        success = success || this.onsuccess;
        error = error || this.onerror;
        
        switch(xhr.readyState){
            case 2:
            case 3:
            var status = 200;
            try{
                status = xhr.status;
            } catch (x) {
            }

            if(status != 200 && status !=304){
                _stopTimer.call(this, xhr);
                
                if(Class.isFunction(error)){
                    error.call(this, this);
                }
                this.close();
            }
            break;

            case 4:
            _stopTimer.call(this, xhr);
            
            switch(xhr.status){
                case 200:
                case 304:
                if(Class.isFunction(success)){
                    success.call(this, this);
                }
                this.close();
                break;
                
                default:
                if(Class.isFunction(error)){
                    error.call(this, this);
                }
                this.close();
            }
            break;
        }
    };

    /**
     * 
     */
    thi$.close = function(){
        _stopTimer.call(this, this.xhr);
        this.xhr = null;
    };

    var _starTimer = function(xhr, error){
        xhr.abort();
        xhr.isTimeout = true;        
        error = error || this.onerror;
        if(Class.isFunction(error)){
            error.call(this, this);
        }
    };

    var _stopTimer = function(xhr){
        _starTimer.$cancel();
        xhr.isTimeout = null;
    };

    var makeQueryString = function(params){
        var ret = [];
        if(!Class.isObject(params)) return ret;

        (function(v, k){
            ret.push(k,"=",v,"&");
        }).$forEach(params);

        ret.push("__=", J$VM.__version__);
        
        return ret;
    };
    
    var createXHR = function(){
        var xhr;
        if(self.XMLHttpRequest){
            xhr = new XMLHttpRequest();
        }else if(PV.progid){
            xhr = new ActiveObject(PV.progid);
        }else{
            (function(v){
                try{
                    xhr = new ActiveObject(v);
                    PV.progid = v;
                    throw Class.BREAKLOOP;
                } catch (x) {
                }
            }).$forEach(PV.progids);
        }
        return xhr;
    };

    thi$._init = function(){
        this.xhr = createXHR();
    };

    this._init.apply(this, arguments);
};

