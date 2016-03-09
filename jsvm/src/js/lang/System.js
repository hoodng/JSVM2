/**

  Copyright 2007-2015, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */

$package("js.lang");

js.lang.System = function(){

    var Class = js.lang.Class, System = this, Event = js.util.Event;

    var _workerSystem = function(){
        return this;
    };

    var _browseSystem = function(){
        Event.attachEvent(self, Event.W3C_EVT_LOAD,
            0, this, _onload);
        Event.attachEvent(self, Event.W3C_EVT_UNLOAD,
            0, this, _onunload);
        return this;
    };

    var _onload = function(e){
        System.out.println(
            [J$VM.__product__, J$VM.__version__].join(" "));
        
    };

    var _onunload = function(e){
        System.out.println("J$VM unload...");
        try{
            self.document.innerHTML = "";
        }catch(x){}
    };

    return J$VM.isworker ? _workerSystem.call(this) :
        _browseSystem.call(this);

}.call(js.lang.System);

