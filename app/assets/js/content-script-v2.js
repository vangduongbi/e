'use strict';

import jQuery   from 'jquery';
import './font-awesome';
import {months} from 'moment';

window.$ = window.jQuery = jQuery;
require('jquery-ui');

let Sendo = function () {
    this.options = {
        observerTarget              : '.Root_1oun',
        classContainerListProductMin: 'price-min-container',
        carrier                     : {
            cod    : 'ecom_shipping_dispatch_cptc_sc',
            instant: 'ecom_shipping_dispatch_instant'
        },
        links                       : {
            checkoutSuccess: 'https://checkout.sendo.vn/success?order=',
            checkout       : {
                saveOrder: '/api/checkout/save-order',
                info     : '/api/checkout/info'
            },
            getProductList : 'https://api.sendo.vn/flash-deal/ajax-product/',
            getDealSlots   : 'https://api.sendo.vn/flash-deal/ajax-deal'
        }
    };

    this.data = {
        isSaveOrder         : false,
        listProductFlashSale: [],
        orderProductInfo    : []
    };

    this.lang = {
        view        : 'Xem',
        view_all    : 'Xem tất cả [Best Sale]',
        un_view_all : 'Bỏ xem tất cả',
        start_scroll: 'Cuộn trang',
        stop_scroll : 'Dừng cuộn'
    };

    // variables of chrome storage
    let self        = this,
        storageVars = [
            'isEnable',
            'priceSearch',
            'priceMax'
        ]
    ;

    chrome.storage.sync.get(storageVars, function (storage) {
        self.isEnable    = storage.isEnable;
        self.priceMax    = storage.priceMax;
        self.priceSearch = storage.priceSearch;

        if (storage.isEnable) {
            console.info('Sendo.vn BOT is enabled.');
        } else {
            console.info('Sendo.vn BOT is disabled.');
        }

        console.info('Max price order: ' + storage.priceMax);

        self.initFindProductSale();
        self.initOnMessage();
    });

    this.objAutoScrollBottom = null;

    /**
     *
     * @type {Object} {{stop: stop, start: start}}
     */
    this.scrollToBottom = this.createScrollToBottom();

    this.initGetProductListSale();
    this.initDivResultGetOrderInfo();
};

/**
 * Start auto order product
 */
Sendo.prototype.initOrder = function () {
    if (!$(this.options.observerTarget).length) {
        return;
    }

    this.clickOrderCart();
};

/**
 * Convert price text to price number
 *
 * @param {string} price
 * @returns {number}
 */
Sendo.prototype.convertCurrencyToNumber = function (price) {
    return parseInt(price.replace(/[.đ]/gi, ''));
};

Sendo.prototype.initOnMessage = function () {
    console.log('Start listener message');

    const self = this;

    chrome.runtime.onMessage.addListener(
        function (request) {
            console.log(request);
            switch (request.action) {
                case 'send_request_get_card_info_start':
                    self.doProcessOrder();
                    break;

                case 'send_request_get_card_info_stop':
                    break;

                default:
                    break;
            }
        }
    );
};

/**
 * Convert number to currency
 *
 * @param {number} number
 * @param {boolean} is_symbol
 * @returns {string}
 */
Sendo.prototype.convertNumberToCurrency = function (number, is_symbol) {
    let symbol = (is_symbol) ? 'đ' : '';
    return (number / 1000).toFixed(3) + symbol;
};

Sendo.prototype.chooseShippingMethod = function () {
    let self          = this,
        elCarrierItem = $('[class^="carrierItem"]')
    ;

    if (elCarrierItem.length === 1) {
        console.info('Shipping method only 1.');
        return;
    }

    let shippingChoose = {
        element: null,
        price  : 0,
        text   : null
    };

    elCarrierItem.each(function () {
        let elCarrierItem   = $(this),
            shippingFeeText = elCarrierItem.find('[class^="price"]').text(),
            shippingFee     = self.convertCurrencyToNumber(shippingFeeText) || 0
        ;

        if (!shippingChoose.element) {
            shippingChoose = {
                element: elCarrierItem,
                price  : shippingFee,
                text   : shippingFeeText
            };
        }

        if (shippingFee < shippingChoose.price) {
            shippingChoose = {
                element: elCarrierItem,
                price  : shippingFee,
                text   : shippingFeeText
            };
        }
    });

    if (!shippingChoose.element || !shippingChoose.element.length) {
        return;
    }

    console.info('Selected shipping fee is: ' + shippingChoose.price + ' (' + shippingChoose.text + ')');

    let elCheckMark = shippingChoose.element.find('[class^="checkMarkContainer"] [class^="checkMark"]');

    elCheckMark.trigger('click');
};

