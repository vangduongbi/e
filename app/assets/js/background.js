'use strict';

const SendoBackground = function () {
    this.configs = {
        alarm_name_auto_order : 'auto-order',
        time_auto_order_early : 1, // second
        time_auto_order_length: 7, // second
        period_minutes_order  : null // (60 * 24) // 60 minutes * 24 hours
    };

    this.initOnInstalled();
    this.initOnMessage();
    this.initOnAlarm();
    this.setAlarmAutoOrder();
};

/**
 * Check whether new version is installed
 */
SendoBackground.prototype.initOnInstalled = function () {
    chrome.runtime.onInstalled.addListener(function (details) {
        if (details.reason === 'install') {
            chrome.storage.sync.set({timeAutoOrder: []});
        }

        if (details.reason === 'install' || details.reason === 'update') {
            console.info('This is a ' + details.reason);

            const storageVars = [
                'isEnable',
                'priceMax',
                'priceSearch'
            ];

            chrome.storage.sync.get(storageVars, function (storage) {
                // if (typeof storage.isEnable === 'undefined') {
                //     chrome.storage.sync.set({isEnable: false}, function () {
                //         console.info('Sendo.vn BOT is set to: Off');
                //     });
                // }

                if (typeof storage.priceMax === 'undefined') {
                    chrome.storage.sync.set({priceMax: 60000}, function () {
                        console.info('Max price is: 60.000');
                    });
                }

                if (typeof storage.priceSearch === 'undefined') {
                    chrome.storage.sync.set({priceSearch: 30000}, function () {
                        console.info('Search price is: 30.000');
                    });
                }
            });
        }
    });
};

SendoBackground.prototype.reloadTabsCheckout = function () {
    const queryInfo = {
        url: '*://checkout.sendo.vn/*'
    };

    chrome.tabs.query(queryInfo, function (tabs) {
        if (!tabs.length) {
            return;
        }

        $.each(tabs, function () {
            let tabId = this.id;
            chrome.tabs.reload(tabId);
        });
    });
};

SendoBackground.prototype.requestTabsCheckout = function (action) {
    const queryInfo = {
        url: '*://checkout.sendo.vn/*'
    };

    chrome.tabs.query(queryInfo, function (tabs) {
        if (!tabs.length) {
            return;
        }

        $.each(tabs, function () {
            const tabId = this.id;
            chrome.tabs.sendMessage(tabId, {action: action});
        });
    });
};

SendoBackground.prototype.getHoursMinutesFromText = function (text) {
    const match = /(\d{2})(\d{2})/i.exec(text);

    if (!match) {
        return null;
    }

    return {
        hours  : match[1],
        minutes: match[2]
    };
};

SendoBackground.prototype.setAlarmAutoOrder = function () {
    const self        = this,
          storageVars = ['timeAutoOrder']
    ;

    // create alarms
    chrome.storage.sync.get(storageVars, function (storage) {
        const alarmName = self.configs.alarm_name_auto_order;

        chrome.alarms.clear(alarmName);

        if (storage.timeAutoOrder && storage.timeAutoOrder.length) {
            const timeAutoLength  = storage.timeAutoOrder.length,
                  nowDate         = new Date(),
                  nowHours        = nowDate.getHours().toString(),
                  nowMinutes      = nowDate.getMinutes().toString(),
                  nowHoursMinutes = ((nowHours < 10) ? '0' : '') + nowHours +
                      ((nowMinutes < 10) ? '0' : '') + nowMinutes
            ;
            let timeAlarm         = null;

            for (let i = 0; i < timeAutoLength; i++) {
                const timeValue = storage.timeAutoOrder[i];

                if (timeValue > nowHoursMinutes) {
                    timeAlarm = timeValue;
                    break;
                }
            }

            let isNextDay = false;

            // get time first when timeAlarm empty
            if (!timeAlarm && self.getHoursMinutesFromText(storage.timeAutoOrder[0]) !== null) {
                timeAlarm = storage.timeAutoOrder[0];
                isNextDay = true;
            }

            if (timeAlarm) {
                const secondRunEarly = self.configs.time_auto_order_early,
                      match          = self.getHoursMinutesFromText(timeAlarm),
                      hoursValue     = match.hours,
                      minutesValue   = match.minutes,
                      nowDate        = new Date()
                ;

                nowDate.setHours(hoursValue);
                nowDate.setMinutes(minutesValue - 1, 60 - secondRunEarly, 0);

                if (isNextDay) {
                    nowDate.setDate(nowDate.getDate() + 1);
                }

                const timeRun = nowDate.getTime(); // milliseconds

                console.info('%c Set time run order: ' + new Date(timeRun), 'background: #222; color: #bada55');

                chrome.alarms.create(alarmName, {
                    when           : timeRun,
                    periodInMinutes: self.configs.period_minutes_order
                });
            }
        }

        // send message to popup
        chrome.runtime.sendMessage({msg: 'show_alarm_time_auto_order'});
    });
};

/**
 * Listener event from tabs
 */
SendoBackground.prototype.initOnMessage = function () {
    const self = this;

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        console.info('The request is ' + (sender.tab ? 'from a content script: ' +
            sender.tab.url : 'from the extension')
        );

        let message = null;

        switch (request.action) {
            case 'reload_sendo_checkout':
                self.reloadTabsCheckout();
                message = '[From background] Called function reload sendo checkout tabs.';
                break;

            case 'set_alarm_auto_order':
                self.setAlarmAutoOrder();
                message = '[From background] Called function update alarms auto order.';
                break;

            default:
                message = '[From background] No action.';
                break;
        }

        sendResponse({message: message});
    });
};

/**
 * Alarm auto order cart
 */
SendoBackground.prototype.initOnAlarm = function () {
    const self = this;

    chrome.alarms.onAlarm.addListener(function (alarm) {
        const alarmName = alarm.name,
              regex     = new RegExp(self.configs.alarm_name_auto_order, 'i')
        ;

        if (!(regex.test(alarmName))) {
            return;
        }

        self.startAutoOrderCart();
    });
};

SendoBackground.prototype.startAutoOrderCart = function () {
    const self = this;

    // set auto order to on
    chrome.storage.sync.set({isEnable: true}, function () {
        console.info('Sendo.vn BOT is set to: On (' + new Date() + ')');
        console.info(
            'Running try order cart in %c ' + self.configs.time_auto_order_length + ' second',
            'background: #222; color: #bada55'
        );

        // send message to popup
        chrome.runtime.sendMessage({msg: 'show_status_updated'});

        //self.reloadTabsCheckout();
        self.requestTabsCheckout('send_request_get_card_info_start');
    });

    // set auto order to off
    setTimeout(function () {
        chrome.storage.sync.set({isEnable: false}, function () {
            console.info('%c Sendo.vn BOT is set to: Off (' + new Date() + ')', 'color: #bb6120');

            // create new alarm
            self.setAlarmAutoOrder();

            // send message to popup
            chrome.runtime.sendMessage({msg: 'show_status_updated'});
            self.requestTabsCheckout('send_request_get_card_info_stop');
        });
    }, self.configs.time_auto_order_length * 1000);
};

new SendoBackground();
