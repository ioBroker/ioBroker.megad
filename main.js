/**
 *      ioBroker MegaD-328 Adapter
 *      03'2015 Bluefox
 *      Lets control the MegaD-328 over ethernet (http://www.ab-log.ru/smart-house/ethernet/megad-328)
 *
 *
 *      The device has 14 ports, 0-7 inputs and 8-13 outputs.
 *      To read the state of the port call
 *      http://mega_ip/sec/?pt=4&cmd=get , where sec is password (max 3 chars), 4 is port number
 *      The result will come as "ON", "OFF" or analog value for analog ports
 *
 *      To set the state call:
 *      http://mega_ip/sec/?cmd=2:1 , where sec is password (max 3 chars), 2 is port number, and 1 is the value
 *      For digital ports only 0, 1 and 2 (toggle) are allowed, for analog ports the values from 0 to 255 are allowed
 *
 *      The device can report the changes of ports to some web server in form
 *      http://ioBroker:8090/?pt=6  , where 6 is the port number
 *
 */
/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

var utils  = require(__dirname + '/lib/utils'); // Get common adapter utils
var http   = require('http');
var server =  null;
var ports  = {};

var adapter = utils.adapter('megad');

adapter.on('stateChange', function (id, state) {
    if (id && state && !state.ack) {
        id = id.substring(adapter.namespace.length + 1);
        if (!ports[id]) {
            adapter.log.error("Unknown port ID " + id);
            return;
        }

        adapter.log.info("try to control " + id + " with " + state.val);

        if (state.val === "false" || state.val === false) state.val = 0;
        if (state.val === "true"  || state.val === true)  state.val = 1;

        if (parseFloat(state.val) == state.val) {
            // If number => set position
            state.val = parseFloat(state.val);
            if (state.val < 0) {
                adapter.log.warn(": invalid control value " + state.val + ". Value must be positive");
                state.val = 0;
            }
            if (state.val > 1) {
                adapter.log.warn(": invalid control value " + state.val + ". Value must be from 0 to 1, e.g. 0.55");
                state.val = 1;
            }
            if (ports[id].digital && state.val !== 0 && state.val != 1) {
                adapter.log.warn(": invalid control value " + state.val + ". Value for switch must be 0/false or 1/true");
                state.val = state.val ? 1 : 0;
            }

            if (ports[id].digital) {
                sendCommand(ports[id].index, state.val);
            } else {
                state.val = (state.val - ports[id].offset) / ports[id].factor * 256;
                state.val = Math.round(state.val);
                if (ports[id].isRollo) {
                    sendCommand(ports[id].index, (256 - state.val));
                } else {
                    sendCommand(ports[id].index, state.val);
                }
            }
        }
    }
});

adapter.on('ready', function (obj) {
    main();
});

adapter.on('message', function (obj) {
    if (obj && obj.command == "send") processMessage(obj.message);
    processMessages();
});

function processMessages(ignore) {
    adapter.getMessage(function (err, obj) {
        if (obj) {
            if (!ignore) processMessage(obj.message);
            processMessages();
        }
    });
}

// Because the only one port is occuped by first instance, the changes to other devices will be send with messages
function processMessage(message) {
    var port = parseInt(message, 10);

    // Command from instance with web server
    if (adapter.config.ports[port]) {
        // If digital port
        if (adapter.config.ports[port].digital && !adapter.config.ports[message].switch) {
            adapter.config.ports[port].value = true;
            adapter.log.debug("adapter megaD: reported new state for port " + port + " - " + adapter.config.ports[port].value);
            adapter.setState(adapter.config.ports[port].id, true, true);

            // Set automatically the state of the port to false after 100ms
            setTimeout(function () {
                adapter.config.ports[port].value = false;
                adapter.setState(adapter.config.ports[port].id, false, true);
            }, 100);
        } else {
            adapter.log.debug("adapter megaD: reported new value for port " + port + ", request actual value");
            // Get value from analog port
            getPortState(port, processPortState);
        }
    }
}