Sendo.prototype.clickOrderCart = function () {
    const self              = this,
          elTotalAndBtnCard = $('body').find('[class^="totalAndSubmit"]')
    ;

    if (!elTotalAndBtnCard.length) {
        self.logInfo(false);
        self.mutationObserver();
        return;
    } else {
        self.logInfo(true);
    }

    const elPrice   = elTotalAndBtnCard.find('[class^="totalPrice"]'),
          priceText = elPrice.text()
    ;

    console.info('Product price: ' + priceText);

    let btnCart = elTotalAndBtnCard.find('[class^="button"]');

    console.info(btnCart);

    // order cart
    btnCart.trigger('click');
};

Sendo.prototype.logInfo = function (status) {
    if (!status) {
        console.info(
            '%c Element Total and submit is:' + ' %c NOT READY ',
            'background: #222; color: #bada55', 'background: pink; color: red'
        );
    } else {
        console.info(
            '%c Element Total and submit is:' + ' %c READY ',
            'background: #222; color: #bada55',
            'background: pink; color: green'
        );
    }
};

Sendo.prototype.mutationObserver = function () {
    let self   = this,
        target = $(self.options.observerTarget)
    ;

    if (!target.length) {
        return;
    }

    console.info('%c Start MutationObserver', 'background: #222; color: #bada55');

    // create an observer instance
    let observer = new MutationObserver(function (mutationRecordsList) {
        mutationRecordsList.forEach(function (mutationRecord) {
            if (mutationRecord.addedNodes.length) {
                let addedNode         = $(mutationRecord.addedNodes[0]),
                    elTotalAndBtnCard = addedNode.find('[class^="totalAndSubmit"]')
                ;

                if (!elTotalAndBtnCard.length) {
                    return true;
                }

                self.clickOrderCart();
            }
        });
    });

    // Options for the observer (which mutations to observe)
    let observerConfig = {childList: true};

    // pass in the target node, as well as the observer options
    observer.observe(target[0], observerConfig);
};

/**
 * Scroll to element
 *
 * @param {string|object} element
 * @param {number} fixed
 */
Sendo.prototype.goToElement = function (element, fixed) {
    if (typeof element === 'string') {
        element = $(element);
    }

    fixed = fixed || 0;

    $('html, body').animate({
        scrollTop: element.offset().top - fixed
    }, 500);
};

