/*
 tester which tests our web-server's core functionality, including
 reviving and shutting it down
 */
var HOST = 'localhost';
var PORT = 8080;

var passed_counter = 0;
var failed_counter = 0;
var test_counter = 0;
var index = 0;
//var TIME_OUT = 200;
var DEBUG = true;
var http = require('http');
var net = require('net');
http.globalAgent.maxSockets = 1000;
var hujiwebserver = require('./hujiwebserver');
//work on server
var server = hujiwebserver.start(PORT, function (err) {

    // check if there were errors in revivng the server
    if (err) {
        console.log("Test failed : " + err);
        return;
    }
});

console.log("Server successfully listening to port " + PORT);
console.log("---------------------------------------------");
console.log("starting test");
console.log("---------------------------------------------");


// register of all routes relevant for testing.

server.use('/practice/cookie', function (req, res, next) {
    res.status(200);
    res.send(req.cookies);
});


server.use('/params/:id/noa/:num', function (req, res, next) {
    res.status(200);
    res.send(req.path + '->' + JSON.stringify(req.params));
});


server.use(function (req, res, next) {
    if (req.path == '/catchme/banana/from/monkey.css') {
        res.status(200);
        res.send("catch /*");
        return;
    }
    next();
});

server.use('/request/test/query', function (req, res, next) {
    res.status(200);
    res.send(JSON.stringify(req.query));
});


server.use('/request/test/cookie', function (req, res, next) {
    res.status(200);
    res.send(JSON.stringify(req.cookies));
});


server.use('/request/test/protocol', function (req, res, next) {
    res.status(200);
    res.send(req.protocol);
});

server.use('/request/test/get/content-type', function (req, res, next) {
    res.status(200);
    res.send(req.get("content-type"));
});

server.use('/request/test/get/bebi', function (req, res, next) {
    res.status(200);
    res.send(req.get("Something"));
});


server.use('/request/test/param', function (req, res, next) {
    res.status(200);
    res.send(req.param('name'));
});

server.use('/request/test/params_input/user/:name', function (req, res, next) {
    res.status(200);
    res.send(req.param('name'));
});

server.use('/request/test/is', function (req, res, next) {
    var t = req.is(req.body);
    t = (t) ? "true" : "false";
    res.status(200);
    res.send(t);
});

server.use('/response/test/get', function (req, res, next) {
    res.set({
        'Content-Type': 'response_test_set'
    });
    res.status(200);
    res.send(res.get('Content-Type'))
});

server.use('/response/test/cookie', function (req, res, next) {
    res.cookie('name', 'tobi', {
        domain: '.example.com',
        path: '/admin',
        secure: true
    });
    res.status(200).send();
});

server.use('/response/test/next', function (req, res, next) {
    res.body = 'next1;'
    next();
});

server.use('/response/test/next', function (req, res, next) {
    res.body += 'next2;'
    next();
});

server.use('/response/test/next', function (req, res, next) {
    res.body += 'next3;'
    res.status(200).send(res.body);
});

server.use('/practice/cookie', function (req, res, next) {
    res.send(200, req.cookies);
});

server.use("/static", hujiwebserver.static("www"));

server.use('/test/bodyParser', function (req, res, next) {
    res.status(200).send(JSON.stringify(req.body));
});

server.use('/anotherTest/requestPath', function (req, res, next) {
    res.status(200);
    res.send(req.path);
});

server.use('/anotherTest/requestHost', function (req, res, next) {
    res.status(200);
    res.send(req.host);
});

server.use('/anotherTest/isTest', function (req, res, next) {
    var t = req.is(req.body);
    t = (t) ? "true" : "false";
    res.status(200);
    res.send(t);
});

server.use('/anotherTest/:param1/params/:param2', function (req, res, next) {
    res.status(200);
    res.send(req.path + '->' + JSON.stringify(req.params));
});

setTimeout(function () {
    server.stop();
    console.log("server shutdown")
}, 5000);

run_server_tests(); // start running test

/**
 * Runs a single server test
 * @param options
 * @param expected
 */
