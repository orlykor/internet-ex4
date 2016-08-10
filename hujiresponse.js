/**
 * Creates Response object
 * @param socket
 * @constructor
 */
function Response(socket) {
    this.socket = socket;
    this.headers = {};
    this.httpStatus = 200;
    this.httpVersion = "HTTP/1.1";
    this.wasSent = false;
    this.hasType = false;

}

/**
 * Sets the response's HTTP header field to value.
 * if the given field is an object, then we set multiple fields at once.
 * @param field - the header field to set
 * @param value - the value to set the field to
 */
Response.prototype.set = function(field, value) {
    if (typeof field != 'object') {
        this.headers[field] = value;
    } else {
        for (var key in field) {
            this.headers[key] = field[key];
        }
    }
};

/**
 * Sets the HTTP status for the response.
 * @param code - the code to set httpStatus to
 * @returns {Response}
 */
Response.prototype.status = function(code) {
    this.httpStatus = code;
    return this;
};

/**
 * Returns the HTTP response header specified by field.
 * @param field - the header field
 */
Response.prototype.get = function(field) {
    return this.headers[field];
};

/**
 * Sets cookie name to value.
 * The value parameter may be a string or object converted to JSON.
 * @param name - a given cookie name
 * @param value - the value to set the name to
 * @param options - an object that can have the following properties:
 *                  domain, encode, expires, httpOnly, maxAge, path, secure, signed.
 */
Response.prototype.cookie = function(name, value, options) {
    var cookieVal = value;
    var cookie;

    if (typeof cookieVal == 'object') {
        cookieVal = JSON.stringify(cookieVal);
    }
    cookie = name+'='+cookieVal;

    if (options) {
        for (var property in options) {
            if (options[property]) {
                cookie += ';' + property + '=' + options[property];
            }
        }
    }

    this.set("Set-Cookie", cookie);
};


// the response string contains: http-version, status, content-length, content-type, set-cookie.
Response.prototype.getStr = function() {

    var statusMsg = {
        '200': 'OK',
        '400': 'Bad Request',
        '403': 'Forbidden',
        '404': 'Not Found',
        '408': 'Request Timeout',
        '415': 'Unsupported Media Type',
        '500': 'Internal Server Error',
        '505': 'HTTP Version Not Supported'
    };

    var responseStr = '';
    // status line
    responseStr += "\r\n" + this.httpVersion + ' ' + this.httpStatus + ' ' + statusMsg[this.httpStatus];
    // headers
    if (this.headers['content-type']) {
        responseStr += "\r\n" + 'Content-Type: ' + this.headers['content-type'];
    }
    responseStr += "\r\n" + 'Content-Length: ' + this.headers['content-length'];


    return responseStr;
}

/**
 * Sends the HTTP response.
 * @param body - can be a Buffer object, a String, an object, or an Array.
 * @returns this.socket
 */
Response.prototype.send = function(body) {

    var responseStr;

    // Eventually, the length will be 0 if there is no body
    this.headers['content-length'] = 0;

    if (arguments.length == 0 || typeof body=='undefined') {
        responseStr = this.getStr();

        responseStr += "\r\n" + "\r\n" + body;

        this.socket.write(responseStr);
        return this.socket;
    }

    if (typeof body=='object') {
        this.json(body);
    } else {
        if (!this.hasType) {
            this.headers['content-type'] = 'text/html';
            this.hasType = true;
        }
        this.headers['content-length'] = body.length;

        responseStr = this.getStr();
        responseStr += "\r\n" + "\r\n" + body;

        this.socket.write(responseStr);
    }
    this.wasSent = true;
    return this.socket;
};

/**
 * Sends a file by its path
 * @param reqPath
 */
Response.prototype.sendFile=function(reqPath) {

    var fs=require('fs');
    if (!this.socket.writable) {
        return;
    }
    var responseStr = this.getStr() + "\r\n\r\n";
    this.socket.write(responseStr);
    this.wasSent = true;

    var stream = fs.createReadStream(reqPath);
    stream.on('error', function (error) {
        if (error) {
            console.log(error)
        }
    });
    stream.pipe(this.socket, {end: false});

}


/**
 * Sends a JSON response.
 * @param body - can be an object, or an Array.
 * @returns this.socket, by using this.send
 */
Response.prototype.json = function(body) {
    if (typeof body != 'object') {
        return this.send(body);
    }

    this.headers['content-type'] = 'application/json';
    this.hasType = true;
     this.send(JSON.stringify(body));
};



module.exports = function(socket) {
    return (new Response(socket));
};