var fs       = require('fs');
var http     = require('http');
var keypress = require('keypress');
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
    sip:      '127.0.0.1:9001',
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

        d:       0,      // Default state. Состояние выхода по умолчанию при включении устройства.
                         // 0 - Порт выключен
                         // 1 - Порт включен
        value:   0
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
        d:       0,     // Sensor. Тип подключенного датчика
                        // 1 - DHT11
                        // 2 - DHT22
                        // 3 - 1wire
                        // 4 - iB

        m:       0,      // Режим обработки изменений состояния порта. Для наглядности приведены примеры с выключателем/кнопкой.
        // 0 - Переход из разомкнутого в замкнутое состояние (устройство реагирует только на нажатие кнопки).
        // 1 - Переход из разомкнутого в замкнутое состояние и наоборот (устройство реагирует как на нажатия, так и на отпускание
        // 2 - Переход из замкнутого в разомкнутое состояние (устройство реагирует только на отпускание кнопки)

        ecmd:    '',     // Action. Сценарий по умолчанию, в котором задано управление Выходами (OUT) устройства в случае изменения состояния входа.
        // См. раздел "Сценарии" (макс: 11 байт). Примечание.
        // Сценарий выполняется всегда, если не указан сервер или если сервер указан, но не отвечает в течение 3 секунд.
        // Сценарий по умолчанию не выполняется, если сервер указан и доступен.

        eth:     '?pt=', // Net Action. URL, который вызывается устройством в случае изменения состояние входа (макс. 35 байт).
        // Примечание. URL Net Action вызывается всегда, не зависимо от доступности сервера.

        misc:    50,     // Val. Пороговое значение

        value:   45.6
    },
    {
        pty:     3,      // 0 - In, 1 - Out, 2 - ADC, 3 Digital Sensor, 255 - Non configured

        // ------------------------- INPUT Digital Sensor - DHT11 -------------------------------
        d:       1,      // Sensor. Тип подключенного датчика
                         // 1 - DHT11
                         // 2 - DHT22
                         // 3 - 1wire
                         // 4 - iB
        m:       0,      // Режим обработки изменений состояния порта. Для наглядности приведены примеры с выключателем/кнопкой.
                         // 0 - Переход из разомкнутого в замкнутое состояние (устройство реагирует только на нажатие кнопки).
                         // 1 - Переход из разомкнутого в замкнутое состояние и наоборот (устройство реагирует как на нажатия, так и на отпускание
                         // 2 - Переход из замкнутого в разомкнутое состояние (устройство реагирует только на отпускание кнопки)

        ecmd:    '',     // Action. Сценарий по умолчанию, в котором задано управление Выходами (OUT) устройства в случае изменения состояния входа.
                         // См. раздел "Сценарии" (макс: 11 байт). Примечание.
                         // Сценарий выполняется всегда, если не указан сервер или если сервер указан, но не отвечает в течение 3 секунд.
                         // Сценарий по умолчанию не выполняется, если сервер указан и доступен.

        eth:     '?pt=', // Net Action. URL, который вызывается устройством в случае изменения состояние входа (макс. 35 байт).
                         // Примечание. URL Net Action вызывается всегда, не зависимо от доступности сервера.

        misc:    51,     // Val. Пороговое значение
        value:   45.6,
        humidity:   27
    }
];

function getState(port) {
    if (ports[port].pty == 0) {
        return (ports[port].value ? 'ON' : 'OFF') + '/' + (ports[port].counter || 0);
    } else if (ports[port].pty == 1) {
        if (ports[port].m) {
            return (ports[port].value);
        } else {
            return (ports[port].value ? 'ON' : 'OFF');
        }
    } else if (ports[port].pty == 2) {
        return (ports[port].value || 0);
    } else if (ports[port].pty == 3 && (ports[port].d == 0 || ports[port].d == 3)) {
        return 'temp:' + (ports[port].value || 0);
    } else if (ports[port].pty == 3 && ports[port].d == 4) {
        return 'ID:' + (ports[port].value || 0);
    } else if (ports[port].pty == 3) {
        return 'temp:' + (ports[port].value || 0) + '/hum:' + (ports[port].humidity || 0);
    }
}

function checkPorts () {
    // TO DO: if at or
}