function single_server_test(options, expected) {
    var req_options = {
        hostname: HOST,
        port: PORT,
        path: options.path,
        method: options.method
    };


    // check if http request test should be sent with some headers
    if (options.headers) {
        req_options.headers = options.headers;
    }

    // send the http request test to the server
    var req = http.request(req_options, function (res) {
        var buffer = '';
        res.setEncoding('utf8');
        // accumulating the http response body
        res.on('data', function (chunk) {
            buffer += chunk;
        });

        // upon receiving the whole http repponse
        res.on('end', function () {
            test_counter++;
            res.buffer = buffer;


            // check if we pass the relevant test - namely what expected is what we got
            if (res.statusCode != expected.status || (expected.data && (expected.data != buffer)) ||
                (expected.func && !expected.func(res))) {

                console.warn("test #" + test_counter + ":  " + options.test_name + " ... FAILED");
                failed_counter++;

                // in case, we're in DEBUG mode show more details why the test failed.
                if (DEBUG) {
                    console.warn("--------------------------------------------------");

                    // check if http response status is not what we expected.
                    if (res.statusCode != expected.status) {
                        console.warn("got ", res.statusCode, " but expected", expected.status);
                    }

                    // check if http response body is not what we expected.
                    if (buffer != expected.data) {
                        console.warn("got \"", buffer, "\" but expected \"", expected.data, "\"");
                    }

                    if (expected.func && !expected.func(res)) {
                        console.warn("func failed");
                        console.warn(expected.func.toString());
                    }
                    console.warn("--------------------------------------------------");
                }

                // current test succeeded
            } else {
                console.log("test #" + test_counter + ":  " + options.test_name + " ... PASSED");
                passed_counter++;
            }

            // check if it's the last test to run, and if so show total tester results.
            if (test_counter >= test_l.length) {
                report_test_results();
            }
        });

    });

    req.on('error', function (e) {
        console.log('problem with request: ' + e.message);
    });

    if (options.data) {
        req.write(options.data);
    }
    req.end();

    // running the next test in our tester
    if (index < test_l.length - 1) {
        index += 1;
        setTimeout(function () {
            single_server_test(test_l[index].options, test_l[index].expected)
        }, 10);
    }
}

/**
 * dumps to STDOUT the testing results.
 */
function report_test_results() {
    console.log("--------------------------------------------------");
    console.log("total of ", passed_counter, "/", passed_counter + failed_counter, " tests were passed");
    console.log("--------------------------------------------------");
}


/**
 * running the tester with all the tests in test_l on the server.
 */
function run_server_tests() {
    setTimeout(function () {
        single_server_test(test_l[index].options, test_l[index].expected)
    }, 1000);
}

