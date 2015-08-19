var fs   = require('fs');
var http = require('http');
var server;

// pwd: пароль для доступа к Web-интерфейсу устройства (макс. 3 байт)
// eip: IP-адрес устройства
// sip: IP-адрес сервера
// sct: скрипт, который вызывается на сервере в случаях, заданных пользователем (макс. 15 байт)
// pr: Пресет. Значения: 0 - пресет не установлен, 1 - пресет для исполнительного модуля MegaD-7I7O
// tc: Проверка значений встроенного температурного сенсора. Значения: 0 - не проверять, 1 - проверять
// at: Значение температуры, при достижении которого в случае, если задана проверка встроенного температурного датчика, устройство будет отправлять сообщения на сервер
var config = {
    eip:      '0.0.0.0',
    port:     8087, // Simulation option
    pwd:      'sec',
    sip:      '127.0.0.0:9001',
    sct:      '?pt=',
    pr:       0,
    tc:       0,
    at:       20
};

var ports = [
    // 0
    //response: 'temp:20/hum:50;OFF/0<br>;OFF/0;OFF/0<br>;OFF/0;OFF/0<br>;temp:21.5;OFF;OFF;OFF;OFF;OFF;OFF;OFF;282;298',
    {
        pty:     0,      // 0 - In, 1 - Out, 2 - ADC, 3 Digital Sensor, 255 - Non configured

        // --------------------  INPUT ----------------------------------
        ecmd:    '',     // Action. Сценарий по умолчанию, в котором задано управление Выходами (OUT) устройства в случае изменения состояния входа.
                         // См. раздел "Сценарии" (макс: 11 байт). Примечание.
                         // Сценарий выполняется всегда, если не указан сервер или если сервер указан, но не отвечает в течение 3 секунд.
                         // Сценарий по умолчанию не выполняется, если сервер указан и доступен.
        eth:     '?pt=', // Net Action. URL, который вызывается устройством в случае изменения состояние входа (макс. 35 байт).
                         // Примечание. URL Net Action вызывается всегда, не зависимо от доступности сервера.

        m:       0,      // Режим обработки изменений состояния порта. Для наглядности приведены примеры с выключателем/кнопкой.
                         // 0 - Переход из разомкнутого в замкнутое состояние (устройство реагирует только на нажатие кнопки).
                         // 1 - Переход из разомкнутого в замкнутое состояние и наоборот (устройство реагирует как на нажатия, так и на отпускание
                         // 2 - Переход из замкнутого в разомкнутое состояние (устройство реагирует только на отпускание кнопки)

        d:       0,      // Default state
        value:   0
    },
    {
        pty:     1,      // 0 - In, 1 - Out, 2 - ADC, 3 Digital Sensor, 255 - Non configured

        // ------------------------- OUTPUT DIGITAL -------------------------------
        m:       0,      // Mode. Режи работы выхода.
                         // 0 - SW. Режим ключа. Состояние вкл/выкл
                         // 1 - PWM. Режим ШИМ. (Данная опция доступна не для всех портов!)

        d:       0       // Default state. Состояние выхода по умолчанию при включении устройства.
                         // 0 - Порт выключен
                         // 1 - Порт включен
    },
    {
        pty:     1,      // 0 - In, 1 - Out, 2 - ADC, 3 Digital Sensor, 255 - Non configured

        // ------------------------- OUTPUT ANALOG -------------------------------
        m:       1,      // Mode. Режи работы выхода.
                         // 0 - SW. Режим ключа. Состояние вкл/выкл
                         // 1 - PWM. Режим ШИМ. (Данная опция доступна не для всех портов!)

        d:       0,     // Default state. Состояние выхода по умолчанию при включении устройства.
                        // 0 - Порт выключен
                        // 1 - Порт включен
        value:   0
    },
    {
        pty:     2,      // 0 - In, 1 - Out, 2 - ADC, 3 Digital Sensor, 255 - Non configured

        // ------------------------- INPUT ADC -------------------------------
        m:       0,      // Mode. Режим обработки изменений состояния порта
                         // 1 - >  Порт считается активным, если значение больше заданного порога. Активностью считается момент перехода через пороговое значение
                         // 2 - <  Порт считается активным, если значение меньше заданного порога. Активностью считается момент перехода через пороговое значение
                         // 3 - <> Порт считается активным, если значение проходит порог как в меньшую, так и в большую сторону.

        ecmd:    '',     // Action. Сценарий по умолчанию, в котором задано управление Выходами (OUT) устройства в случае изменения состояния входа.
                         // См. раздел "Сценарии" (макс: 11 байт). Примечание.
                         // Сценарий выполняется всегда, если не указан сервер или если сервер указан, но не отвечает в течение 3 секунд.
                         // Сценарий по умолчанию не выполняется, если сервер указан и доступен.

        eth:     '?pt=', // Net Action. URL, который вызывается устройством в случае изменения состояние входа (макс. 35 байт).
                         // Примечание. URL Net Action вызывается всегда, не зависимо от доступности сервера.

        misc:    50,     // Val. Пороговое значение

        d:       0,      // Default state. Состояние выхода по умолчанию при включении устройства.
                         // 0 - Порт выключен
                         // 1 - Порт включен
        value:   25
    },
    {
        pty:     3,      // 0 - In, 1 - Out, 2 - ADC, 3 Digital Sensor, 255 - Non configured

        // ------------------------- INPUT Digital Sensor - No type -------------------------------
        m:       0,     // Sensor. Тип подключенного датчика
                        // 1 - DHT11
                        // 2 - DHT22
        value:   45.6
    },
    {
        pty:     3,      // 0 - In, 1 - Out, 2 - ADC, 3 Digital Sensor, 255 - Non configured

        // ------------------------- INPUT Digital Sensor - DHT11 -------------------------------
        m:       1,     // Sensor. Тип подключенного датчика
        // 1 - DHT11
        // 2 - DHT22
        value:   45.6,
        humidity:   27
    }
];