Sendo.prototype.initFindProductSale = function () {
    const self       = this,
          target     = $('#page-container'),
          elBody     = $('body'),
          currentUrl = window.location.href
    ;

    if (!currentUrl.match(/flash-sale/)) {
        return;
    }

    let priceMinContainer = '' +
        '<div class="' + self.options.classContainerListProductMin + '">' +
        '   <p class="">Giá tìm kiếm: ' + self.convertNumberToCurrency(self.priceSearch, true) + '</p>' +
        '   <div class="header">' +
        // '       <p class="block"><button class="start-scroll">' + self.lang.start_scroll + '</button></p>' +
        '       <p class="block"><button class="view-all">' + self.lang.view_all + '</button></p>' +
        '   </div>' +
        '   <table class="price-list">' +
        '       <thead>' +
        '           <tr>' +
        '               <th>Giá</th>' +
        '               <th>Số lượng</th>' +
        '               <th>Hành động</th>' +
        '           </tr>' +
        '       </thead>' +
        '       <tbody></tbody>' +
        '   </table>' +
        '</div>'
    ;

    elBody.append(priceMinContainer);

    const elPriceMinContainer      = $('.' + self.options.classContainerListProductMin),
          elViewAllProductMinPrice = elPriceMinContainer.find('.view-all')
    ;

    elPriceMinContainer
    //.hide()
        .draggable({
            axis       : 'y',
            containment: 'window',
            scroll     : false
        });

    elViewAllProductMinPrice.click(function () {
        const elView        = $(this),
              // elProductItems = $('.product-list-wrap .product-item:not(.price-min)'),
              // elProductMin   = $('.product-list-wrap .product-item.price-min'),
              elProductList = $('.product-list')
        ;

        self.scrollToBottom.stop();

        if (elView.hasClass('un-view')) {
            // elProductItems.show();
            // elProductMin.hide();
            elView.removeClass('un-view').text(self.lang.view_all);
            elProductList.removeClass('only-super-sale');
        } else {
            // elProductItems.hide();
            // elProductMin.show();
            elView.addClass('un-view').text(self.lang.un_view_all);
            elProductList.addClass('only-super-sale');
        }

        self.goToElement('.time-countdown', 100);
    });

    elBody
        .on('click', '.category-filter__item-wrap .category-filter__item, .flash-deal-block .time-tab__item', function (e) {
            if (!$(e.target).hasClass('sendo-get-product')) {
                elViewAllProductMinPrice.removeClass('un-view').text(self.lang.view_all);
            }

            self.data.listProductFlashSale = [];
        })
        .on('click', '.view-product-item', function () {
            let elView          = $(this),
                priceClass      = elView.data('price'),
                elProductItems  = $('.product-list-wrap .product-item.price-min--' + priceClass),
                elProductOthers = $('.product-list-wrap .product-item:not(.price-min--' + priceClass + ')')
            ;

            self.scrollToBottom.stop();
            elProductItems.show();
            elProductOthers.hide();

            self.goToElement('.time-countdown', 100);
        })
        .on('click', '.' + self.options.classContainerListProductMin + ' .start-scroll', function () {
            self.scrollToBottom.start();
        })
        .on('click', '.' + self.options.classContainerListProductMin + ' .stop-scroll', function () {
            self.scrollToBottom.stop();
        })
    ;

    const priceSearch = self.priceSearch,
          observer    = new MutationObserver(function () {
              if ($('.product-list').hasClass('only-super-sale')) {
                  return;
              }

              const elProductListItem = $('.product-list-wrap .product-item:not(.is-read)');

              if (!elProductListItem.length) {
                  return;
              }

              elProductListItem.each(function () {
                  let elProduct        = $(this),
                      priceFinalText   = elProduct.find('.product-item__price--final').text(),
                      priceFinalNumber = self.convertCurrencyToNumber(priceFinalText)
                  ;

                  elProduct.addClass('is-read');

                  if (priceFinalNumber <= priceSearch) {
                      if (self.data.listProductFlashSale[priceFinalNumber]) {
                          self.data.listProductFlashSale[priceFinalNumber]++;
                      } else {
                          self.data.listProductFlashSale[priceFinalNumber] = 1;
                      }

                      // priceSearch = priceFinalNumber;
                      elProduct.addClass('product-item-by-extension price-min price-min--' + priceFinalNumber);
                  }
              });

              // if (elProductList.length) {
              //     elViewAllProductMinPrice.removeClass('un-view').text(self.lang.view_all);
              // }

              // /*let productListText = '';
              //
              // productList.forEach(function (amount, price) {
              //     productListText += '' +
              //         '<tr>' +
              //         '   <td class="price">' + self.convertNumberToCurrency(price, false) + '</td>' +
              //         '   <td class="amount">' + amount + '</td>' +
              //         '   <td class="view">' +
              //         '       <span class="view-product-item" data-price="' + price + '">' +
              //         '           ' + self.lang.view + '' +
              //         '       </span>' +
              //         '</td>' +
              //         '</tr>'
              //     ;
              // });
              //
              // elPriceMinContainer
              //     .show()
              //     .end()
              //     .find('.price-list tbody')
              //     .html(productListText)
              // ;*/

              self.showMyListProductFlashSale();
          })
    ;

    // Options for the observer (which mutations to observe)
    const observerConfig = {
        childList: true,
        subtree  : true
    };

    // pass in the target node, as well as the observer options
    observer.observe(target[0], observerConfig);
};

/**
 * Create event auto scroll to bottom
 *
 * @return {Object} {{stop: stop, start: start}}
 * @since 2019-10-18
 */