function trigger(port) {
    var parts = config.sip.split(':');

    var options = {
        host: parts[0],
        port: parseInt(parts[1], 10) || 80,
        path: '/' + config.sct + '?pt=' + port
    };

    console.log(JSON.stringify(options));

    try {
        http.get(options, function (res) {
            res.setEncoding('utf8');
            var data = '';
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end', function () {
                console.log('Response: ' + res.statusCode + ' - ' + data);
            });
        }).on('error', function(e) {
            console.error("Got error: " + e.message);
        });
    } catch (e) {
        console.error(e);
    }
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
        console.log('Invalid password "' + parts[1] + '". Expected: "' + config.pwd + '"');
        res.writeHead(500, {'Content-Type': 'text/html'});
        res.end('Invalid password', 'utf8');
        return;
    }
    if (!parts[2] || parts[2][0] != '?') {
        parts[2] = '';
    } else {
        parts[2] = parts[2].substring(1);
    }

    var params = parts[2].split('&');
    var args = {};
    for (var p = 0; p < params.length; p++) {
        var q = params[p].split('=');
        args[q[0]] = q[1];
    }

    if (args.pn !== undefined) {
        args.pn = parseInt(args.pn, 10);
        if (!ports[args.pn]) {
            res.writeHead(500, {'Content-Type': 'text/html'});
            res.end('Invalid port: ' + args.pn, 'utf8');
        } else {
            var text = 'OK';

            if (args.pty !== undefined) {
                args.pty = parseInt(args.pty, 10);
                if (args.pty == 0 || args.pty == 1 || args.pty == 2 || args.pty == 3 || args.pty == 255) {
                    console.log('Set new type          for port ' + args.pn + ': ' + ports[args.pn].pty + ' => ' + args.pty);
                    ports[args.pn].pty = args.pty;
                } else {
                    res.writeHead(500, {'Content-Type': 'text/html'});
                    res.end('Invalid port type: ' + args.pty, 'utf8');
                    return;
                }
            }
            // In. Порт является Входом
            if (ports[args.pn].pty == 0) {
                if (args.ecmd !== undefined) {
                    console.log('Set new ecmd          for port ' + args.pn + ': ' + ports[args.pn].ecmd + ' => ' + args.ecmd);
                    ports[args.pn].ecmd = args.ecmd;
                }
                if (args.eth !== undefined) {
                    console.log('Set new eth           for port ' + args.pn + ': ' + ports[args.pn].eth + ' => ' + args.eth);
                    ports[args.pn].eth = args.eth;
                }
                if (args.m !== undefined) {
                    args.m = parseInt(args.m, 10);
                    if (args.m == 0 || args.m == 1 || args.m == 2) {
                        console.log('Set new mode          for port ' + args.pn + ': ' + ports[args.pn].m + ' => ' + args.m);
                        ports[args.pn].m = args.m;
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/html'});
                        res.end('Invalid port mode: ' + args.m, 'utf8');
                        return;
                    }
                }
                if (args.d !== undefined) {
                    args.d = parseInt(args.d, 10);
                    if (args.d == 0 || args.d == 1) {
                        console.log('Set new debounce      for port ' + args.pn + ': ' + ports[args.pn].d + ' => ' + args.d);
                        ports[args.pn].d = args.d;
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/html'});
                        res.end('Invalid port mode: ' + args.d, 'utf8');
                        return;
                    }
                }
                if (args.misc !== undefined) {
                    args.misc = parseInt(args.misc, 10);
                    if (args.misc == 0 || args.misc == 1) {
                        console.log('Set new misc          for port ' + args.pn + ': ' + ports[args.pn].misc + ' => ' + args.misc);
                        ports[args.pn].misc = args.misc;
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/html'});
                        res.end('Invalid port mode: ' + args.misc, 'utf8');
                        return;
                    }
                }
                // show settings
                text = '<p>P' + args.pn + ' - Input</p>';
                text += '<p title="Сценарий по умолчанию, в котором задано управление Выходами (OUT) устройства в случае изменения состояния входа. (макс: 11 байт). Примечание. Сценарий выполняется всегда, если не указан сервер или если сервер указан, но не отвечает в течение 3 секунд. Сценарий по умолчанию не выполняется, если сервер указан и доступен.">' +
                    'ecmd - Action: ' + ports[args.pn].ecmd + '</p>';

                text += '<p title="URL, который вызывается устройством в случае изменения состояние входа (макс. 35 байт). Примечание. URL Net Action вызывается всегда, не зависимо от доступности сервера.">' +
                    'eth - Net Action: ' + ports[args.pn].eth + '</p>';

                var modes = [
                    "Переход из разомкнутого в замкнутое состояние (устройство реагирует только на нажатие кнопки).",
                    "Переход из разомкнутого в замкнутое состояние и наоборот (устройство реагирует как на нажатия, так и на отпускание кнопки)",
                    "Переход из замкнутого в разомкнутое состояние (устройство реагирует только на отпускание кнопки)"
                ];

                text += '<p title="Режим обработки изменений состояния порта. Для наглядности приведены примеры с выключателем/кнопкой.">' +
                    'm - Mode: ' + ports[args.pn].m + ' - ' + modes[ports[args.pn].m || 0] + '</p>';

            } else
            // Out. Порт является Выходом
            if (ports[args.pn].pty == 1) {
                if (args.m !== undefined) {
                    args.m = parseInt(args.m, 10);
                    if (args.m == 0) {
                        console.log('Set new mode SWITCH   for port ' + args.pn + ': ' + ports[args.pn].m + ' => ' + args.m);
                        ports[args.pn].m = args.m;
                    } else if (args.m == 1) {
                        console.log('Set new mode PWM      for port ' + args.pn + ': ' + ports[args.pn].m + ' => ' + args.m);
                        ports[args.pn].m = args.m;
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/html'});
                        res.end('Invalid port mode: ' + args.m, 'utf8');
                        return;
                    }
                }
                if (args.d !== undefined) {
                    args.d = parseInt(args.d, 10);
                    if (args.d == 0 || args.d == 1) {
                        console.log('Set new default state for port ' + args.pn + ': ' + ports[args.pn].d + ' => ' + args.d);
                        ports[args.pn].d = args.d;
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/html'});
                        res.end('Invalid port default state: ' + args.d, 'utf8');
                        return;
                    }
                }
                if (args.pwm !== undefined) {
                    args.pwm = parseInt(args.pwm, 10);
                    if (args.pwm >= 0 || args.pwm <= 255) {
                        console.log('Set new pwm           for port ' + args.pn + ': ' + ports[args.pn].pwm + ' => ' + args.pwm);
                        ports[args.pn].pwm = args.pwm;
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/html'});
                        res.end('Invalid port PWM value: ' + args.pwm, 'utf8');
                        return;
                    }
                }

                // show settings
                text = '<p>P' + args.pn + ' - Output</p>';
                text += '<p title="Состояние выхода по умолчанию при включении устройства.">' +
                    'd: Default state: ' + ports[args.pn].d + ' - ' + (ports[args.pn].d ? 'Порт выключен' : 'Порт включен') + '</p>';

                var modes = [
                    "0 - SW. Режим ключа. Состояние вкл/выкл",
                    "1 - PWM. Режим ШИМ. (Данная опция доступна не для всех портов!)"
                ];

                text += '<p title="Режим работы выхода.">' +
                    'm - Mode: ' + ports[args.pn].m + ' - ' + modes[ports[args.pn].m || 0] + '</p>';

                text += '<p title="Значение ШИМ. В случае, если порт настроек как ШИМ. Значения от 0 до 255.">' +
                    'pwm - ШИМ: ' + ports[args.pn].pwm + '</p>';
            } else
            // ADC (АЦП) ЦАП (для подключения аналоговых датчиков, данная опция доступна не для всех портов!)
            if (ports[args.pn].pty == 2) {
                if (args.m !== undefined) {
                    args.m = parseInt(args.m, 10);
                    if (args.m == 0) {
                        console.log('Set new mode NORM     for port ' + args.pn + ': ' + ports[args.pn].m + ' => ' + args.m);
                        ports[args.pn].m = args.m;
                    } else if (args.m == 1) {
                        console.log('Set new mode ">"      for port '  + args.pn + ': ' + ports[args.pn].m + ' => ' + args.m);
                        ports[args.pn].m = args.m;
                    } else if (args.m == 2) {
                        console.log('Set new mode "<"      for port '  + args.pn + ': ' + ports[args.pn].m + ' => ' + args.m);
                        ports[args.pn].m = args.m;
                    } else if (args.m == 3) {
                        console.log('Set new mode "<>"     for port ' + args.pn + ': ' + ports[args.pn].m + ' => ' + args.m);
                        ports[args.pn].m = args.m;
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/html'});
                        res.end('Invalid port mode: ' + args.m, 'utf8');
                        return;
                    }
                }
                if (args.naf !== undefined) {
                    args.naf = parseInt(args.naf, 10);
                    if (args.naf == 0 || args.naf == 1) {
                        console.log('Set new naf           for port ' + args.pn + ': ' + ports[args.pn].naf + ' => ' + args.naf);
                        ports[args.pn].naf = args.naf;
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/html'});
                        res.end('Invalid port default state: ' + args.naf, 'utf8');
                        return;
                    }
                }
                if (args.misc !== undefined) {
                    args.misc = parseInt(args.misc, 10);
                    console.log('Set new threshold     for port ' + args.pn + ': ' + ports[args.pn].misc + ' => ' + args.misc);
                    ports[args.pn].misc = args.misc;
                }
                if (args.ecmd !== undefined) {
                    console.log('Set new ecmd          for port ' + args.pn + ': ' + ports[args.pn].ecmd + ' => ' + args.ecmd);
                    ports[args.pn].ecmd = decodeURIComponent(args.ecmd);
                }
                if (args.eth !== undefined) {
                    console.log('Set new eth           for port ' + args.pn + ': ' + ports[args.pn].eth + ' => ' + args.eth);
                    ports[args.pn].eth = decodeURIComponent(args.eth);
                }

                // show settings
                text = '<p>P' + args.pn + ' - ADC</p>';
                var modes = [
                    "0 - Norm. Значения порта автоматически не отслеживаются",
                    "1 - > Порт считается активным, если значение больше заданного порога. Активностью считается момент перехода через пороговое значение",
                    "2 - < Порт считается активным, если значение меньше заданного порога. Активностью считается момент перехода через пороговое значение",
                    "3 - <> Порт считается активным, если значение проходит порог как в меньшую, так и в большую сторону."
                ];

                text += '<p title="Режим обработки изменений состояния порта">' +
                    'm - Mode: ' + ports[args.pn].m + ' - ' + modes[ports[args.pn].m || 0] + '</p>';

                text += '<p title="Пороговое значение">' +
                    'misc: Val: ' + ports[args.pn].misc + '</p>';

                text += '<p title="Сценарий по умолчанию, в котором задано управление Выходами (OUT) устройства в случае изменения состояния входа. (макс: 11 байт). Примечание. Сценарий выполняется всегда, если не указан сервер или если сервер указан, но не отвечает в течение 3 секунд. Сценарий по умолчанию не выполняется, если сервер указан и доступен.">' +
                    'ecmd - Action: ' + ports[args.pn].ecmd + '</p>';

                text += '<p title="URL, который вызывается устройством в случае изменения состояние входа (макс. 35 байт). Примечание. URL Net Action вызывается всегда, не зависимо от доступности сервера.">' +
                    'eth - Net Action: ' + ports[args.pn].eth + '</p>';
            }
            // DSen. К порту подключен цифровой датчик
            else if (ports[args.pn].pty == 3) {
                if (args.d !== undefined) {
                    args.d = parseInt(args.d, 10);
                    if (args.d == 0) {
                        console.log('Set new DHT BASIC     for port ' + args.pn + ': ' + ports[args.pn].d + ' => ' + args.d);
                        ports[args.pn].d = args.d;
                    } else if (args.d == 1) {
                        console.log('Set new DHT DHT11     for port ' + args.pn + ': ' + ports[args.pn].d + ' => ' + args.d);
                        ports[args.pn].d = args.d;
                    } else if (args.d == 2) {
                        console.log('Set new DHT DHT22     for port ' + args.pn + ': ' + ports[args.pn].d + ' => ' + args.d);
                        ports[args.pn].d = args.d;
                    } else if (args.d == 3) {
                        console.log('Set new DHT 1W        for port ' + args.pn + ': ' + ports[args.pn].d + ' => ' + args.d);
                        ports[args.pn].d = args.d;
                    } else if (args.d == 4) {
                        console.log('Set new DHT iB        for port ' + args.pn + ': ' + ports[args.pn].d + ' => ' + args.d);
                        ports[args.pn].d = args.d;
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/html'});
                        res.end('Invalid sensor type: ' + args.d, 'utf8');
                        return;
                    }
                }
                if (args.m !== undefined) {
                    args.m = parseInt(args.m, 10);
                    if (args.m == 0) {
                        console.log('Set new mode NORM     for port ' + args.pn + ': ' + ports[args.pn].m + ' => ' + args.m);
                        ports[args.pn].m = args.m;
                    } else if (args.m == 1) {
                        console.log('Set new mode ">"      for port '  + args.pn + ': ' + ports[args.pn].m + ' => ' + args.m);
                        ports[args.pn].m = args.m;
                    } else if (args.m == 2) {
                        console.log('Set new mode "<"      for port '  + args.pn + ': ' + ports[args.pn].m + ' => ' + args.m);
                        ports[args.pn].m = args.m;
                    } else if (args.m == 3) {
                        console.log('Set new mode "<>"     for port ' + args.pn + ': ' + ports[args.pn].m + ' => ' + args.m);
                        ports[args.pn].m = args.m;
                    } else {
                        res.writeHead(500, {'Content-Type': 'text/html'});
                        res.end('Invalid port mode: ' + args.m, 'utf8');
                        return;
                    }
                }
                if (args.misc !== undefined) {
                    args.misc = parseInt(args.misc, 10);
                    console.log('Set new threshold     for port ' + args.pn + ': ' + ports[args.pn].misc + ' => ' + args.misc);
                    ports[args.pn].misc = args.misc;
                }
                if (args.ecmd !== undefined) {
                    console.log('Set new ecmd          for port ' + args.pn + ': ' + ports[args.pn].ecmd + ' => ' + args.ecmd);
                    ports[args.pn].ecmd = decodeURIComponent(args.ecmd);
                }
                if (args.eth !== undefined) {
                    console.log('Set new eth           for port ' + args.pn + ': ' + ports[args.pn].eth + ' => ' + args.eth);
                    ports[args.pn].eth = decodeURIComponent(args.eth);
                }
                // show settings
                text = '<p>P' + args.pn + ' - ADC</p>';
                var modes = [
                    "0 - invalid",
                    "1 - DHT11",
                    "2 - DHT22",
                    "3 - 1W",
                    "4 - iB"
                ];

                text += '<p title="Тип подключенного датчика">' +
                    'd - Sensor: ' + ports[args.pn].d + ' - ' + modes[ports[args.pn].d || 0] + '</p>';
            } else
            // 255 - NC. Не сконфигурирован
            {
                text = '<p>P' + args.pn + ' - ADC</p>';
                text += '255 - NC. Не сконфигурирован';
            }
            fs.writeFileSync(__dirname + '/' + (process.argv[2] || 'config.json'), JSON.stringify({config: config, ports: ports}, null, 2));
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(text, 'utf8');
        }
    } else
    if (args.cf !== undefined) {
        if (args.cf == 2) {
            var text = '<a href=/sec>Back</a> | ' +
                '<a href=/sec/?cf=1>Config</a><br>' +
                '<form action=/sec/><input type=hidden name=cf value=2>' +
                'Megad-ID: <input name=mdid maxlength=5 size=5 value=""><br>' +
                'srv loop: <input type=checkbox name=sl value=1><br>' +
                '<input type=submit value=Save></form>';
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(text, 'utf8');
            return;
        }


        if (args.cf != 1) {
            res.writeHead(500, {'Content-Type': 'text/html'});
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
                res.writeHead(500, {'Content-Type': 'text/html'});
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
            console.log('Set new server script: "' + config.sct + '" => "' + decodeURIComponent(args.sct) + '"');
            config.sct = decodeURIComponent(args.sct);
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
        fs.writeFileSync(__dirname + '/' + (process.argv[2] || 'config.json'), JSON.stringify({config: config, ports: ports}, null, 2));
        var text = '<a href=/sec>Back</a> | <a href=/sec/?cf=2>' +
            'Megad-ID</a><br><form action=/sec/>' +
            '<input type=hidden name=cf value=1>' +
            'IP: <input name=eip value=' + config.eip + '><br>' +
            'Pwd: <input name=pwd maxlength=3 value="' + config.pwd + '"><br>' +
            'GW: <input name=gw value=255.255.255.255><br>' +
            'SRV: <input name=sip value=' + config.sip + '><br>' +
            'Script: <input name=sct maxlength=15 value="' + config.sct + '"><br>' +
            'Preset: <select name=pr><option value=0' + (config.pr == 0 ? ' selected' : '') + '>Norm</option><option value=1' + (config.pr == 1 ? ' selected' : '') + '>7I7O</option></select><br>' +
            'T check: <input type=checkbox name=tc value=1' + (config.tc ? ' checked' : '') + '><br>' +
            'Alarm T: <input name=at size=3 maxlength=3 value=' + (config.at || '') + '><br>' +
            'Cur T: 37<br><input type=submit value=Save></form>';

        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(text, 'utf8');
    } else
    if (args.cmd !== undefined) {
        if (args.cmd == 'get') {
            if (!ports[args.pt]) {
                res.writeHead(500, {'Content-Type': 'text/html'});
                res.end('Invalid port: ' + args.pt, 'utf8');
            } else {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end(getState(args.pt).toString(), 'utf8');
            }
        } else
        if (args.cmd == 'tget') {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end((Math.round((Math.random() * 300) / 10)).toString(), 'utf8');
        } else
        if (args.cmd == 'all') {
            var response = [];
            for (var i = 0; i < ports.length; i++) {
                response.push(getState(i));
            }
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(response.join(';'), 'utf8');
        } else {
            // Set port
            var r = args.cmd ? args.cmd.split(':') : [];
            if (r.length == 2 && ports[r[0]]) {
                ports[r[0]].pty = parseInt(ports[r[0]].pty, 10);
                if (ports[r[0]].pty != 1) {
                    console.error('Try to control non output port ' + r[0]);
                    res.writeHead(500, {'Content-Type': 'text/html'});
                    res.end('Try to control non output port ' + r[0], 'utf8');
                } else {
                    ports[r[0]].m = parseInt(ports[r[0]].m, 10);

                    if (!ports[r[0]].m) {
                        if (r[1] == '2') {
                            ports[r[0]].value = !ports[r[0]].value;
                        } else if (r[1] == '0') {
                            ports[r[0]].value = 0;
                        } else if (r[1] == '1') {
                            ports[r[0]].value = 1;
                        } else  {
                            res.writeHead(500, {'Content-Type': 'text/html'});
                            res.end('Invalid value for digital port ' + r[0] + ': '  + r[1], 'utf8');
                            return;
                        }
                    } else {
                        ports[r[0]].value = r[1];
                    }
                    console.log('Control output port ' + r[0] + ', value: ' + ports[r[0]].value);
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.end('OK', 'utf8');
                }
            } else {
                res.writeHead(500, {'Content-Type': 'text/html'});
                res.end('Invalid cmd: ' + args.cmd, 'utf8');
            }
        }
    } else
    if (args.tget !== undefined) {
        if (args.tget == 1) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end((Math.random() * 30).toFixed(1), 'utf8');
        } else {
            res.writeHead(500, {'Content-Type': 'text/html'});
            res.end('Unknown tget request: ' + args.tget, 'utf8');
        }
    } else if(args.pt !== undefined) {
        if (!ports[args.pt]) {
            res.writeHead(500, {'Content-Type': 'text/html'});
            res.end('Invalid port: ' + args.pt, 'utf8');
        } else {
            var text = '';
            if (ports[args.pt].pty == 0) {
                text = '<a href=/sec>Back</a><br>' +
                    'P' + args.pt + '/' + (ports[args.pt].value ? 'ON' : 'OFF') + '/' + (ports[args.pt].counter || 0) +
                    '<form action=/sec/>' +
                    '<input type=hidden name=pn value=' + args.pt + '>' +
                    'Type In<br>' +
                    'Act <input name=ecmd value="' + (ports[args.pt].ecmd || '') + '"><br>' +
                    'Net <input size=30 name=eth value="' + (ports[args.pt].eth || '') + '"> ' +
                    '<input type=checkbox name=naf value=1' + (ports[args.pt].naf ? ' checked' : '') + '><br>' +
                    'Mode <select name=m><option value=0' + ((ports[args.pt].m == 0) ? ' selected' : '') + '>P</option><option value=1' + ((ports[args.pt].m == 1) ? ' selected' : '') + '>P&R</option><option value=2' + ((ports[args.pt].m == 2) ? ' selected' : '') + '>R</option></select> ' +
                    '<input type=checkbox name=misc value=1' + (ports[args.pt].misc ? ' checked' : '') + '><br>' +
                    'Raw <input type=checkbox name=d value=1' + (ports[args.pt].d ? ' checked' : '') + '><br>' +
                    '<input type=submit value=Save></form>';
            } else if (ports[args.pt].pty == 1) {
                text = '<a href=/sec>Back</a><br>' +
                    'P' + args.pt + '/' + (ports[args.pt].value ? 'ON' : 'OFF') + '<br>' +
                    '<a href=/sec/?pt=' + args.pt + '&cmd=' + args.pt + ':1>ON</a> ' +
                    '<a href=/sec/?pt=' + args.pt + '&cmd=' + args.pt + ':0>OFF</a><br>' +
                    '<form action=/sec/>' +
                    '<input type=hidden name=pn value=' + args.pt + '>Type Out<br>' +
                    'Default: <select name=d><option value=0' + ((ports[args.pt].d == 0) ? ' selected' : '') + '>0</option><option value=1' + ((ports[args.pt].d == 1) ? ' selected' : '') + '>1</option></select><br>' +
                    'Mode: <select name=m><option value=0' + ((ports[args.pt].m == 0) ? ' selected' : '') + '>SW</option><option value=1' + ((ports[args.pt].m == 1) ? ' selected' : '') + '>PWM</option></select><br>' +
                    'PWM: <input name=pwm value=' + (ports[args.pt].pwm == 0) + '><br>' +
                    '<input type=submit value=Save></form>';
            } else if (ports[args.pt].pty == 2) {
                text = '<a href=/sec>Back</a><br>' +
                    'A' + args.pt + '/' + ports[args.pt].value +
                    '<form action=/sec/>' +
                    '<input type=hidden name=pn value=' + args.pt + '>' +
                    'Mode <select name=m><option value=0' + ((ports[args.pt].m == 0) ? ' selected' : '') + '>Norm</option><option value=1' + ((ports[args.pt].m == 1) ? ' selected' : '') + '>></option><option value=2' + ((ports[args.pt].m == 2) ? ' selected' : '') + '><</option><option value=3' + ((ports[args.pt].m == 3) ? ' selected' : '') + '><></option></select><br>' +
                    'Val <input name=misc size=4 value=' + (ports[args.pt].misc || 0) + '><br>' +
                    'Act <input name=ecmd value="' + (ports[args.pt].ecmd || '') + '"><br>' +
                    'Net <input size=30 name=eth value="' + (ports[args.pt].eth || '') + '"> ' +
                    '<input type=checkbox name=naf value=1' + (ports[args.pt].naf ? ' checked' : '') + '><br>' +
                    '<input type=submit value=Save></form>';
            } else if (ports[args.pt].pty == 3) {
                text = '<a href=/sec>Back</a><br>' +
                    'P' + args.pt + '<br>temp:' + (ports[args.pt].value || 0) + '<br>hum:' + (ports[args.pt].hum || 0) +
                    '<form action=/sec/><input type=hidden name=pn value=' + args.pt + '>' +
                    'Type <select name=pty><option value=255' + ((ports[args.pt].pty == 255) ? ' selected' : '') + '>NC</option><option value=0' + ((ports[args.pt].pty == 0) ? ' selected' : '') + '>In</option><option value=1' + ((ports[args.pt].pty == 1) ? ' selected' : '') + '>Out</option><option value=3' + ((ports[args.pt].pty == 3) ? ' selected' : '') + '>DSen</option><option value=2' + ((ports[args.pt].pty == 2) ? ' selected' : '') + '>ADC</option></select><br>' +
                    'Mode <select name=m><option value=0' + ((ports[args.pt].m == 0) ? ' selected' : '') + '>Norm<option value=1' + ((ports[args.pt].m == 1) ? ' selected' : '') + '>><option value=2' + ((ports[args.pt].m == 2) ? ' selected' : '') + '><<option value=3' + ((ports[args.pt].m == 3) ? ' selected' : '') + '><></select><br>' +
                    'Val <input name=misc size=4 value="' + (ports[args.pt].misc || 0) + '"><br>' +
                    'Act <input name=ecmd value="' + (ports[args.pt].ecmd || '') + '"><br>' +
                    'Net <input size=30 name=eth value="' + (ports[args.pt].eth || '') + '"> ' +
                    '<input type=checkbox name=naf value=' + (ports[args.pt].naf ? ' checked' : '') + '><br>' +
                    'Sensor: <select name=d><option value=0></option><option value=1' + ((ports[args.pt].d == 1) ? ' selected' : '') + '>DHT11<option value=2' + ((ports[args.pt].d == 2) ? ' selected' : '') + '>DHT22<option value=3' + ((ports[args.pt].d == 3) ? ' selected' : '') + '>1W<option value=4' + ((ports[args.pt].d == 4) ? ' selected' : '') + '>iB</select><br>' +
                    '<input type=submit value=Save></form>';
            } else  {
                text = '<a href=/sec>Back</a><br>' +
                    'P' + args.pt + '<form action=/sec/><input type=hidden name=pn value=' + args.pt + '>' +
                    'Type <select name=pty><option value=255' + ((ports[args.pt].pty == 255) ? ' selected' : '') + '>NC</option><option value=0' + ((ports[args.pt].pty == 0) ? ' selected' : '') + '>In</option><option value=1' + ((ports[args.pt].pty == 1) ? ' selected' : '') + '>Out</option><option value=3' + ((ports[args.pt].pty == 3) ? ' selected' : '') + '>DSen</option><option value=2' + ((ports[args.pt].pty == 2) ? ' selected' : '') + '>ADC</option></select><br>' +
                    '<input type=submit value=Save></form>';
            }
        }
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(text, 'utf8');
    }
    else {
        var text = 'MegaD-328 by <a href=http://ab-log.ru>ab-log.ru</a> (fw: 3.30b5)<br>' +
            '<a href=/sec/?cf=1>Config</a><br>--Ports--<br>';
        var type = '';
        for (var p = 0; p < ports.length; p++) {
            if (ports[p].pty == 0) {
                type = 'IN';
            } else if (ports[p].pty == 1) {
                type = 'OUT';
            } else if (ports[p].pty == 2) {
                type = 'ADC';
            } else if (ports[p].pty == 3) {
                type = 'Digital';
            } else {
                type = 'NC';
            }
            //<a href=/sec/?pt=0>P0 - IN
            text += '<a href=/sec/?pt=' + p + '>' + ((ports[p].pty == 2) ? 'A' : 'P') + p + ' - ' + type + '</a><br>';
        }
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(text, 'utf8');
    }

    //http://192.168.0.250/megad.php?pt=5
    //http://192.168.0.250/megad.php?pt=5&m=1
    //http://192.168.0.250/megad.php?at=25
}

