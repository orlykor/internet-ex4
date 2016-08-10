

/*the servers*/
var serversList = [];

/* the time out for the socket*/
var TIME_OUT = 2000;


/**
 * This function creates the server object
 * @param port
 * @param callback
 * @constructor
 */
function CreateWebServer(port, callback) {
    try {

        var self = this;
        var net = require('net');
        this.socketsList = [];
        this.port = port;
        this.resourceAndRequestHandlerModel = [];

        /**
         * make the port as readable only
         */
        Object.defineProperty(this, 'port', {
            value: port,
            __proto__: null,
            writable: false
        });

        //create the socket and server
        this.server = net.createServer(function (socket) {
            var httpResponse = require('./hujiresponse');
            var httpResponseObj = new httpResponse(socket);

            var ManageRequest = require('./hujinet.js');
            var handleReqObj = new ManageRequest.ManageRequest(socket, self.resourceAndRequestHandlerModel);
            var chunk = '';
            self.socketsList.push(socket);
            socket.setTimeout(TIME_OUT);

            /**
             * if the socket is timed out, end it and erase it from the
             * socket's list.
             */
            socket.on('TIME_OUT', function () {
                if (!httpResponseObj.wasSent) {
                    httpResponseObj.status(408).send('Request Timeout');
                }
                socket.end();
            });

            /*check if error was emitted on the socket*/
            socket.on('error', function (error) {
                if (error) {
                    callback(error);
                }
            });

            /**
             * if the socket is closed, end it and erase it from the
             * socket's list.
             */
            socket.on('end', function () {
                if (self.socketsList.indexOf(this) != -1) {
                    self.socketsList.splice(self.socketsList.indexOf(this), 1);
                }
            });

            /**
             * in case data was emitted, create a socket and handle the
             * client request.
             */
            socket.on('data', function (data) {
                chunk += data;
                if(handleReqObj.analyzeData(chunk.toString('utf8'), httpResponseObj))
                {
                    chunk = '';
                }
            });


        });
        /*check for errors, before listening to the server*/
        this.startServerErrors(callback, port);

        this.server.listen(port, function () {
            serversList.push(self);
        });
        /*the stop function-stops the server*/
        this.stop = function () {
            //close the server and remove it from the servers list
            this.server.close(function () {
                var serverIndex = serversList.indexOf(this);
                serversList.splice(serverIndex, 1);
            });

            //destroy all sockets for each connected client
            self.socketsList.forEach(function (socket) {
                socket.destroy();
            });
            self.socketsList = [];
        };


    } catch (err) {
        console.log(err)
    }

}


/**
 * Checks for errors on the server when trying to start it.
 *
 * @param callback
 * @param port
 */
CreateWebServer.prototype.startServerErrors = function (callback, port) {
    this.server.on('error', function (err) {
        switch (err.errno) {
            case "EACCES":
                callback(new Error("Permission denied. Access was forbidden to port" + port));
                break;
            case "EADDRINUSE":
                callback(new Error("Address already in use. Another server occupying the port " + port));
                break;
            default:
                callback(err);
        }
    });

};



/**
 * Registers resource and requestHandler in the data model 'resourceAndRequestHandlerModel'
 * @param resource - The prefix of the resource that we would like to handle
 * @param requestHandler - A function that receives 3 arguments: request (object), response (object) and next (function)
 */
CreateWebServer.prototype.use = function (resource, requestHandler) {

    var resourceFin;
    var requestHandlerFin;

    var resourcePattern = '/';

    var isResource = true;

    if (arguments.length == 1) {
        isResource = false;
    }

    if (isResource) {
        resourceFin = resource;
        requestHandlerFin = requestHandler;
        try {
            if (/\/{2,}/.test(resource)) {
                throw "invalid resource";
            }
        } catch (error) {
            console.log(error);
        }

        resourcePattern = resource;
        // In case the resource is parametrized
        while (resourcePattern.indexOf(':') != -1) {
            resourcePattern = resourcePattern.replace(/:\w+/, ".*");
        }
    } else {
        resourceFin = undefined;
        requestHandlerFin = resource;
    }
    if (resourcePattern != "/" && resourcePattern.lastIndexOf("*") != resourcePattern.length - 1) {
        resourcePattern = "^" + resourcePattern + "(/(.*))*$";
    }
    resourcePattern = new RegExp(resourcePattern);

    this.resourceAndRequestHandlerModel.push({
        resource: resourceFin,
        resourcePattern: resourcePattern,
        requestHandler: requestHandlerFin
    });

};



module.exports = function (port, callback) {
    return (new CreateWebServer(port, callback));
};