Sendo.prototype.createScrollToBottom = function () {
    let self = this;

    return {
        start: function () {
            let elControlScroll = $('.' + self.options.classContainerListProductMin + ' .start-scroll');

            elControlScroll
                .text(self.lang.stop_scroll)
                .addClass('stop-scroll')
                .removeClass('start-scroll')
            ;

            self.goToElement('.webFooter_1sFS', 200);

            self.objAutoScrollBottom = setInterval(function () {
                self.goToElement('.webFooter_1sFS', 200);
            }, 1500);
        },
        stop : function () {
            let elControlScroll = $('.' + self.options.classContainerListProductMin + ' .stop-scroll');

            elControlScroll
                .text(self.lang.start_scroll)
                .addClass('start-scroll')
                .removeClass('stop-scroll')
            ;

            clearInterval(self.objAutoScrollBottom);
        }
    };
};

/**
 * Send ajax get order info
 * {"shop_id":447866,"product_hashes":["756e9b2eae5fdde742c93fb52082a8f4"],"sendo_platform":"desktop2","current_voucher":{"enable_suggest_voucher":true},"current_receive_email_info":{"is_disable_suggest_email":false,"receive_email":""},"current_ticket_info":{"is_validate_date":false,"use_date":0},"enable_tracking":true,"ignore_invalid_product":-1,"version":3.1}
 */
Sendo.prototype.sendRequestGetOrderInfo = function () {
    const self = this;

    if (self.data.isSaveOrder) {
        return;
    }

    const urlString    = window.location.search,
          searchParams = new URLSearchParams(urlString),
          dataPost     = {
              shop_id        : parseInt(searchParams.get('shop')),
              product_hashes : [searchParams.get('product')],
              current_carrier: self.options.carrier.cod
          }
    ;

    return $.ajax({
        method     : 'POST',
        url        : self.options.links.checkout.info,
        dataType   : 'json',
        contentType: 'application/json',
        data       : JSON.stringify(dataPost),
        success    : function (response) {
            const productData = response['data']['products_checkout']['products'][0],
                  finalPrice  = productData['final_price'],
                  now         = new Date()
            ;

            self.data.orderProductInfo.push({
                time      : now,
                price     : productData['price'],
                finalPrice: finalPrice
            });

            console.log('Final price: ', finalPrice);

            if (finalPrice <= self.priceMax) {
                self.data.isSaveOrder = true;
                self.sendRequestSaveOrder(response['data']);
            }
        },
        complete   : function () {
            self.sendRequestGetOrderInfo();

            let bodyResult = '';

            self.data.orderProductInfo.forEach(function (item, index) {
                const time    = item.time,
                      hours   = ('0' + time.getDate()).slice(-2),
                      minutes = ('0' + time.getMinutes()).slice(-2),
                      seconds = ('0' + time.getSeconds()).slice(-2),
                      timeTxt = hours + ':' + minutes + ':' + seconds
                ;

                bodyResult += '' +
                    '<tr>' +
                    '   <td>' + (index + 1) + '</td>' +
                    '   <td>' + timeTxt + '</td>' +
                    '   <td>' + self.convertNumberToCurrency(item.price, true) + '</td>' +
                    '   <td>' + self.convertNumberToCurrency(item.finalPrice, true) + '</td>' +
                    '</tr>'
                ;
            });

            $('.result-get-order-info table tbody')
                .empty()
                .append(bodyResult)
            ;
        }
    });
};

