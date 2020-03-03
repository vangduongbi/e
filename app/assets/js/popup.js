'use strict';

import jQuery      from 'jquery';
import Vue         from 'vue/dist/vue.common';
import moment      from 'moment';
import AutoNumeric from 'autonumeric';
import 'bootstrap';
import './font-awesome';
import './switcher';

window.$ = window.jQuery = jQuery;

// variables of chrome storage
const storageVars = [
    'isEnable',
    'priceSearch',
    'priceMax',
    'timeAutoOrder'
];

chrome.storage.sync.get(storageVars, function (storage) {
    new Vue({
        el     : '#app',
        data   : function () {
            let optionsHours = [];

            for (let hours = 0; hours < 24; hours++) {
                let text = (hours < 10) ? '0' + hours : hours;
                optionsHours.push({
                    text : text,
                    value: text
                });
            }

            let optionsMinute = [];

            for (let minutes = 0; minutes < 60; minutes++) {
                let text = (minutes < 10) ? '0' + minutes : minutes;
                optionsMinute.push({
                    text : text,
                    value: text
                });
            }

            return {
                hoursNow          : moment().format('HH'),
                minutesNow        : moment().format('mm'),
                secondNow         : moment().format('ss'),
                dateNow           : moment().format('YYYY-MM-DD'),
                isEnable          : (typeof storage.isEnable !== 'undefined') ? storage.isEnable : true,
                priceSearch       : storage.priceSearch || 15000,
                priceMax          : storage.priceMax || 50000,
                optionsHours      : optionsHours,
                optionsMinute     : optionsMinute,
                timeAutoOrder     : (storage.timeAutoOrder) ? storage.timeAutoOrder : [],
                message           : null,
                alarmTimeAutoOrder: null
            };
        },
        mounted: function () {
            let self = this;

            // show time now
            setInterval(function () {
                const now = moment();

                self.hoursNow   = now.format('HH');
                self.minutesNow = now.format('mm');
                self.secondNow  = now.format('ss');
            }, 1000);

            $('.is-enable').change(function () {
                const elCheckbox = $(this),
                      isEnable   = elCheckbox.is(':checked')
                ;

                chrome.storage.sync.set({isEnable: isEnable}, function () {
                    console.info('Sendo.vn BOT is set to: ' + (isEnable ? 'On' : 'Off'));
                });
            });

            // create auto numeric
            self.setValueInputPrice();

            const elTimeBase = $('#time-base');

            if (self.timeAutoOrder.length) {
                self.timeAutoOrder.forEach(function (timeItem) {
                    let elRowTime    = elTimeBase.clone().removeAttr('id').addClass('row-time'),
                        elHours      = elRowTime.find('.time .hours'),
                        elMinutes    = elRowTime.find('.time .minutes'),
                        match        = /(\d{2})(\d{2})/i.exec(timeItem),
                        hoursValue   = match[1],
                        minutesValue = match[2]
                    ;

                    elHours.val(hoursValue);
                    elMinutes.val(minutesValue);

                    $('.list-time-auto').append(elRowTime);
                });
            } else {
                $('.row-time--empty').show();
            }

            // get alarm auto order
            self.getAlarmTimeAutoOrder();

            $('.info')
                .on('mouseover', '.icon-reload:not(.disabled)', function () {
                    $(this)
                        .find('.fa')
                        .addClass('fa-spin');
                })
                .on('mouseout', '.icon-reload:not(.disabled)', function () {
                    $(this)
                        .find('.fa')
                        .removeClass('fa-spin');
                })
                .on('click', '.icon-reload:not(.disabled)', function () {
                    self.sendRequestReloadTabs();
                })
                // add time row
                .on('click', '.icon .add-row', function () {
                    self.addRowTimeOrder();
                    self.updateListTime();
                })
                // remove time row
                .on('click', '.icon .remove-row', function () {
                    $(this).closest('.row-time').remove();
                    self.updateListTime();
                })
                // save list time auto order cart
                .on('change', '.time .hours, .time .minutes', function () {
                    const elRowTime   = $(this).closest('.row-time'),
                          elHours     = elRowTime.find('.time .hours'),
                          elMinute    = elRowTime.find('.time .minutes'),
                          hoursValue  = parseInt(elHours.val()),
                          minuteValue = parseInt(elMinute.val())
                    ;

                    if (!isNaN(hoursValue) && !isNaN(minuteValue)) {
                        self.updateListTime();
                    }
                })
            ;

            chrome.runtime.onMessage.addListener(
                function (request) {
                    switch (request.msg) {
                        case 'show_alarm_time_auto_order':
                            self.getAlarmTimeAutoOrder();
                            break;

                        case 'show_status_updated':
                            self.getStatus();
                            break;

                        default:
                            break;
                    }
                }
            );

            self.getStatus();

            // open link
            $('[data-href]').click(function () {
                var link       = $(this).data('href'),
                    samplePage = chrome.extension.getURL(link);

                window.open(samplePage, '_blank');
            });
        },
        methods: {
            setValueInputPrice: function () {
                const self              = this,
                      priceSearchObject = new AutoNumeric('#price_search', self.priceSearch, {
                          digitGroupSeparator: '.',
                          decimalCharacter   : ',',
                          decimalPlaces      : 0
                      }),
                      priceMaxObject    = new AutoNumeric('#price_max', self.priceMax, {
                          digitGroupSeparator: '.',
                          decimalCharacter   : ',',
                          decimalPlaces      : 0
                      })
                ;

                $('#price_search').on('keyup', function () {
                    const price = priceSearchObject.rawValue;

                    self.priceSearch = price;

                    chrome.storage.sync.set({priceSearch: price}, function () {
                        console.info('Price search is set to: ' + priceSearchObject.lastVal);
                    });
                });

                $('#price_max').on('keyup', function () {
                    const price = priceMaxObject.rawValue;

                    self.priceMax = price;

                    chrome.storage.sync.set({priceMax: price}, function () {
                        console.info('Price max is set to: ' + priceMaxObject.lastVal);
                    });
                });
            },

            updateListTime: function () {
                const self          = this,
                      elListRowTime = $('.row-time')
                ;
                self.timeAutoOrder  = [];

                elListRowTime.each(function () {
                    const elRowTime   = $(this),
                          elHours     = elRowTime.find('.time .hours'),
                          elMinutes   = elRowTime.find('.time .minutes'),
                          hoursValue  = parseInt(elHours.val()),
                          minuteValue = parseInt(elMinutes.val())
                    ;
                    let timeValue     = null;

                    if (!isNaN(hoursValue) && !isNaN(minuteValue)) {
                        timeValue = elHours.val() + elMinutes.val();
                        self.timeAutoOrder.push(timeValue);
                    }
                });

                self.timeAutoOrder.sort();

                if (!self.timeAutoOrder.length) {
                    $('.row-time--empty').show();
                } else {
                    $('.row-time--empty').hide();
                }

                chrome.storage.sync.set({timeAutoOrder: self.timeAutoOrder}, function () {
                    console.info('List time auto order card is updated: ', self.timeAutoOrder);
                    self.showMessage('Saved!');
                    self.updateAlarmsAutoOrder();
                });
            },

            addRowTimeOrder: function () {
                const elTimeBase = $('#time-base').clone().removeAttr('id').addClass('row-time'),
                      elListTime = $('.list-time-auto')
                ;

                elListTime.append(elTimeBase);
            },

            showMessage: function (msg) {
                let self  = this,
                    elMsg = $('.msg')
                ;

                self.message = msg;

                setTimeout(function () {
                    elMsg.fadeOut('slow', function () {
                        self.message = null;
                        elMsg.show();
                    });
                }, 3000);
            },

            updateAlarmsAutoOrder: function () {
                chrome.runtime.sendMessage({action: 'set_alarm_auto_order'}, function (response) {
                    console.info(response.message);
                });
            },

            sendRequestReloadTabs: function () {
                chrome.runtime.sendMessage({action: 'reload_sendo_checkout'}, function (response) {
                    console.info(response.message);
                });
            },

            // get alarm auto order
            getAlarmTimeAutoOrder: function () {
                const self              = this;
                self.alarmTimeAutoOrder = null;

                chrome.alarms.get('auto-order', function (alarm) {
                    let timeAutoOrder = '';

                    if (alarm && alarm.scheduledTime) {
                        timeAutoOrder = (new Date(alarm.scheduledTime)).toString();
                    }

                    console.log(timeAutoOrder.match(/([\w\s]+)(\d{2}):(\d{2}):(\d{2})(.+)/));

                    self.alarmTimeAutoOrder = timeAutoOrder.replace(
                        /([\w\s]+)(\d{2}):(\d{2}):(\d{2})(.+)/,
                        '$1<span class="hours">$2</span>:<span class="minutes">$3</span>' +
                        ':<span class="seconds">$4</span>'
                    );
                });
            },

            getStatus: function () {
                const self = this;

                chrome.storage.sync.get('isEnable', function (storage) {
                    self.isEnable = storage.isEnable;
                    $('.on-off-extension .ui-switcher').attr('aria-checked', self.isEnable);
                });
            }
        }
    });
});