// array of all the tests that we're running on the server
var test_l = [
    {
        options: {
            path: "/practice/cookie",
            method: "GET",
            test_name: "testing the cookie",
            headers: {"Cookie": "name=value; name2=value2"}
        },
        expected: {
            status: 200,
            data: "{\"name\":\"value\",\"name2\":\"value2\"}"
        }
    },
    {
        options: {
            path: "/params/222222222/noa/17/noa.txt",
            method: "GET",
            test_name: "testing path with parameters e.g /params/:id/noa/:num/"
        },
        expected: {
            status: 200,
            data: "/params/222222222/noa/17/noa.txt->{\"id\":\"222222222\",\"num\":\"17\"}"
        }
    },
    {
        options: {
            path: "/catchme/banana/from/monkey.css",
            method: "GET",
            test_name: "testing the use(func(){..}) will catch /* paths, ( resource is optional )"
        },
        expected: {
            status: 200,
            data: "catch /*"
        }
    },
    {
        options: {
            path: "/request/test/query?q=orly+kornan",
            method: "GET",
            test_name: "testing the request query object for ?q=orly+kornan"
        },
        expected: {
            status: 200,
            data: "{\"q\":\"orly kornan\"}"
        }
    },
    {
        options: {
            path: "/request/test/cookie",
            method: "GET",
            test_name: "testing the request Cookie object for Cookie: name=tj",
            headers: {Cookie: "name=tj"}
        },
        expected: {
            status: 200,
            data: "{\"name\":\"tj\"}"
        }
    },
    {
        options: {
            path: "/request/test/cookie",
            method: "GET",
            test_name: "testing the request Cookie object for Cookie: name=tj; class=sponge bob",
            headers: {Cookie: "name=tj; class=sponge bob"}
        },
        expected: {
            status: 200,
            data: "{\"name\":\"tj\",\"class\":\"sponge bob\"}"
        }
    },

    {
        options: {
            path: "/request/test/protocol/orly.txt",
            method: "GET",
            test_name: "testing the request protocol",
        },
        expected: {
            status: 200,
            data: "http"
        }
    },
    {
        options: {
            path: "/request/test/param?name=noa",
            method: "GET",
            test_name: "testing request param('name') for path ?name=noa",

        },
        expected: {
            status: 200,
            data: "noa"
        }
    },
    {
        options: {
            path: "/request/test/params_input/user/noa",
            method: "GET",
            test_name: "testing request param('name') for user/:name",
        },
        expected: {
            status: 200,
            data: "noa"
        }
    },
    {
        options: {
            path: "/response/test/get",
            method: "GET",
            test_name: "testing res.get('Content-Type')"
        },
        expected: {
            status: 200,
            data: "response_test_set"
        }
    },


    {
        options: {
            path: "/response/test/next",
            method: "GET",
            test_name: "testing that the next() method works"
        },
        expected: {
            status: 200,
            data: "next1;next2;next3;"
        }
    },
    {
        options: {
            path: "/no/such/path",
            method: "GET",
            test_name: "testing 404 not found error"
        },
        expected: {
            status: 404,
            data: "The requested resource not found"
        }
    },
    {
        options: {
            path: "/practice/cookie",
            method: "GET",
            test_name: "testing the cookieParser middleware",
            headers: {"Cookie": "name=value; name2=value2"}
        },
        expected: {
            status: 200,
            data: "{\"name\":\"value\",\"name2\":\"value2\"}"
        }
    },
    {
        options: {
            path: "/test/bodyParser",
            method: "POST",
            test_name: "testing the bodyParser middleware",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                'Content-Length': "param1=value1&param2=value2".length
            },
            data: "param1=value1&param2=value2"
        },
        expected: {
            status: 200,
            data: "{\"param1\":\"value1\",\"param2\":\"value2\"}"
        }
    },
    {
        options: {
            path: "/request/test/get/bebi",
            method: "POST",
            test_name: "testing request get('Something')",
            headers: {"Content-Type": "text/html", "Content-Length": "hello world!".length},
            data: "hello world!"

        },
        expected: {
            status: 200,
            data: ""
        }
    },
    {
        options: {
            path: "/request/test/is",
            method: "POST",
            test_name: "testing req.is('html') for \"Content-Type: text/html; charset=utf-8\"",
            headers: {"Content-Type": "text/html; charset=utf-8", "Content-Length": "html".length},
            data: "html"
        },
        expected: {
            status: 200,
            data: "true"
        }
    },
    {
        options: {
            path: "/request/test/is",
            method: "POST",
            test_name: "testing req.is('text/html') for \"Content-Type: text/html; charset=utf-8\"",
            headers: {"Content-Type": "text/html; charset=utf-8", "Content-Length": 'text/html'.length},
            data: 'text/html'
        },
        expected: {
            status: 200,
            data: "true"
        }
    },
    {
        options: {
            path: "/request/test/is",
            method: "POST",
            test_name: "testing req.is('json') for \"Content-Type: application/json\"",
            headers: {"Content-Type": "application/json", "Content-Length": 'json'.length, "Connection": "closed"},
            data: 'json'
        },
        expected: {
            status: 200,
            data: "true"
        }
    },
    {
        options: {
            path: "/request/test/is",
            method: "POST",
            test_name: "testing req.is('application/json') for \"Content-Type: application/json\"",
            headers: {"Content-Type": "application/json", "Content-Length": 'application/json'.length},
            data: 'application/json'
        },
        expected: {
            status: 200,
            data: "true"
        }
    },


    {
        options: {
            path: "/anotherTest/requestPath/blabla?order=asc&direction[favorite]=north&direction[hated]=east&hi=bye",
            method: "GET",
            test_name: "testing the request path",
        },
        expected: {
            status: 200,
            data: "/anotherTest/requestPath/blabla"
        }
    },
    {
        options: {
            path: "/anotherTest/requestHost/blabla?order=asc&direction[favorite]=north&direction[hated]=east&hi=bye",
            method: "GET",
            test_name: "testing the request host name",
        },
        expected: {
            status: 200,
            data: "localhost:8080"
        }
    },
    {
        options: {
            path: "/anotherTest/isTest",
            method: "POST",
            test_name: "testing req.is('text/plain') for \"Content-Type: text/plain\"",
            headers: {"Content-Type": "text/plain", "Content-Length": 'text/plain'.length},
            data: 'text/plain'
        },
        expected: {
            status: 200,
            data: "true"
        }
    },
    {
        options: {
            path: "/anotherTest/requestHost",
            method: "POST",
            test_name: "testing host name again",
            headers: {},
            data: 'text/plain'
        },
        expected: {
            status: 200,
            data: "localhost:8080"
        }
    },
    {
        options: {
            path: "/anotherTest/someParam/params/anotherParam/someImage.jpg",
            method: "GET",
            test_name: "testing path with parameters"
        },
        expected: {
            status: 200,
            data: "/anotherTest/someParam/params/anotherParam/someImage.jpg->{\"param1\":\"someParam\",\"param2\":\"anotherParam\"}"
        }
    },
    {
        options: {
            path: "/static/staticTest.txt",
            method: "GET",
            test_name: "testing static request"
        },
        expected: {
            status: 200,
            data: "You Passed The Static Test :)\n"
        }
    },
];