function simulateServicePort() {
    var dgram = require('dgram');

    var server = dgram.createSocket('udp4');

    server.on('error', function (err) {
        console.error("server error:\n" + err.stack);
        server.close();
    });

    server.on('message', function (msg, rinfo) {
        console.log("server got: " + msg + " from " + rinfo.address + ":" + rinfo.port);
        if (msg[0] == 0xAA && msg[1] == 0 && msg[2] == 12) {
            server.send(new Buffer([0xAA, 0xc0, 0xa8, 0x00, 0x0e]), 0, 5, rinfo.port, rinfo.address, function(err) {
                if (err) console.error(err);
            });
        }
    });

    server.on('listening', function () {
        var address = server.address();
        console.log("service listening on " + address.address + ":" + address.port);
    });

    server.bind(52000);
}

function main() {
    simulateServicePort();

    if (fs.existsSync(__dirname + '/' + (process.argv[2] || 'config.json'))) {
        try {
            var cfg = fs.readFileSync(__dirname + '/' + (process.argv[2] || 'config.json')).toString();
            cfg = JSON.parse(cfg);
            config = cfg.config;
            ports  = cfg.ports;
        } catch (e) {
            console.log('Cannot parse or read ' + '/' + (process.argv[2] || 'config.json'));
        }
    }

    config.port = parseInt(config.port, 10);
    server = require('http').createServer(requestProcessor);
    server.listen(config.port);
    console.log('Server started on port: ' + config.port);

    if (keypress) keypress(process.stdin);

    // listen for the "keypress" event
    process.stdin.on('keypress', function (ch, key) {
        if (key && key.ctrl && key.name == 'c') {
            process.exit();
        }
        var print = false;
        if (ch && ch >= '0' && ch <= '9') {
            var port = parseInt(ch);
            if (ports[port]) {
                console.log(port);
                if (ports[port].pty == 0) {
                    print = true;
                    ports[port].value   = ports[port].value || 0;
                    ports[port].counter = ports[port].counter || 0;
                    ports[port].value   = !ports[port].value;
                    ports[port].counter++;
                    if ((ports[port].m == 0 && ports[port].value) || (ports[port].m == 2 && !ports[port].value) || ports[port].m == 1)
                    trigger(port);
                } else
                if (ports[port].pty == 2) {
                    print = true;
                    ports[port].value = parseInt(ports[port].value) || 0;
                    ports[port].value++;
                    if (ports[port].value > 255) ports[port].value = 0;
                    trigger(port);
                } else
                if (ports[port].pty == 3) {
                    print = true;
                    if (ports[port].d == 4) {
                        ports[port].value = 'ABC' + ('000000' + (Math.round(Math.random() * 10000)).toString()).slice(-6);
                    } else {
                        ports[port].value = parseFloat(ports[port].value) || 0;
                        ports[port].value = Math.round(ports[port].value * 10 + 1) / 10;
                        if (ports[port].value > 30) ports[port].value = -10;

                        if (ports[port].d == 1 || ports[port].d == 2) {
                            ports[port].humidity = parseFloat(ports[port].humidity) || 0;
                            ports[port].humidity = Math.round(ports[port].humidity * 10 + 3) / 10;
                            if (ports[port].humidity > 100) ports[port].humidity = 0;
                        }
                    }
                    //trigger(port);
                }
            }
        }
        if (print || (key && key.name == 's')) {
            var response = [];

            for (var i = 0; i < ports.length; i++) {
                response.push(getState(i));
            }
            console.log(response.join(';'));
        }

    });

    if (process.stdin.setRawMode) process.stdin.setRawMode(true);
    process.stdin.resume();
}
function triggerEx(port) {
    var print = false;
    if (port >= 0 && port <= 9) {
        port = parseInt(port);
        if (ports[port]) {
            if (ports[port].pty == 0) {
                print = true;
                ports[port].value   = ports[port].value || 0;
                ports[port].counter = ports[port].counter || 0;
                ports[port].value   = !ports[port].value;
                ports[port].counter++;
                if ((ports[port].m == 0 && ports[port].value) || (ports[port].m == 2 && !ports[port].value) || ports[port].m == 1)
                    trigger(port);
            } else
            if (ports[port].pty == 2) {
                print = true;
                ports[port].value = parseInt(ports[port].value) || 0;
                ports[port].value++;
                if (ports[port].value > 255) ports[port].value = 0;
                trigger(port);
            } else
            if (ports[port].pty == 3) {
                print = true;
                if (ports[port].d == 4) {
                    ports[port].value = 'ABC' + ('000000' + (Math.round(Math.random() * 10000)).toString()).slice(-6);
                } else {
                    ports[port].value = parseFloat(ports[port].value) || 0;
                    ports[port].value = Math.round(ports[port].value * 10 + 1) / 10;
                    if (ports[port].value > 30) ports[port].value = -10;

                    if (ports[port].d == 1 || ports[port].d == 2) {
                        ports[port].humidity = parseFloat(ports[port].humidity) || 0;
                        ports[port].humidity = Math.round(ports[port].humidity * 10 + 3) / 10;
                        if (ports[port].humidity > 100) ports[port].humidity = 0;
                    }
                }
                //trigger(port);
            }
        }
    }
}

function stop() {
    server.close();
}

if (typeof module !== undefined && module.parent) {
    keypress = null;
    module.exports.main    = main;
    module.exports.trigger = triggerEx;
    module.exports.stop    = stop;
} else {
    main();    
}