var simulate = [
    "OFF/0<br>",
    "ON/607<br>",
    "OFF/0<br>",
    "OFF/0<br>",
    "OFF/12<br>",
    "OFF/6<br>",
    "OFF/4<br>",
    "OFF",
    "OFF",
    "OFF",
    "OFF",
    "OFF",
    "OFF",
    "0"
];

function getPortState(port, callback) {
    var options = {
        host: adapter.config.ip,
        port: 80,
        path: '/' + adapter.config.password + '/?pt=' + port + '&cmd=get'
    };
    adapter.log.debug("adapter megaD getPortState http://" + options.host + options.path);

    http.get(options, function (res) {
        var xmldata = '';
        res.on('error', function (e) {
            adapter.log.warn("megaD: " + e);
        });
        res.on('data', function (chunk) {
            xmldata += chunk;
        });
        res.on('end', function () {
            adapter.log.debug("adapter megaD response for " + adapter.config.ip + "[" + port + "]: " + xmldata);
            // Analyse answer and updates staties
            if (callback) {
                callback(port, xmldata);
            }
        });
    }).on('error', function (e) {
        adapter.log.warn("adapter megaD: Got error by request " + e.message);
        if (typeof simulate !== "undefined") {
            callback(port, simulate[port]);
        }
    });
}

function processPortState(_port, value) {
    var _ports = adapter.config.ports;

    if (value !== null) {
        var rawValue = value;
        // Value can be OFF/5 or 27/0 or 27 or ON
        if (typeof value == "string") {
            var t = value.split("/");
            value = t[0];
            rawValue = value;
            t = null;
            if (value == 'OFF') {
                value = 0;
            } else
            if (value == 'ON') {
                value = 1;
            }
            value = parseInt(value);
        }

        // If status changed
        if (value !== _ports[_port].value) {
            _ports[_port].value = value;

            if (_ports[_port].digital) {
                adapter.log.debug("adapter megaD detected new state on port [" + _port + "]: " + value);
                adapter.setState(_ports[_port].id, !!value, true);
            } else if (_ports[_port].isRollo) {
                adapter.log.debug("adapter megaD detected new rollo state on port [" + _port + "]: " + value + ", calc state " + ((256 - value) / 256));
                adapter.setState(_ports[_port].id, ((256 - _ports[_port].value) / 256).toFixed(2), true);
            } else {
                adapter.log.debug("adapter megaD detected new value on port [" + _port + "]: " + value + ", calc state " + (value / 256));
                var f = (value / 256) * _ports[_port].factor + _ports[_port].offset;
                adapter.setState(_ports[_port].id, f.toFixed(4), true);
            }
        }
    }
}

function pollStatus(dev) {
    for (var port = 0; port < adapter.config.ports.length; port++) {
        getPortState(port, processPortState);
    }
}

