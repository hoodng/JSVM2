/**

  Copyright 2007-2015, The JSVM Project. 
  All rights reserved.

 * Author: Hu Dong
 * Email: hoodng@hotmail.com
 * Source: https://github.com/hoodng/JSVM2.git
 */

js.lang.String = function(){

    var REGX_HTML_ENCODE = /"|&|'|<|>|[\x00-\x20]|[\x7F-\xFF]|[\u0100-\u2700]/g;

    var REGX_HTML_DECODE = /&\w+;|&#(\d+);|<br\/>/g;

    var REGX_REGEXP_METACHARS = /[\^\$\.\*\+\?\|\\\(\)\[\]\{\}]/g;

    var REGX_REGEXP_ESCAPEDMETACHARS = /\\([\^\$\.\*\+\?\|\\\(\)\[\]\{\}])/g;

    var HTML_DECODE = {
        "&lt;"  : "<",
        "&gt;"  : ">",
        "&amp;" : "&",
        "&nbsp;": " ",
        "&quot;": "\"",
        "&copy;": "©",
        "<br/>" : String.fromCharCode(0x0A)
        // Add more
    };

    var Class = js.lang.Class;

    this.encodeHtml  = function encodeHtml(s, nobreak, ignoreSpace){
        s = s || this.toString();
        var o;
        return (typeof s != "string") ? s :
            s.replace(REGX_HTML_ENCODE,
                function($0){
                    var c = $0.charCodeAt(0), r = ["&#"];
                    if(c == 0x0D && nobreak != true){
                        o = c;
                        return "<br/>";
                    }

                    if(c == 0x0A && nobreak != true){
                        return (o == 0x0D) ? "" : "<br/>";
                    }

                    // 0xA0 (160) doesn't belong to the ASCII. 
                    // Only 0x20 (32) is the ASCII of space.
                    // In fact, large than 127 should belong to UNICODE.
                    // So 0xA0 (160) isn't a english space.
                    // 
                    // For html span, the 0xA0 (160) will be converted
                    // as the "&nbsp;" by the browser.
                    if(c == 0x20 || c == 0xA0){
                        if(ignoreSpace !== true){
                            // Make the whitespace as "&nbsp;"
                            c = (c == 0x20) ? 0xA0 : c;
                        }else{
                            // Keep the ASCII whitespace to make the
                            // text string can be word-wrap by word.
                            c = (c == 0xA0) ? 0x20 : c;
                            return String.fromCharCode(c);
                        }
                    }

                    r.push(c); r.push(";");
                    return r.join("");
                });
    };

    this.decodeHtml = function decodeHtml(s, nobreak){
        s = (s != undefined) ? s : this.toString();
        return (typeof s != "string") ? s :
            s.replace(REGX_HTML_DECODE,
                function($0, $1){
                    var c = HTML_DECODE[$0];
                    if(c == undefined){
                        // Maybe is Entity Number
                        if(!isNaN($1)){
                            c = String.fromCharCode(
                                ($1 == 160) ? 32 : $1);
                        }else{
                            c = $0;
                        }
                    }
                    return c;
                });
    };

    /**
     * Escape regular expression's meta-characters as literal characters.
     */
    this.escapeRegExp = function escapeRegExp(){
        var str = this.toString();
        return str.replace(REGX_REGEXP_METACHARS,
            function($0){return "\\" + $0;});
    };

    this.unescapeRegExp = function unescapeRegExp(){
        var str = this.toString();
        return str.replace(REGX_REGEXP_ESCAPEDMETACHARS,
            function($0, ch){return ch;});
    };

    var REGX_TRIM = /(^\s*)|(\s*$)/g;
    this.trim = this.trim || function trim(){
        var str = this.toString();
        return str.replace(REGX_TRIM, "");
    };

    this.endsWith = this.endsWith || function endsWith(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };

    this.startsWith = this.startsWith || function startsWith(suffix) {
        return this.indexOf(suffix) === 0;
    };

    this.hashCode = this.hashCode || function hashCode(){
        var hash = this.__hash__, c, i, len;
        if(hash) return hash;

        hash = 0;
        for (i = 0, len=this.length; i < len; i++) {
            c = this.charCodeAt(i);
            hash = 31*hash + c;
            hash = hash & hash; // Convert to 32bit integer
        }
        hash = hash & 0x7fffffff;
        return (this.__hash__ = hash);
    };

    return String;

}.call(String.prototype);

