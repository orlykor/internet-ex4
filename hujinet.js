/**
 * finds the title in the http request
 *
 * @param httpMessage
 * @param messageElem
 * @returns {number}the index of the title
 */
function findTitle(httpMessage, messageElem) {
    //there maybe empty lines till we get to the title
    for (var i = 0; i < httpMessage.length; i++) {
        if (httpMessage[i].replace(/\s{2,}/g, ' ').split(" ").length === 3) {
            messageElem.title = httpMessage[i];
            return i;
        }
    }
    return -1;
}

/**
 * holds the socket of the request and its root folder.
 *
 * @param socket
 * @param rootFolder
 * @constructor
 */
function ManageRequest(socket, resourceAndRequestHandlerModel) {
    this.socket = socket;
    this.methods = {
        "put": 'put',
        "get": 'get',
        "delete": 'delete',
        "post": 'post'
    };
    this.resourceAndRequestHandlerModel = resourceAndRequestHandlerModel;
    this.messageElem = new MessageElements();
}
exports.ManageRequest = ManageRequest;

/**
 * holds the title and headers of the http request message
 * @constructor
 */
function MessageElements() {
    this.isTitle = "false";
    this.title = "";
    this.headers = [];
    this.body = "";
}

/**
 * Tries to match the request to resources in resourceAndRequestHandlerModel
 * @param request
 * @param response
 * @param resourceAndRequestHandlerModel
 * @param curResourceIndex
 */
function matchRequestToResource(request, response, resourceAndRequestHandlerModel, curResourceIndex) {

    var index_match = -1;

    if (response.wasSent) {
        return;
    }
    try {
        for (var i = curResourceIndex; i < resourceAndRequestHandlerModel.length; i++) {
            if (resourceAndRequestHandlerModel[i].resourcePattern == '/\//' ||
                resourceAndRequestHandlerModel[i].resourcePattern.test(request.path)) {
                index_match = i;
                if (resourceAndRequestHandlerModel[index_match].resource) {
                    request.checkParams(resourceAndRequestHandlerModel[index_match].resource);
                }
                request.resource = resourceAndRequestHandlerModel[i].resource;
                resourceAndRequestHandlerModel[i].requestHandler(request, response, function () {
                    matchRequestToResource(request, response, resourceAndRequestHandlerModel, ++index_match);
                });
                break;
            }
        }
    }
    catch (err) {
        response.status('500').send(err).end();
    }

    if (index_match == -1) {
        response.status('404').send("The requested resource not found");
    }

}

/**
 * Checks if there is a body
 * @param lines
 * @returns {boolean}
 */
function isBody(lines) {
    for (var i = 0; i < lines.length; i++) {
        var field = lines[i].replace(/\s{2,}/g, ' ').split(":");
        if (field[0].trim() == "content-length") {
            return true;
        }
    }
    return false;
}

/**
 * analyzes the data and process it to a http message
 * @param chunk
 * @param httpResponseObj
 */

ManageRequest.prototype.analyzeData = function (chunk, httpResponseObj) {


    try {
        var httpRequest = require('./hujirequest');
        var httpRequestObj;

        chunk = chunk.replace(/(\r\n|\n|\r)/gm, "\n"); // if there are any new lines
        var httpMessage = chunk.split("\n");

        var titleIndex = findTitle(httpMessage, this.messageElem);

        //get the title to the http requeset object, and cut it from the message
        if (titleIndex != -1 && this.messageElem.isTitle) {
            httpMessage.splice(titleIndex, 1);
            this.messageElem.isTitle = true;
        } else {
            httpResponseObj.status('400').send('Title is not valid!');
            return;
        }

        /* get the headersArr out of the data and store them in the http
         request object */
        while (httpMessage.length > 0) {
            //in case there is no body
            if ((httpMessage[0] == "" && httpMessage[1] == "" ) && !isBody(chunk)) {
                break;
            }
            //there is body
            else {
                if (httpMessage[0] == "") {
                    httpMessage.splice(0, 1);
                    this.messageElem.body = httpMessage[0];
                    break;
                }
                this.messageElem.headers.push(httpMessage[0]);
            }
            httpMessage.splice(0, 1);
        }

        // create the http request object
        httpRequestObj = new httpRequest(this.messageElem);
        this.messageElem = new MessageElements();


        if (!httpRequestObj.method in this.methods) {
            httpResponseObj.status('405').send("Can only execute GET, POST," +
                " DELETE and PUT").end();
            return;
        }

        if (httpRequestObj.version != "http/1.0" && httpRequestObj.version != "http/1.1") {
            httpResponseObj.status('505').send('Sorry! We are not supporting' +
                ' this http version!').end();
            return;
        }
        else {
            if (httpRequestObj.version == "HTTP/1.0") {
                httpResponseObj.version = httpRequestObj.version;
            }
        }

        //response and request are done.
        if ((httpRequestObj.body && typeof httpRequestObj.headers['content-length'] !== 'undefined') || typeof httpRequestObj.headers['content-length'] === 'undefined') {
            matchRequestToResource(httpRequestObj, httpResponseObj, this.resourceAndRequestHandlerModel, 0);
            return true;
        }
        return false;
    }
    catch (err) {
        httpResponseObj.status('500').send(err).end();
    }
};







