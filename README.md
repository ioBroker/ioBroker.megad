![Logo](admin/megad.png)
ioBroker MegaD-328 adapter
=================
Lets control the [MegaD-328](http://www.ab-log.ru/smart-house/ethernet/MegaD-328) over ethernet.
## English 
[по русски](#Русский)

## Install

```node iobroker.js add megad```

### Information
The device has 14 ports, 0-7 inputs and 8-13 outputs.
To read the state of the port call
```http://mega_ip/sec/?pt=4&cmd=get``` , where sec is password (max 3 chars), 4 is port number
The result will come as "ON", "OFF" or analog value for analog ports

To set the state call:
```http://mega_ip/sec/?cmd=2:1``` , where sec is password (max 3 chars), 2 is port number, and 1 is the value
For digital ports only 0, 1 and 2 (toggle) are allowed, for analog ports the values from 0 to 255 are allowed

The device can report the changes of ports to some web server in form
```http://ioBroker:80/?pt=6```  , where 6 is the port number

MegaD-328 cannot report on other port than 80.

### Configuration

- IP: IP address of MegaD-328;
- MegaD-328 Name: Name of the MegaD-328 to assign the port changes, e.g. "DevA". If no name set the adapter instance will be used for that;
- Port: Listening port on ioBroker. MegaD-328 cannot send to ports other than 80. Default value: 80. 
- Poll interval: poll interval in seconds. All configured input ports will be polled in defined interval;
- Password: password to access the device (max 3 characters). Default value "sec";

MegaD-328 can report about changes on some ports if configured. 
You can configure something like that "http://ioBrokerIP/instance" on MegaD-328 in "Net"-Field and MegaD-328 will send reports like this one "http://ioBrokerIP/instance/?pt=7" to ioBroker. 
That means the button on port 7 was pressed. ioBroker expectes instance number (e.g. "0") or defined name of MegaD-328 (e.g. "DevA"). The "Net" field will look like: "http://192.168.0.8/0/".

### Ports
All ports, that are desired to be used must be configured in right order. Following settings must be set for every port:

- name: name of the port. Used by ioBroker;
- input: Is the port INPUT(true) or output(false);
- switch: Is the port can be ON or OFF (in this case value = TRUE) or just used to send the reports about button press (FALSE);
- digital: Analog or digital port. ioBroker expects analog ports with range from 0 to 255.
- offset: offset for the **analog** port.
- factor:  multiply factor for **anaolog** port.

ioBrokerValue = (MegaValue/256) * factor + offset;

To get the range of the analog value from 100 to 500 set the factor as 400 and offset = 100.

**The order of the ports is very important. The port in first row will be associated with P0 in MegaD-328. In row number 14 with P13.**

-------------------
## Русский        
Подробную документацию можно найти здесь: [http://www.ab-log.ru/smart-house/ethernet/MegaD-328](http://www.ab-log.ru/smart-house/ethernet/MegaD-328)
    
### Настройки

- IP Адрес устройства: IP адрес MegaD-328;
- MegaD Имя: Имя MegaD-328 устройства для идентификации сообщений о смене состояния порта от MegaD-328, например "DevA". Если имя не задано, то для этих целей будет использоватся номер инстанции драйвера.;
- ioBroker веб-порт: Порт на котором ioBroker развертывает веб сервер для приёма сообщений от MegaD-328. MegaD-328 не поддерживает на данный момент порты отличные от 80. Значение по умолчанию: 80. 
- Интервал опроса (сек): инетрвал опроса портов в секундах;
- MegaD-328 Пароль: пароль для доступа на MegaD-328 (максимально 3 символа). Значение по умолчанию: "sec";

В сетевых настройках MegaD-328 можно сконфигуририровать IP-адрес ioBroker. При каждом нажатии на кнопку MegaD-328 сообщает ioBroker (restAPI) номер сработавшего входа. 

Выглядит запрос примерно следующим образом:
´´´http://192.168.0.250/0/?pt=7´´´

Необходимо прописать в настройках MegaD-328 в поле "Net" ´´´http://192.168.0.250/0/´´´, если адрес ioBroker "192.168.0.250" и инстанция адаптера 0.

### Порты
Необходимо сконфигурироваь все порты, которые должны быть видимы в ioBorker. Для каждого порта необходимо настроить следующее:

- Имя: имя порта. Исползуется в ioBroker для создание объектов;
- Вход: является ли порт входом (true) или выходом(false);
- Переключатель: Может ли порт быть в положениях ВКЛ и ВЫКЛ (в этом случае значение TRUE) или он просто используется для сигнализирования нажатия на кнопку (FALSE);
- Цифровой: Цифровой или аналоговый порт. ioBroker ожидает значени с аналогового порта в промежутке от 0 до 255.
- Множитель:  множитель для значения **аналогового** порта.
- Сдвиг: сдвиг для значения **аналогового** порта.

ioBrokerЗначение = (MegaЗначение/256) * Множитель + Сдвиг;

Например, что бы получить интервал значений от 100 до 500 нужно установить сдиг 100 и множитель 400.

Только аналоговые порты принимают во внимание Множитель и Сдвиг.

**Порядок портов очень важен. Порт в первой колонке таблицы ассоциируется с портом P0 на MegaD-328. Порт в колонке 14 с P13.**          
       
## TODO 
- support of more than one device
        
        
## Changelog
### 0.0.2 (2015-03-14)
* (bluefox) read status off all ports together

### 0.0.1 (2015-03-05)
* (bluefox) make socket usable as module