/**
 * Send ajax save order
 * {"shop_id":447866,"current_products":[{"product_id":24089112,"name":"BỘ NỒI INOX 3 ĐÁY GE35-3306SGMT","categories":"1/2/1019/1020/1021","brand_id":237,"source_page_id":"FS_popular","source_block_id":"FS_products","price":590000,"final_price":279000,"weight":2200,"qty":1,"option_data":[{"value":"inox","option_id":2335033,"product_option_id":"24089112_2335033","name":"Màu sắc","type":"Option","attribute_id":284,"product_option":"24089112_284","attribute_code":"mau_sac"}],"hash":"756e9b2eae5fdde742c93fb52082a8f4","image":"https://media3.scdn.vn/img3/2019/11_28/fL4ZVv.jpg","image_resize":{"image":"https://media3.scdn.vn/img3/2019/11_28/fL4ZVv.jpg","image_50x50":"https://media3.scdn.vn/img3/2019/11_28/fL4ZVv_simg_02d57e_50x50_maxb.jpg","image_100x100":"https://media3.scdn.vn/img3/2019/11_28/fL4ZVv_simg_3a7818_100x100_maxb.jpg"},"promotion":{"flash_deal_price":279000,"start_at":1576030200,"end_at":1576036800,"flash_deal_id":41837053,"flash_deal_remain":50,"slot_id":35213814},"origin_final_price":590000,"sku":"1021_24089112","sku_user":"10202180-10202180","attribute_hash":"2335033","category_id":1019,"checkout_weight":2200,"cat_path":"bo-noi-inox-3-day-ge35-3306sgmt-24089112.html","extended_shipping_package":{},"unit_id":2,"is_valid":true,"product_type":1}],"current_address_id":19458150,"current_carrier":"ecom_shipping_dispatch_cptc_sc","current_payment_method":{"method":"cod_payment"},"current_voucher":{"voucher_code":"","voucher_value":0,"is_shop_voucher":false,"voucher_campaign_code":"","sub_total":0,"payment_method":"","error":"","is_enable_captcha":false,"captcha_response":"","enable_suggest_voucher":true,"tracking_order_source":0,"suggested_message":"","redeemed_at":0,"voucher_wallet_list":[]},"sendo_platform":"desktop2","ignore_invalid_product":-1,"product_hashes":["756e9b2eae5fdde742c93fb52082a8f4"],"version":3.1,"order_type":1}
 */
Sendo.prototype.sendRequestSaveOrder = function (data) {

    const self     = this,
          dataPost = {
              shop_id               : data['shop_info']['shop_id'],
              current_products      : data['products_checkout']['products'],
              current_address_id    : data['customer_data']['current_address_id'],
              current_carrier       : data['shipping_info']['current_carrier'],
              current_payment_method:  {
                  "method" :"ecom_payment",
                  "card_type": "bank_transfer",
                  "card": 1
              },
              current_voucher       : data['voucher_info'],
              sendo_platform        : 'desktop2',
              ignore_invalid_product: data['ignore_invalid_product'],
              product_hashes        : data['products_checkout']['product_hashes'],
              version               : 3.1,
              order_type            : data['order_type']
          }
    ;

    $.ajax({
        method     : 'POST',
        url        : self.options.links.checkout.saveOrder,
        dataType   : 'json',
        contentType: 'application/json',
        data       : JSON.stringify(dataPost),
        success    : function (response) {
            console.log(response);

            if (response['increment_id']) {
                window.open(response['payment_url'], '_blank');
            } else {
                alert(response.errors[0]['message']);
            }
        }
    });
};

Sendo.prototype.doProcessOrder = function () {
    const self        = this,
          storageVars = ['priceMax']
    ;

    self.data.isSaveOrder = false;

    // get new max price
    chrome.storage.sync.get(storageVars, function (storage) {
        self.priceMax = storage.priceMax;

        self.sendRequestGetOrderInfo();

        setTimeout(function () {
            self.data.isSaveOrder = true;
        }, 5000);
    });
};

Sendo.prototype.initDivResultGetOrderInfo = function () {
    const currentUrl = window.location.href;

    if (!currentUrl.match(/checkout.sendo.vn/)) {
        return;
    }

    const div = '' +
        '<div class="result-get-order-info">' +
        '   <table>' +
        '       <thead>' +
        '           <tr>' +
        '               <th>STT</th>' +
        '               <th>Thời gian</th>' +
        '               <th>Giá gốc</th>' +
        '               <th>Giá giảm</th>' +
        '           </tr>' +
        '       </thead>' +
        '       <tbody></tbody>' +
        '   </table>' +
        '</div>'
    ;

    $('body').append(div);
};

