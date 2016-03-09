/**

  Copyright 2010-2011, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */

$package("js.util");

js.util.Promise = function(){

    var CLASS = js.util.Promise, thi$ = CLASS.prototype;
    if(CLASS.__defined__){
        this._init.apply(this, arguments);
        return;
    }
    CLASS.__defined__ = true;

    thi$._init = function(){
        
    };

    

    // Keep this at last line
    this._init.apply(this, arguments);    
};