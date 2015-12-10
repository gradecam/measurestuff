
var http = require('http');
var url = require('url');
var profiler = require('v8-profiler');
var path = require('path');
var pkg = require('./package.json');
var flamegraph = require('flamegraph');

var verbose = false;

var nextId = 0;

function runProfile(seconds, cb) {
    if (verbose) { console.log("Starting CPU profiling for", seconds, "seconds."); }
    var id = "cpu_" + nextId++;
    profiler.startProfiling(id);
    var done = false;

    setTimeout(function endProfiling() {
        done = true;
        var p = profiler.stopProfiling(id);
        if (verbose) { console.log("CPU Profiling complete"); }
        cb(p);
    }, 1000 * seconds);
}

var routes = {
    'currentHeap.heapsnapshot': function getCurrentHeap(req, res) {
        var snapshot = profiler.takeSnapshot();
        var fname = new Date().getTime() + ".heapsnapshot";
        res.writeHead('200', {
            "Content-Type": "application/json",
            "Content-Disposition": 'attachment; filename="' + fname + '"'
        });
        if (verbose) { console.log("Generating heap snapshot"); }
        snapshot.export().pipe(res).on('finish', function() {
            profiler.deleteAllSnapshots();
        });
    },
    'profile.cpuprofile': function getCPUProfile(req, res, query) {
        var seconds = query.seconds || 60;

        var fname = new Date().getTime() + "_" + seconds + "s.cpuprofile";
        res.writeHead('200', {
            "Content-Type": "application/json",
            "Content-Disposition": 'attachment; filename="' + fname + '"'
        });

        runProfile(seconds, function sendProfileToBrowser(p) {
            p.export().pipe(outputStream).on('finish', function deleteProfile() {
                //p.delete();
                profiler.deleteAllProfiles();
            });
        });
    },
    'profile.svg': function getCPUProfile(req, res, query) {
        var seconds = query.seconds || 60;

        var fname = new Date().getTime() + "_" + seconds + "s.svg";
        res.writeHead('200', {
            "Content-Type": "image/svg+xml",
            "Content-Disposition": 'inline; filename="' + fname + '"'
        });

        runProfile(seconds, function sendProfileToBrowser(p) {
            if (verbose) { console.log("Generating flamegraph"); }
            p.export(function makeFlamegraph(err, pText) {
                if (verbose) { console.log("Sending flamegraph to caller"); }
                var svg = flamegraph([ pText ], {inputtype:'cpuprofile'});
                res.end(svg);
                profiler.deleteAllProfiles();
            });
        });
    }
};

function measureServer(config) {
    if (config.verbose) { verbose = config.verbose; }
    config = config || {};
    var port = config.port || 12345;
    if (verbose) { console.log("Profiling helper listening on port", port); }
    var server = http.createServer().listen(port);
    server.on('request', function measureServerOnRequest(req, res) {
        if (verbose) { console.log("Profiling helper HTTP request to ", req.method, req.url); }
        var parts = url.parse(req.url, true);
        var paths = parts.pathname.split('/');
        if (routes[paths[1]]) {
            // Dispatch the event to the route handler
            routes[paths[1]](req, res, parts.query);
        } else {
            res.writeHead(404);
            res.end("Page not found. measurestuff version " + pkg.version + "\n");
        }
    });
}

module.exports = measureServer;