Sendo.prototype.initGetProductListSale = function () {
    // create an observer instance
    let observer = new MutationObserver(function (mutationRecordsList) {
        mutationRecordsList.forEach(function (mutationRecord) {
            if (mutationRecord.addedNodes.length) {
                let addedNode     = $(mutationRecord.addedNodes[0]),
                    elTimeTabList = addedNode.find('.time-tab-flash-sale__list')
                ;

                if (elTimeTabList.length) {
                    // observer.disconnect();

                    elTimeTabList.find('.time-tab__item__link').each(function () {
                            const elTimeTabItem = $(this);
                        // console.log(elTimeTabItem);
                        elTimeTabItem.append(
                            '<span class="fa fa-arrow-circle-o-down sendo-get-product" aria-hidden="true"></span>'
                        );
                    });
                }
            }
        });
    });
    // Options for the observer (which mutations to observe)
    const self           = this,
          elRoot         = $('#root'),
          observerConfig = {childList: true, subtree: true}
    ;
    // pass in the target node, as well as the observer options
    observer.observe(document,{childList:true, subtree:true, attributes:true, characterData:true});

    elRoot.on('click', '.sendo-get-product:not(.fa-spin)', function () {
        const elIconGetProduct = $(this),
              elTimeTabItem    = elIconGetProduct.parent('.time-tab__item__link'),
              timeStatus       = elTimeTabItem.find('.time-tab__item__status-fs').text(),
              slotTime         = elTimeTabItem.find('.time-tab__item__date').text(),
              time             = slotTime + ':00',
              now              = new Date()
        ;
        console.log(elTimeTabItem);

        self.data.listProductFlashSale = [];
        self.goToElement('.time-countdown', 100);

        elIconGetProduct
            .addClass('fa-spinner fa-spin')
            .removeClass('fa-arrow-circle-o-down')
        ;

        $('.product-list')
            .addClass('only-super-sale')
            .find('.product-item-by-extension')
            .remove()
        ;

        $('.' + self.options.classContainerListProductMin)
            .find('.view-all')
            .addClass('un-view')
            .text(self.lang.un_view_all)
        ;

        if (timeStatus === 'Ngày mai') {
            now.setDate(now.getDate() + 1);
        }

        let nowMonth = now.getMonth() + 1,
            nowDate  = now.getDate()
        ;

        if (nowMonth < 10) {
            nowMonth = '0' + nowMonth;
        }

        if (nowDate < 10) {
            nowDate = '0' + nowDate;
        }

        const fullTime = now.getFullYear() + '-' + nowMonth + '-' + nowDate + ' ' + time;
        self.sendRequestGetProductList(fullTime, 1);
    });
};