function getState(port) {
    if (ports[port].pty == 0) {
        return ports[port].value ? 'ON' : 'OFF';
    } else if (ports[port].pty == 1) {
        return (ports[port].value ? 'ON' : 'OFF') + '/' + ports[port].d;
    } else if (ports[port].pty == 2) {
        return ports[port].value;
    } else if (ports[port].pty == 3 && ports[port].m == 0) {
        return 'temp:' + ports[port].value;
    } if (ports[port].pty == 3) {
        return 'temp:' + ports[port].value + '/hum:' + ports[port].humidity;
    }
}

function checkPorts () {
    // TO DO: if at or
}

function requestProcessor(req, res) {
    var url = decodeURI(req.url);
    console.log('Request: ' + url);

    //http://192.168.0.14/sec/?cf=1&eip=192.168.0.14&pwd=sec
    //http://192.168.0.14/sec/?cmd=7:2
    //http://192.168.0.14/sec/?cmd=all => temp:20/hum:50;OFF/0<br>;OFF/0;OFF/0<br>;OFF/0;OFF/0<br>;temp/21.5;OFF;OFF;OFF;OFF;OFF;OFF;OFF;282;298
    //http://192.168.0.14/sec/?pt=1&cmd=get
    //http://192.168.0.14/sec/?tget=1
    var parts = url.split('/');
    if (parts[1] != config.pwd) {
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end('Invalid password', 'utf8');
        return;
    }
    if (!parts[2] || parts[2][0] != '?') {
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end('No query found: ' + parts[2], 'utf8');
        return;
    } else {
        parts[2] = parts[2].substring(1);
    }

    var params = parts[2].split('&');
    var args = {};
    for (var p = 0; p < params.length; p++) {
        var q = params[p].split('=');
        args[q[0]] = q[1];
    }

    if (args.pt) {
        if (!ports[args.pt]) {
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end('Invalid port: ' + args.pt, 'utf8');
        } else {
            var text = 'OK';
            if (args.pty !== undefined) {
                if (args.pty == 0 || args.pty == 1 || args.pty == 2 || args.pty == 3 || args.pty == 255) {
                    console.log('Set new type for port ' + args.pt + ': ' + ports[args.pt].pty + ' => ' + args.pty);
                    ports[args.pt].pty = args.pty;
                } else {
                    res.writeHead(500, {'Content-Type': 'text/plain'});
                    res.end('Invalid port type: ' + args.pty, 'utf8');
                    return;
                }
            }
            // In. Порт является Входом
            if (ports[args.pt].pty == 0) {
                if (args.ecmd !== undefined) {
                    console.log('Set new ecmd for port ' + args.pt + ': ' + ports[args.pt].ecmd + ' => ' + args.ecmd);
                    ports[args.pt].ecmd = args.ecmd;
                }
                if (args.eth !== undefined) {
                    console.log('Set new eth for port ' + args.pt + ': ' + ports[args.pt].eth + ' => ' + args.eth);
                    ports[args.pt].eth = args.eth;
                }
                if (args.m !== undefined) {
                    if (args.m == 0 || args.m == 1 || args.m == 2) {
                        console.log('Set new mode for port ' + args.pt + ': ' + ports[args.pt].m + ' => ' + args.m);
                        ports[args.pt].m = args.m;
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Invalid port mode: ' + args.m, 'utf8');
                        return;
                    }
                }
                // show settings
                text = '<p>P' + args.pt + ' - Input</p>';
                text += '<p title="Сценарий по умолчанию, в котором задано управление Выходами (OUT) устройства в случае изменения состояния входа. (макс: 11 байт). Примечание. Сценарий выполняется всегда, если не указан сервер или если сервер указан, но не отвечает в течение 3 секунд. Сценарий по умолчанию не выполняется, если сервер указан и доступен.">' +
                    'ecmd - Action: ' + ports[args.pt].ecmd + '</p>';

                text += '<p title="URL, который вызывается устройством в случае изменения состояние входа (макс. 35 байт). Примечание. URL Net Action вызывается всегда, не зависимо от доступности сервера.">' +
                    'eth - Net Action: ' + ports[args.pt].eth + '</p>';

                var modes = [
                    "Переход из разомкнутого в замкнутое состояние (устройство реагирует только на нажатие кнопки).",
                    "Переход из разомкнутого в замкнутое состояние и наоборот (устройство реагирует как на нажатия, так и на отпускание кнопки)",
                    "Переход из замкнутого в разомкнутое состояние (устройство реагирует только на отпускание кнопки)"
                ];

                text += '<p title="Режим обработки изменений состояния порта. Для наглядности приведены примеры с выключателем/кнопкой.">' +
                    'm - Mode: ' + ports[args.pt].m + ' - ' + modes[ports[args.pt].m || 0] + '</p>';

            } else
            // Out. Порт является Выходом
            if (ports[args.pt].pty == 1) {
                if (args.m !== undefined) {
                    if (args.m == 0) {
                        console.log('Set new mode SWITCH for port ' + args.pt + ': ' + ports[args.pt].m + ' => ' + args.m);
                        ports[args.pt].m = args.m;
                    } else if (args.m == 1) {
                        console.log('Set new mode PWM for port ' + args.pt + ': ' + ports[args.pt].m + ' => ' + args.m);
                        ports[args.pt].m = args.m;
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Invalid port mode: ' + args.m, 'utf8');
                        return;
                    }
                }
                if (args.d !== undefined) {
                    if (args.d == 0 || args.d == 1) {
                        console.log('Set new default state for port ' + args.pt + ': ' + ports[args.pt].d + ' => ' + args.d);
                        ports[args.pt].d = args.d;
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Invalid port default state: ' + args.d, 'utf8');
                        return;
                    }
                }
                if (args.pwm !== undefined) {
                    if (args.pwm >= 0 || args.pwm <= 255) {
                        console.log('Set new default state for port ' + args.pt + ': ' + ports[args.pt].pwm + ' => ' + args.pwm);
                        ports[args.pt].d = args.d;
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Invalid port PWM value: ' + args.pwm, 'utf8');
                        return;
                    }
                }

                // show settings
                text = '<p>P' + args.pt + ' - Output</p>';
                text += '<p title="Состояние выхода по умолчанию при включении устройства.">' +
                    'd: Default state: ' + ports[args.pt].d + ' - ' + (ports[args.pt].d ? 'Порт выключен' : 'Порт включен') + '</p>';

                var modes = [
                    "0 - SW. Режим ключа. Состояние вкл/выкл",
                    "1 - PWM. Режим ШИМ. (Данная опция доступна не для всех портов!)"
                ];

                text += '<p title="Режим работы выхода.">' +
                    'm - Mode: ' + ports[args.pt].m + ' - ' + modes[ports[args.pt].m || 0] + '</p>';

                text += '<p title="Значение ШИМ. В случае, если порт настроек как ШИМ. Значения от 0 до 255.">' +
                    'pwm - ШИМ: ' + ports[args.pt].pwm + '</p>';
            } else
            // ADC (АЦП) ЦАП (для подключения аналоговых датчиков, данная опция доступна не для всех портов!)
            if (ports[args.pt].pty == 2) {
                if (args.m !== undefined) {
                    if (args.m == 0) {
                        console.log('Set new mode NORM for port ' + args.pt + ': ' + ports[args.pt].m + ' => ' + args.m);
                        ports[args.pt].m = args.m;
                    } else if (args.m == 1) {
                        console.log('Set new mode ">" for port '  + args.pt + ': ' + ports[args.pt].m + ' => ' + args.m);
                        ports[args.pt].m = args.m;
                    } else if (args.m == 2) {
                        console.log('Set new mode "<" for port '  + args.pt + ': ' + ports[args.pt].m + ' => ' + args.m);
                        ports[args.pt].m = args.m;
                    } else if (args.m == 3) {
                        console.log('Set new mode "<>" for port ' + args.pt + ': ' + ports[args.pt].m + ' => ' + args.m);
                        ports[args.pt].m = args.m;
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Invalid port mode: ' + args.m, 'utf8');
                        return;
                    }
                }
                if (args.misc !== undefined) {
                    console.log('Set new threshold for port ' + args.pt + ': ' + ports[args.pt].misc + ' => ' + args.misc);
                    ports[args.pt].misc = args.misc;
                }
                if (args.ecmd !== undefined) {
                    console.log('Set new ecmd for port ' + args.pt + ': ' + ports[args.pt].ecmd + ' => ' + args.ecmd);
                    ports[args.pt].ecmd = args.ecmd;
                }
                if (args.eth !== undefined) {
                    console.log('Set new eth for port ' + args.pt + ': ' + ports[args.pt].eth + ' => ' + args.eth);
                    ports[args.pt].eth = args.eth;
                }

                // show settings
                text = '<p>P' + args.pt + ' - ADC</p>';
                var modes = [
                    "0 - Norm. Значения порта автоматически не отслеживаются",
                    "1 - > Порт считается активным, если значение больше заданного порога. Активностью считается момент перехода через пороговое значение",
                    "2 - < Порт считается активным, если значение меньше заданного порога. Активностью считается момент перехода через пороговое значение",
                    "3 - <> Порт считается активным, если значение проходит порог как в меньшую, так и в большую сторону.",
                ];

                text += '<p title="Режим обработки изменений состояния порта">' +
                    'm - Mode: ' + ports[args.pt].m + ' - ' + modes[ports[args.pt].m || 0] + '</p>';

                text += '<p title="Пороговое значение">' +
                    'misc: Val: ' + ports[args.pt].misc + '</p>';

                text += '<p title="Сценарий по умолчанию, в котором задано управление Выходами (OUT) устройства в случае изменения состояния входа. (макс: 11 байт). Примечание. Сценарий выполняется всегда, если не указан сервер или если сервер указан, но не отвечает в течение 3 секунд. Сценарий по умолчанию не выполняется, если сервер указан и доступен.">' +
                    'ecmd - Action: ' + ports[args.pt].ecmd + '</p>';

                text += '<p title="URL, который вызывается устройством в случае изменения состояние входа (макс. 35 байт). Примечание. URL Net Action вызывается всегда, не зависимо от доступности сервера.">' +
                    'eth - Net Action: ' + ports[args.pt].eth + '</p>';

            }
            // DSen. К порту подключен цифровой датчик
            else if (ports[args.pt].pty == 3) {
                if (args.m !== undefined) {
                    if (args.m == 0) {
                        console.log('Set new DHT type BASIC for port ' + args.pt + ': ' + ports[args.pt].m + ' => ' + args.m);
                        ports[args.pt].m = args.m;
                    } else if (args.m == 1) {
                        console.log('Set new DHT type DHT11 for port ' + args.pt + ': ' + ports[args.pt].m + ' => ' + args.m);
                        ports[args.pt].m = args.m;
                    } else if (args.m == 2) {
                        console.log('Set new DHT type DHT22 for port ' + args.pt + ': ' + ports[args.pt].m + ' => ' + args.m);
                        ports[args.pt].m = args.m;
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Invalid port mode: ' + args.m, 'utf8');
                        return;
                    }
                }
                // show settings
                text = '<p>P' + args.pt + ' - ADC</p>';
                var modes = [
                    "0 - invalid",
                    "1 - DHT11",
                    "2 - DHT22"
                ];

                text += '<p title="Тип подключенного датчика">' +
                    'm - Sensor: ' + ports[args.pt].m + ' - ' + modes[ports[args.pt].m || 0] + '</p>';
            } else
            // 255 - NC. Не сконфигурирован
            {
                text = '<p>P' + args.pt + ' - ADC</p>';
                text += '255 - NC. Не сконфигурирован';
            }
            fs.writeFileSync(__dirname + '/config.json', JSON.stringify({config: config, ports: ports}, null, 2));
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(text, 'utf8');
        }
    } else
    if (args.cf) {
        if (args.cf != 1) {
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end('Invalid config mode: ' + args.cf, 'utf8');
            return;
        }

        // pwd: пароль для доступа к Web-интерфейсу устройства (макс. 3 байт)
        // eip: IP-адрес устройства
        // sip: IP-адрес сервера
        // sct: скрипт, который вызывается на сервере в случаях, заданных пользователем (макс. 15 байт)
        // pr: Пресет. Значения: 0 - пресет не установлен, 1 - пресет для исполнительного модуля MegaD-7I7O
        // tc: Проверка значений встроенного температурного сенсора. Значения: 0 - не проверять, 1 - проверять
        // at: Значение температуры, при достижении которого в случае, если задана проверка встроенного температурного датчика, устройство будет отправлять сообщения на сервер
        if (args.pwd !== undefined) {
            if (args.pwd.length > 3) {
                res.writeHead(500, {'Content-Type': 'text/plain'});
                res.end('Password is too long: ' + args.pwd, 'utf8');
                return;
            }
            console.log('Set new password: ' + config.pwd + ' => ' + args.pwd);
            config.pwd = args.pwd;
        }
        if (args.sip !== undefined) {
            console.log('Set new server IP address: ' + config.sip + ' => ' + args.sip);
            config.sip = args.sip;
        }
        if (args.sct !== undefined) {
            console.log('Set new server script: ' + config.sct + ' => ' + args.sct);
            config.sct = args.sct;
        }
        if (args.tc !== undefined) {
            console.log('Set new temp control: ' + config.tc + ' => ' + args.tc);
            config.tc = args.tc;
            checkPorts();
        }
        if (args.at !== undefined) {
            console.log('Set new temp control threshold: ' + config.at + ' => ' + args.at);
            config.at = args.at;
        }
        if (args.eip !== undefined) {
            // Just simulation
            console.log('Set new own IP address: ' + config.eip + ' => ' + args.eip);
            config.eip = args.eip;
        }
        fs.writeFileSync(__dirname + '/config.json', JSON.stringify({config: config, ports: ports}, null, 2));
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('OK', 'utf8');
    } else if (args.cmd) {
        if (args.cmd == 'get') {
            if (!ports[args.pt]) {
                res.writeHead(500, {'Content-Type': 'text/plain'});
                res.end('Invalid port: ' + args.pt, 'utf8');
            } else {
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end(getState(args.pt), 'utf8');
            }
        } else
        if (args.cmd == 'all') {
            var response = [];
            for (var i = 0; i < ports.length; i++) {
                response.push(getState(i));
            }
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end(response.join(';'), 'utf8');
        } else {
            // Set port
            var r = args.cmd ? args.cmd.split(':') : [];
            if (r.length == 2) {
                if (ports[r[0]].pty != 1) {
                    res.writeHead(500, {'Content-Type': 'text/plain'});
                    res.end('Try to control non output port ' + r[0], 'utf8');
                } else {
                    if (!ports[r[0]].m) {
                        if (r[1] == '2') {
                            ports[r[0]].value = !ports[r[0]].value;
                        } else if (r[1] == '0') {
                            ports[r[0]].value = 0;
                        } else if (r[1] == '1') {
                            ports[r[0]].value = 1;
                        } else  {
                            res.writeHead(500, {'Content-Type': 'text/plain'});
                            res.end('Invalid value for digital port ' + r[0] + ': '  + r[1], 'utf8');
                            return;
                        }
                    } else {
                        ports[r[0]].value = r[1];
                    }
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('OK', 'utf8');
                }
            } else {
                res.writeHead(500, {'Content-Type': 'text/plain'});
                res.end('Invalid cmd: ' + args.cmd, 'utf8');
            }
        }
    } else if (args.tget) {
        if (args.tget == 1) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end((Math.random() * 30).toFixed(1), 'utf8');
        } else {
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end('Unknown tget request: ' + args.tget, 'utf8');
        }
    } else {
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end('Unknown command', 'utf8');
    }

    //http://192.168.0.250/megad.php?pt=5
    //http://192.168.0.250/megad.php?pt=5&m=1
    //http://192.168.0.250/megad.php?at=25
}

function main() {
    if (fs.existsSync(__dirname + '/config.json')) {
        try {
            var cfg = fs.readFileSync(__dirname + '/config.json').toString();
            cfg = JSON.parse(cfg);
            config = cfg.config;
            ports  = cfg.ports;
        } catch (e) {
            console.log('Cannot parse or read config.json');
        }
    }

    server = require('http').createServer(requestProcessor);
    server.listen(config.port);
    console.log('Server started on port: ' + config.port);
}

main();