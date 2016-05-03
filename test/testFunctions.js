var expect = require('chai').expect;
var setup  = require(__dirname + '/lib/setup');
var megad  = require(__dirname + '/lib/megaSimulator');

var objects = null;
var states  = null;
var onStateChanged = null;
var onObjectChanged = null;

function checkConnectionOfAdapter(cb, counter) {
    counter = counter || 0;
    if (counter > 20) {
        cb && cb('Cannot check connection');
        return;
    }

    states.getState('system.adapter.megad.0.alive', function (err, state) {
        if (err) console.error(err);
        if (state && state.val) {
            cb && cb();
        } else {
            setTimeout(function () {
                checkConnectionOfAdapter(cb, counter + 1);
            }, 1000);
        }
    });
}

function checkValueOfState(id, value, cb, counter) {
    counter = counter || 0;
    if (counter > 20) {
        cb && cb('Cannot check value Of State ' + id);
        return;
    }

    states.getState(id, function (err, state) {
        if (err) console.error(err);
        if (value === null && !state) {
            cb && cb();
        } else
        if (state && (value === undefined || state.val === value)) {
            cb && cb();
        } else {
            setTimeout(function () {
                checkValueOfState(id, value, cb, counter + 1);
            }, 500);
        }
    });
}

describe('Test MegaD', function() {
    before('Test MegaD: Start js-controller', function (_done) {
        this.timeout(600000); // because of first install from npm

        setup.setupController(function () {
            var config = setup.getAdapterConfig();
            // enable adapter
            config.common.enabled  = true;
            config.common.loglevel = 'debug';

            config.native.ip   = '127.0.0.1:8087';
            config.native.name = "";
            config.native.port = "7878";
            config.native.pollInterval = "30";
            config.native.password = "sec";
            config.native.longPress = "700";
            config.native.doublePress = "600";

            config.native.ports = [
                {
                    "ecmd": "",
                    "eth": "",
                    "naf": 0,
                    "misc": 0,
                    "d": 0,
                    "m": 1,
                    "pty": 0,
                    "name": "P0",
                    "long": false,
                    "double": false,
                    "role": "state",
                    "room": ""
                },
                {
                    "pwm": 0,
                    "d": 0,
                    "m": 0,
                    "pty": 1,
                    "name": "P1",
                    "role": "button",
                    "room": ""
                },
                {
                    "pwm": 0,
                    "d": 0,
                    "m": 0,
                    "pty": 1,
                    "name": "P2",
                    "role": "state",
                    "room": ""
                },
                {
                    "misc": 5,
                    "ecmd": "",
                    "eth": "",
                    "naf": 0,
                    "m": 0,
                    "pty": 2,
                    "name": "P3",
                    "offset": 0,
                    "factor": 1,
                    "role": "value",
                    "room": ""
                },
                {
                    "misc": 0,
                    "ecmd": "",
                    "eth": "",
                    "naf": 1,
                    "pty": 3,
                    "m": 1,
                    "d": 0,
                    "name": "P4",
                    "role": "value.temperature",
                    "room": ""
                },
                {
                    "misc": 0,
                    "ecmd": "",
                    "eth": "",
                    "naf": 1,
                    "pty": 3,
                    "m": 1,
                    "d": 0,
                    "name": "P5",
                    "role": "value.temperature",
                    "room": ""
                },
                {
                    "pwm": 0,
                    "d": 0,
                    "m": 0,
                    "pty": 1,
                    "name": "P6",
                    "role": "button",
                    "room": ""
                },
                {
                    "ecmd": "",
                    "eth": "",
                    "naf": 0,
                    "misc": 0,
                    "d": 0,
                    "m": "0",
                    "pty": 0,
                    "name": "P7",
                    "long": false,
                    "double": false,
                    "role": "state",
                    "room": ""
                },
                {
                    "pty": 0,
                    "name": "P8",
                    "ecmd": "",
                    "eth": "",
                    "m": 0,
                    "long": false,
                    "double": false,
                    "role": "state",
                    "room": ""
                },
                {
                    "pty": 0,
                    "name": "P9",
                    "ecmd": "",
                    "eth": "",
                    "m": 0,
                    "long": false,
                    "double": false,
                    "role": "state",
                    "room": ""
                },
                {
                    "pty": 0,
                    "name": "P10",
                    "ecmd": "",
                    "eth": "",
                    "m": 0,
                    "long": false,
                    "double": false,
                    "role": "state",
                    "room": ""
                },
                {
                    "pty": 0,
                    "name": "P11",
                    "ecmd": "",
                    "eth": "",
                    "m": 0,
                    "long": false,
                    "double": false,
                    "role": "state",
                    "room": ""
                },
                {
                    "pty": 0,
                    "name": "P12",
                    "ecmd": "",
                    "eth": "",
                    "m": 0,
                    "long": false,
                    "double": false,
                    "role": "state",
                    "room": ""
                },
                {
                    "pty": 0,
                    "name": "P13",
                    "ecmd": "",
                    "eth": "",
                    "m": 0,
                    "long": false,
                    "double": false,
                    "role": "state",
                    "room": ""
                },
                {
                    "pty": 2,
                    "name": "A6",
                    "ecmd": "",
                    "eth": "",
                    "m": 0,
                    "factor": 1,
                    "offset": 0,
                    "role": "state",
                    "room": ""
                },
                {
                    "pty": 2,
                    "name": "A7",
                    "ecmd": "",
                    "eth": "",
                    "m": 0,
                    "factor": 1,
                    "offset": 0,
                    "role": "state",
                    "room": ""
                },
                {
                    "pty": 0,
                    "name": "P16",
                    "ecmd": "",
                    "eth": "",
                    "m": 0,
                    "long": false,
                    "double": false,
                    "role": "state",
                    "room": ""
                }
            ];

            setup.setAdapterConfig(config.common, config.native);

            setup.startController(true, function (id, obj) {
                    if (onObjectChanged) onObjectChanged(id, obj);
                }, function (id, state) {
                    if (onStateChanged) onStateChanged(id, state);
                },
                function (_objects, _states) {
                    objects = _objects;
                    states  = _states;
                    states.subscribe('*');
                    _done();
                });
            megad.main();
        });
    });

    it('Test MegaD: Check if adapter started', function (done) {
        this.timeout(5000);
        checkConnectionOfAdapter(done);
    });

    it('Test MegaD: check creation of state', function (done) {
        this.timeout(5000);
        checkValueOfState('megad.0.info.connection', true, function () {
            done();
        }, 10);
    });

    it('Test MegaD: check disconnection', function (done) {
        this.timeout(15000);
        megad.stop();
        checkValueOfState('megad.0.info.connection', false, function () {
            done();
        }, 10);
    });

    after('Test MegaD: Stop js-controller', function (done) {
        this.timeout(6000);

        setup.stopController(function (normalTerminated) {
            console.log('Adapter normal terminated: ' + normalTerminated);
            done();
        });
    });
});