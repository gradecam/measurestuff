
var http = require('http');
var url = require('url');
var profiler = require('v8-profiler-next');
var path = require('path');
var pkg = require('./package.json');
var flamegraph = require('flamegraph');

var verbose = false;
var defaultSeconds = 60;
var nextId = 0;

function endProfiling(id, cb) {
    var p = profiler.stopProfiling(id);
    if (verbose) { console.log("CPU Profiling complete"); }
    setImmediate(cb, p);
}

function runProfile(seconds, cb) {
    if (verbose) { console.log("Starting CPU profiling for", seconds, "seconds."); }
    var id = "cpu_" + nextId++;
    setImmediate(profiler.startProfiling, id);
    var done = false;

    setTimeout(endProfiling, 1000 * seconds, id, cb);
}
function endHeapProfiling(cb) {
    try {
        const hp = profiler.stopSamplingHeapProfiling();
        cb(null, hp);    
    } catch (err) {
        cb(err);
    }
}
function runHeapProfile(seconds, cb) {
    if (verbose) { console.log("Starting Heap sampling profiling for", seconds, "seconds."); }
    setImmediate(profiler.startSamplingHeapProfiling);
    var done = false;

    setTimeout(endHeapProfiling, 1000 * seconds, cb);
}

function releaseProfile(p) {
    if (verbose) { console.log("Releasing CPU profile"); }
    p.delete();
}
function releaseSnapshot(s) {
    if (verbose) { console.log("Releasing heap snapshot"); }
    s.delete();
}

function exportHeapSnapshot(req, res) {
    var snapshot = profiler.takeSnapshot();
    var fname = new Date().getTime() + ".heapsnapshot";
    res.writeHead('200', {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="' + fname + '"'
    });
    if (verbose) { console.log("Generating heap snapshot"); }
    snapshot.export().pipe(res).on('finish', function() {
        setImmediate(releaseSnapshot, snapshot);
    });
}

var routes = {
    'currentHeap.heapsnapshot': function getCurrentHeap(req, res) {
        // We want to keep the stack as shallow as possible when this happens to avoid any
        // potential conflicts (yes, issues were observed before we did this)
        setImmediate(exportHeapSnapshot, req, res);
    },
    'profile.cpuprofile': function getCPUProfile(req, res, query) {
        var seconds = query.seconds || defaultSeconds;

        var fname = new Date().getTime() + "_" + seconds + "s.cpuprofile";
        res.writeHead('200', {
            "Content-Type": "application/json",
            "Content-Disposition": 'attachment; filename="' + fname + '"'
        });

        runProfile(seconds, function sendProfileToBrowser(p) {
            p.export().pipe(res).on('finish', function deleteProfile() {
                setImmediate(releaseProfile, p);
            });
        });
    },
    'profile.heapprofile': function exportHeapSnapshot(req, res, query) {
        var seconds = query.seconds || defaultSeconds;

        var fname = new Date().getTime() + "_" + seconds + "s.heapprofile";
        res.writeHead('200', {
            "Content-Type": "application/json",
            "Content-Disposition": 'attachment; filename="' + fname + '"'
        });

        runHeapProfile(seconds, function sendProfileToBrowser(err, profile) {
            if (err) {
                console.warn("Error getting heap profile:", err);
            }
            res.write(JSON.stringify(profile));
            res.end();
        });
    },
    
    'profile.svg': function getCPUProfile(req, res, query) {
        var seconds = query.seconds || defaultSeconds;

        var fname = new Date().getTime() + "_" + seconds + "s.svg";
        runProfile(seconds, function sendProfileToBrowser(p) {
            if (verbose) { console.log("Generating flamegraph"); }
            p.export(function makeFlamegraph(err, pText) {
                if (err) {
                    console.warn("Flamegraph generation failed!", err, err.stack);
                    res.writeHead('500');
                    res.end("Could not generate flamegraph!");
                    return;
                }
                if (verbose) { console.log("Sending flamegraph to caller"); }
                res.writeHead('200', {
                    "Content-Type": "image/svg+xml",
                    "Content-Disposition": 'inline; filename="' + fname + '"'
                });

                var svg = flamegraph([ pText ], {inputtype:'cpuprofile'});
                res.end(svg);
                setImmediate(releaseProfile, p);
            });
        });
    }
};

var server = http.createServer();

function measureServer(config) {
    config = config || {};
    if (config.verbose) { verbose = config.verbose; }
    var port = config.port || 12345;
    if (config.seconds) { defaultSeconds = Number(config.seconds); }
    if (isNaN(defaultSeconds)) {
        console.warn("Invalid default profiling seconds parameter! Defaulting to 60");
        defaultSeconds = 60;
    }
    console.warn(" >> measurestuff profiling helper listening on port", port);
    server.listen(port);
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

measureServer.close = (cb) => {
    return server.close(cb);
}

measureServer.default = measureServer;

module.exports = measureServer;
