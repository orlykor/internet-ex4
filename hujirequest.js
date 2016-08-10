
/**
 * creates the request object
 * @param messageElem
 * @constructor
 */
function RequestObject (messageElem){

    var oldPath;
    var title = messageElem.title.split(/[ ]+/);
    var reqBody = messageElem.body;
    this.method = title[0].toLowerCase();
    this.version = title[2].toLowerCase();
    this.protocol = "http";
    this.headers = {};

    /* parse the headers*/
    for (var i = 0; i < messageElem.headers.length; i++) {
        var semicolonIndex = messageElem.headers[i].indexOf(":");
        if (semicolonIndex != -1) {
            var header = [];
            header[0] = messageElem.headers[i].substring(0, semicolonIndex);
            header[1] = messageElem.headers[i].substring(semicolonIndex+1 , messageElem.headers[i].length);
            if (header.length === 2) {
                this.headers[header[0].trim().toLowerCase()] = header[1].trim();
            }
        }
    }

    this.host = this.headers["host"];

    this.path = title[1];
    var endPath = this.path.length;
    var queryIndex = this.path.indexOf("?");
    if(queryIndex != -1){
        endPath = queryIndex;
    }

    oldPath = this.path;
    this.path = this.path.substring(0, endPath);

    /*An object containing properties mapped to the named route “parameters”*/
    this.params = {};

    this.query = {};
    if(queryIndex != -1){
        querystring = require('querystring');
        this.query = querystring.parse(oldPath.slice(queryIndex+1, oldPath.length+1));
    }
    this.cookies = {};
    /*set the cookies if there are such*/
    if(this.headers["cookie"]){
        var cookie_arr = this.headers["cookie"].split(";");
        for(var i = 0; i < cookie_arr.length; i++){
            var arr_split = cookie_arr[i].trim().split("=");
            this.cookies[arr_split[0]] = arr_split[1];
        }
    }
    this.body = null;
    if(this.headers["content-length"]){
        if(this.headers["content-type"] == "application/json"){
            try{
                this.body = JSON.parse(reqBody);
            }
            catch (exp){
                this.body = reqBody;
            }
        }
        else{
            if(reqBody.indexOf("=") != -1){
                var querystring = require('querystring');
                this.body = querystring.parse(reqBody);
            }
            else{
                this.body = reqBody;
            }
        }
    }
}
/**
 * Check for parameters in the resource, if so add it to the params object
 * @param resource
 */
RequestObject.prototype.checkParams = function(resource){
    var resource_arr = resource.substring(1).split("/");
    var path_arr = this.path.substring(1).split("/");
    for(var i = 0; i < resource_arr.length; i++){
        if(resource_arr[i].indexOf(":") != -1){
            this.params[resource_arr[i].split(":")[1]] = path_arr[i];
        }
    }
};


/**
 * The get function returns the specified HTTP request header field
 *
 * @param field
 * @returns {string}
 */
RequestObject.prototype.get= function(field){
    var field = field.toLowerCase();
    var property = (this.headers[field] == null) ? "undefined" : this.headers[field];
    return property;
};
/**
 * Check if the incoming request’s “Content-Type” HTTP header field
 * matches the MIME type specified by the type parameter.
 *
 * @param type
 * @returns {boolean} returns true is it matches, false otherwise
 */
RequestObject.prototype.is = function(type){
    var property = this.headers["content-type"].split(";")[0];
    if(property){
        var type_arr = type.split("/");
        for(var i = 0; i < type_arr.length; i++){
            if((type_arr[i] != "*") && (property.indexOf(type_arr[i]) == -1)){
                return false;
            }
        }
        return true;
    }
    return false;
}

/**
 * Return the value of param name when present.
 *
 * @ param name
 * @ defaultValue
 */
RequestObject.prototype.param = function(name, defaultValue){
    if (defaultValue === "undefined"){
        defaultValue = null;
    }
    if(this.params && this.params[name]){
        return this.params[name];
    }
    if(this.body && this.body[name]){
        return this.body[name];
    }
    if(this.query && this.query[name]){
        return this.query[name];
    }
    return defaultValue;
};



module.exports = function(messageElem){
    return (new RequestObject(messageElem));
}