// Process http://ioBroker:80/instance/?pt=6
function restApi(req, res) {
    var values       = {};
    var url = req.url;
    var pos = url.indexOf('?');
    if (pos != -1) {
        var arr = url.substring(pos + 1).split('&');
        url = url.substring(0, pos);

        for (var i = 0; i < arr.length; i++) {
            arr[i] = arr[i].split('=');
            values[arr[i][0]] = (arr[i][1] === undefined) ? null : arr[i][1];
        }
        if (values.prettyPrint !== undefined) {
            if (values.prettyPrint === 'false') values.prettyPrint = false;
            if (values.prettyPrint === null)    values.prettyPrint = true;
        }
        // Default value for wait
        if (values.wait === null) values.wait = 2000;
    }

    var parts  = url.split('/');
    var device = parts[1];

    if (!device || (device != adapter.instance && (!adapter.config.name || device != adapter.config.name))) {
        if (device && values.pt !== undefined) {
            // Try to find name of the instance
            if (parseInt(device, 10) == device) {
                adapter.sendTo('megad.' + device, 'send', values.pt);
                res.writeHead(0);
                res.end('OK->');
            } else {
                // read all instances of megaD
                adapter.getForeignObjects('system.adapter.megad.*', 'instance', function (err, arr) {
                    if (arr) {
                        for (var id in arr) {
                            if (arr[id].native.name == device) {
                                adapter.sendTo(id, 'send', values.pt);
                                res.writeHead(0);
                                res.end('OK->');
                                return;
                            }
                        }
                    }

                    res.writeHead(500);
                    res.end('Cannot find ' + device);
                });
            }
        } else {
            res.writeHead(500);
            res.end('Error: unknown device name "' + device + '"');
        }
        return;
    }
    
    if (values.pt !== undefined) {
        var _port = parts[1];
        if (adapter.config.ports[_port]) {
            // If digital port
            if (adapter.config.ports[_port].digital && !adapter.config.ports[_port].switch) {
                adapter.config.ports[_port].value = true;
                adapter.log.debug("adapter megaD: reported new state for port " + _port + " - " + adapter.config.ports[_port].value);
                adapter.setState(adapter.config.ports[_port].id, true, true);

                // Set automatically the state of the port to false after 100ms
                setTimeout(function () {
                    adapter.config.ports[_port].value = false;
                    adapter.setState(adapter.config.ports[_port].id, false, true);
                }, 100);
            } else {
                adapter.log.debug("adapter megaD: reported new value for port " + _port + ", request actual value");
                // Get value from analog port
                getPortState(_port, processPortState);
            }
            res.writeHead(0);
            res.end('OK');
            return;
        }
    }
    res.writeHead(500);
    res.end('Error: invalid input "' + req.url + '". Expected /' + (adapter.config.name || adapter.instance) + '/?pt=X');
}

function sendCommand(port, value) {
    var data = 'cmd=' + port + ':' + value;

    var options = {
        host: adapter.config.ip,
        port: 80,
        path: '/' + adapter.config.password + '/?' + data
    };
    adapter.log.debug('Send command "' + data + '" to ' + adapter.config.ip);

    // Set up the request
    http.get(options, function (res) {
        var xmldata = '';
        res.setEncoding('utf8');
        res.on('error', function (e) {
            adapter.log.warn(e.toString());
        });
        res.on('data', function (chunk) {
            xmldata += chunk;
        });
        res.on('end', function () {
            adapter.log.debug('Response "' + xmldata + '"');

            // Set state only if positive response from megaD
            if (adapter.config.ports[port].digital) {
                adapter.setState(adapter.config.ports[port].id, value ? true : false, true);
            } else if (adapter.config.ports[port].isRollo) {
                adapter.setState(adapter.config.ports[port].id, ((255 - value) / 255).toFixed(2), true);
            } else {
                var f = (value / 256) * adapter.config.ports[port].factor + adapter.config.ports[port].offset;
                adapter.setState(adapter.config.ports[port].id, f.toFixed(4), true);
            }
        });
    }).on('error', function (e) {
        adapter.log.warn("Got error by post request " + e.toString());
    });
}

function createState(port, callback) {
    var id = port.name.replace(/[.\s]+/g, '_');
    if (port.room) adapter.addStateToEnum('room', port.room, '', 'ports', id);

    var native = JSON.parse(JSON.stringify(port));
    if (native.name !== undefined) delete native.name;
    if (native.room !== undefined) delete native.room;
    var common = {
        name:   port.name,
        def:    false,
        role:   'indicator',
        type:   port.digital ? 'boolean' : 'number',
        read:   'true',
        write:  (port.input || false).toString()
    };

    adapter.createState('', 'ports', id, common, native, function () {
        if (callback) callback({_id: id, common: common, native: native});
    });
}

function addState(port, callback) {
    adapter.getObject('ports', function (err, obj) {
        if (err || !obj) {
            // if root does not exist, channel will not be created
            adapter.createChannel('', 'ports', [], function () {
                createState(port, callback);
            });
        } else {
            createState(port, callback);
        }
    });
}

/*
{
    "name":    "port0",
    "input":   true,
    "switch":  true,
    "offset":  0,
    "factor":  1
    "digital": true
}
*/

