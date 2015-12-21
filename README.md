# measurestuff

A drop-in tool to make CPU profiling and heap snapshots easy on web applications

# getting started

Installing the `measurestuff` module in your application is easy.  First, install it with npm:

``` bash
npm install measurestuff
```

Then in your app.js (or wherever that gets run early in the process):

``` js
require('measurestuff')({port: 12345, verbose: true});

```

When you start your application, if you set , you'll then see:

    >> measurestuff profiling helper listening on port 12345

# CPU profiling

CPU profiling can be very useful for tracking down where your application is getting bogged down.
NOTE: **CPU profiling will only help if your performance issue is CPU-bound; if your issue is I/O
bound then you probably won't find anything useful here.**

CPU profiles run for a given period of time and then report back.  All APIs default to 60 seconds,
but this can be overridden with the `seconds` GET parameter.  For example, `?seconds=15` will set it
to run for 15 seconds.

## cpuprofile file

A `.cpuprofile` file can be loaded in Chrome's developer tools, allowing you to do a great deal of
analysis on the file. All that is needed is to make a HTTP GET request for `/profile.cpuprofile`
from the port you configured the measurestuff server on.

For example, if you kept the default `12345` port and are debugging locally, you would request
`http://localhost:12345/profile.cpuprofile?seconds=60`.  The request would take approximately
60 seconds to return and would give you a .cpuprofile file which could be loaded in Chrome.

## flamegraph

One of the easiest ways to locate performance issues in your application is with a
[Flame Graph](http://www.brendangregg.com/FlameGraphs/cpuflamegraphs.html). `measurestuff` relies
on the [`flamegraph`](https://github.com/thlorenz/flamegraph) npm module which creates a SVG. To
take a CPU profile directly to a flamegraph make a HTTP GET request for `/profile.svg` from the port
you configured the measurestuff server on.

For example, if you kept the default `12345` port and are debugging locally, you would request
`http://localhost:12345/profile.svg?seconds=60`.  The request would take approximately
60 seconds to return and would give you a nice pretty SVG which you can use to find your
performance bottlenecks (which will look like plateaus on your flame graph)

# Heap snapshots

Heap snapshots can be one of the most effective ways to track down memory leaks.  You can take a
heap snapshot by making a HTTP GET request for `/currentHeap.heapsnapshot` from the port you
configured the measurestuff server on.  This will return a `.heapsnapshot` file which can be loaded
in the Chrome Developer Tools.

For example, if you kept the default `12345` port and are debugging locally, you would request
`http://localhost:12345/currentHeap.heapsnapshot`. The request would return immediately but the
response may be rather large.