Sendo.prototype.sendRequestGetProductList = function (slot, page) {
    const self     = this,
          dataPost = {
              page             : page,
              limit            : 30,
              special_status   : 0,
              category_group_id: 0,
              buy_limit        : 0,
              shoptype         : 0,
              is_new_app       : 0,
              tag              : 0,
              slot             : slot
          }
    ;

    $.ajax({
        method     : 'POST',
        url        : self.options.links.getProductList,
        dataType   : 'json',
        contentType: 'application/json',
        data       : JSON.stringify(dataPost),
        success    : function (response) {
            if (response.status) {
                let productStr = '';

                $.each(response.data['products'], function (index, product) {
                    if (product['final_price'] > self.priceSearch) {
                        return true; //continue
                    }

                    const finalPrice = product['final_price'];

                    let productItemPriceLeft = '',
                        productClass         = '',
                        productPrice         = '' +
                            '<span class="product-item__price--original">' +
                            '   ' + self.convertNumberToCurrency(product.price, true) +
                            '</span>' +
                            '<span class="product-item__price--final">' +
                            '   ' + self.convertNumberToCurrency(finalPrice) +
                            '</span>',
                        btnBuyNowClass       = ''
                    ;

                    if (finalPrice <= self.priceMax) {
                        productClass += ' is-read price-min price-min--' + finalPrice;

                        if (self.data.listProductFlashSale[finalPrice]) {
                            self.data.listProductFlashSale[finalPrice]++;
                        } else {
                            self.data.listProductFlashSale[finalPrice] = 1;
                        }
                    } else {
                        productClass += ' hide';
                    }

                    if (product['product_display']) {
                        switch (product['product_display']) {
                            case 'buy_later':
                                let textReminder = '';

                                if (product['reminder']) {
                                    textReminder = '<strong>' + product['reminder'] + ' </strong> người quan tâm';
                                } else {
                                    textReminder = 'Quan tâm trên APP';
                                }

                                productClass += ' product-item--sneak';
                                productItemPriceLeft = '' +
                                    '<div class="product-item__reminder">' +
                                    '   <span class="product-item__reminder-text text-center">' + textReminder + '</span>' +
                                    '</div>'
                                ;
                                break;

                            case 'buy_now':
                                productItemPriceLeft = '' +
                                    '<div style="width: 100%; position: relative;">' +
                                    '   <div></div>' +
                                    '   <div class="product-item__progress-bar">' +
                                    '       <span class="product-item__progress-content" style="width: 30%;"></span>' +
                                    '       <span class="product-item__progress-text text-center">' +
                                    '           Đã bán ' + (product['quantity'] - product['remain']) +
                                    '       </span>' +
                                    '   </div>' +
                                    '</div>'
                                ;
                                break;

                            case 'no_buy_flash_deal':
                            default:
                                productItemPriceLeft = '' +
                                    '<div class="product-item__price">' +
                                    '   ' + productPrice +
                                    '</div>'
                                ;
                                productPrice         = '';
                                btnBuyNowClass       = ' disabled';
                                productClass += ' product-item--disabled-clickable';
                                break;
                        }
                    }

                    productStr += '' +
                        '<div class="product-item-by-extension product-item product-item-flashdeal' + productClass + '" ' +
                        '   id="' + product.id + '"' +
                        '>' +
                        '   <div class="mouseover-hoc mouse-over-hoc" style="border: 1px solid red;">' +
                        '       <a class="product-item__link" href="' + product['url_key'] + '" title="' + product.name + '">' +
                        '           <div class="product-item__info">' +
                        '               <div class="product-item__info__img-wrap">' +
                        '                   <div class="product-item-flashdeal__icon-sale text-center text-uppercase">' +
                        '                       Giảm' +
                        '                       <span class="product-item-flashdeal__icon-sale__text">' +
                        '                           ' + product['promotion_percent'] + '%' +
                        '                       </span>' +
                        '                   </div>' +
                        '                   <img class="image-with-lazy-load image-with-lazy-load--entered image" ' +
                        '                       src="' + product.image + '" alt="' + product.name + '" ' +
                        '                       style="animation-duration: 1000ms;"' +
                        '                   />' +
                        '               </div>' +
                        '               <div class="product-item__footer">' +
                        '                   <div class="product-item__info__name-wrap">' +
                        '                       <div class="product-item__info__name">' + product.name + '</div>' +
                        '                   </div>' +
                        '                   <div class="product-item-flashdeal__price-control-wrap"></div>' +
                        '                   <div class="product-item__price">' + productPrice + '</div>' +
                        '                   <div class="product-item__price-wrapper flex align-end">' +
                        '                       <div class="product-item__price--left">' + productItemPriceLeft + '</div>' +
                        '                       <div class="product-item__price--right">' +
                        '                           <div class="product-item__buy-now">' +
                        '                               <div class="product-item__buy-now__btn' + btnBuyNowClass + '">' + product['button_text'] + '</div>' +
                        '                           </div>' +
                        '                       </div>' +
                        '                   </div>' +
                        '               </div>' +
                        '           </div>' +
                        '       </a>' +
                        '   </div>' +
                        '</div>'
                    ;
                });

                $('.product-list').append(productStr);
                self.showMyListProductFlashSale();
                self.sendRequestGetProductList(slot, page + 1);
            } else {
                $('.sendo-get-product')
                    .removeClass('fa-spinner fa-spin')
                    .addClass('fa-arrow-circle-o-down')
                ;
            }
        }
    });
};

Sendo.prototype.showMyListProductFlashSale = function () {
    const self          = this;
    let productListText = '';

    self.data.listProductFlashSale.forEach(function (amount, price) {
        productListText += '' +
            '<tr>' +
            '   <td class="price">' + self.convertNumberToCurrency(price, false) + '</td>' +
            '   <td class="amount">' + amount + '</td>' +
            '   <td class="view">' +
            '       <span class="view-product-item" data-price="' + price + '">' +
            '           ' + self.lang.view + '' +
            '       </span>' +
            '</td>' +
            '</tr>'
        ;
    });

    const elPriceMinContainer = $('.' + self.options.classContainerListProductMin);

    elPriceMinContainer
        .find('.price-list tbody')
        .html(productListText)
    ;
};

/**
 * DOM is ready
 */
$(function () {

    let sendoObj = new Sendo();
    console.log(sendoObj);

    // sendoObj.sendRequestGetOrderInfo();
    //
    // setTimeout(function () {
    //     sendoObj.data.isSaveOrder = true;
    // }, 1000);

});
