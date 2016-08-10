
/**
 * this function starts the server and the connection
 * between the server to the clients.
 *
 * @param port
 * @param callback
 * @returns {CreateWebServer} a server object
 */
exports.start = function (port, callback) {
    var hujidynamicwebserver = require('./hujidynamicwebserver');
    var DynamicServer = new hujidynamicwebserver (port, callback);
    return DynamicServer;
};

/**
 * Checks if the request has a valid connection type, if exist.
 * if not, make one with the 'close' type for http version 1.0
 *
 * @param req
 * @returns {boolean} true if has a valid http version and connection type.
 */
function isEndConnection(req) {

    if (req.headers["connection"] == undefined) {
        if (req.version == 'HTTP/1.0') {
            req.headers["connection"] = 'close';
        }
        else {
            req.headers["connection"] = 'keep-alive';
        }
    }
    var connectionType = req.headers["connection"];
    var end_connection = ((!connectionType.toLowerCase() === 'keep-alive') &&
        req.version === 'HTTP/1.0') ||(connectionType.toLowerCase() === 'close')
    return end_connection;
}

/**
 * creates a static server
 * @param rootFolder
 * @returns {staticReqHandler}
 */
exports.static = function(rootFolder) {
    var staticReqHandler = function(req,res,next){
        var contentTypes = {
            'js': 'application/javascript',
            'txt': 'text/plain',
            'html': 'text/html',
            'css': 'text/css',
            'jpg': 'image/jpg',
            'gif': 'image/gif'
        };

        var fs = require('fs');
        req.path=req.path.replace(req.resource,'');
        var requestPath = rootFolder + req.path;
        requestPath = requestPath.replace(/\//g, '\/');

        /*check if the root source is under the given rootFolder*/
        if (requestPath.indexOf("..") != -1) {
            res.status('403').send('You dont have necessary permissions for' +
                ' the file').end();
            return;
        }


        /* check if path exist*/
        fs.exists(requestPath, function (exist) {
            if (!exist) {
                res.status('404').send('The requested resource could not be' +
                    ' found').end();
                return;
            }
        });

        /**
         * check if the File is an actual file and of an existing
         * type(from the contentType obj)
         */
        fs.stat(requestPath, function (err, stats) {
            var path = require('path');
            if (err || !stats.isFile()) {
                res.status('404').send('The requested resource could not be' +
                    ' found').end();
                return;
            }
            else {
                var fileType = path.extname(requestPath).substring(1);

                if (!contentTypes[fileType]) {
                    res.status('415').send("The request entity has a media type which the " +
                        "server or resource does not support").end();
                    return;
                }
                res.status('200');
                if(isEndConnection(res)) {
                    res.send("The server cannot or will not process" +
                        " the request").end();
                }


            }
            res.headers['content-length'] = stats.size;
            res.sendFile(requestPath);

        });

    };
    return staticReqHandler;
};
/**
 * Gives the number of clients that currently use the given server
 * @param server
 * @returns a requestHandler function
 */
exports.myUse = function (server){
    var description = "Gives the number of clients that currently use this server.";

    this.toString = function(){
        return description;
    };

    this.execute = function(request, response, next) {
        response.send("There are " + server.socketsList.length + " clients that currently use this server");
    }

    return this.execute;
};