function syncObjects() {
    // read all objects of the device
    adapter.getStatesOf('', 'ports', function (err, _states) {
        var configToDelete = [];
        var configToAdd    = [];
        var k;
        var id;
        if (adapter.config.ports) {
            for (k = 0; k < adapter.config.ports.length; k++) {
                configToAdd.push(adapter.config.ports[k].name);
            }
        }

        if (_states) {
            for (var j = 0; j < _states.length; j++) {
                var pos = configToAdd.indexOf(_states[j].common.name);
                if (pos != -1) {
                    configToAdd.splice(pos, 1);

                    // Check name and room
                    for (var u = 0; u < adapter.config.ports.length; u++) {
                        if (adapter.config.ports[u].name == _states[j].common.name) {
                            var n1 = JSON.parse(JSON.stringify(_states[j].native));
                            var n2 = JSON.parse(JSON.stringify(adapter.config.ports[u]));
                            if (n2.name !== undefined) delete n2.name;
                            if (n2.room !== undefined) delete n2.room;
                            n2.index = u;
                            n2 = JSON.stringify(n2);

                            if (JSON.stringify(n1) != n2) {
                                n2 = JSON.parse(n2);
                                adapter.extendObject(_states[j]._id, {native: n2});
                            }

                            if (adapter.config.ports[u].room) {
                                adapter.addStateToEnum('room', adapter.config.ports[u].room, '', 'ports', _states[j]._id);
                            } else {
                                adapter.deleteStateFromEnum('room', '', 'ports', _states[j]._id);
                            }
                        }
                    }
                } else {
                    configToDelete.push(_states[j]._id);
                }
            }
        }

        if (configToAdd.length) {
            for (var r = 0; r < adapter.config.ports.length; r++) {
                if (configToAdd.indexOf(adapter.config.ports[r].name) != -1) {
                    addState(adapter.config.ports[r]);
                }
            }
        }
        if (configToDelete.length) {
            for (var e = 0; e < configToDelete.length; e++) {
                adapter.deleteStateFromEnum('room', '', 'ports', configToDelete[e]);
                adapter.deleteState('', 'ports', configToDelete[e]);
            }
        }

        if (adapter.config.ports) {
            for (k = 0; k < adapter.config.ports.length; k++) {
                adapter.config.ports[k].id = 'ports.' + adapter.config.ports[k].name.replace(/[.\s]+/g, '_');
                adapter.config.ports[k].digital = (adapter.config.ports[k].digital === true || adapter.config.ports[k].digital === 'true');
                adapter.config.ports[k].switch  = (adapter.config.ports[k].switch  === true || adapter.config.ports[k].switch  === 'true');
                adapter.config.ports[k].input   = (adapter.config.ports[k].input   === true || adapter.config.ports[k].input   === 'true');
                adapter.config.ports[k].factor  = parseFloat(adapter.config.ports[k].factor);
                adapter.config.ports[k].offset  = parseFloat(adapter.config.ports[k].offset);
                if (!adapter.config.ports[k].factor) {
                    adapter.config.ports[k].factor = 1;
                    adapter.log.error('Invalid factor 0 for port ' + k + '/"' + adapter.config.ports[k].name + '". Set factor to 1');
                }
                ports[adapter.config.ports[k].id] = adapter.config.ports[k];
            }
        }
        
        pollStatus();
        setInterval(pollStatus, adapter.config.pollInterval * 1000);
    });
}

//settings: {
//    "port":   8080,
//    "auth":   false,
//    "secure": false,
//    "bind":   "0.0.0.0", // "::"
//    "cache":  false
//}
function main() {
    if (adapter.config.port) {
        server = require('http').createServer(restApi);

        adapter.getPort(adapter.config.port, function (port) {
            if (port != adapter.config.port && !adapter.config.findNextPort) {
                adapter.log.warn('port ' + adapter.config.port + ' already in use');
            } else {
                server.listen(port);
                adapter.log.info('http server listening on port ' + port);
            }
        });
    } else {
        adapter.log.info('No port specified');
    }
    syncObjects();
    adapter.subscribeStates('*');
    processMessages(true);
}



