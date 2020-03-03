'use strict';

import jQuery from 'jquery';

window.$ = window.jQuery = jQuery;
require('jquery-ui');

let Sendo = function () {
    this.options = {
        observerTarget              : '.Root_1oun',
        classContainerListProductMin: 'price-min-container'
    };

    this.lang = {
        view        : 'Xem',
        view_all    : 'Xem tất cả',
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

        self.initOrder();
        self.initGetListProduct();
    });

    this.objAutoScrollBottom = null;

    /**
     *
     * @type {Object} {{stop: stop, start: start}}
     */
    this.scrollToBottom = this.createScrollToBottom();
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
    let self              = this,
        elTotalAndBtnCard = $('body').find('[class^="totalAndSubmit"]')
    ;

    if (!elTotalAndBtnCard.length) {
        self.logInfo(false);
        self.mutationObserver();
        return;
    } else {
        self.logInfo(true);
    }

    let elPrice   = elTotalAndBtnCard.find('[class^="totalPrice"]'),
        priceText = elPrice.text(),
        price     = self.convertCurrencyToNumber(priceText)
    ;

    console.info('Product price: ' + priceText);

    self.chooseShippingMethod();

    if (!self.isEnable) {
        return true;
    }

    if (price > self.priceMax) {
        location.reload();
        return true;
    }

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

Sendo.prototype.initGetListProduct = function () {
    let self   = this,
        target = $('#page-container'),
        elBody = $('body')
    ;

    if (!target.length) {
        return;
    }

    let priceMinContainer = '' +
        '<div class="' + self.options.classContainerListProductMin + '">' +
        '   <p class="">Giá tìm kiếm: ' + self.convertNumberToCurrency(self.priceSearch, true) + '</p>' +
        '   <div class="header">' +
        '       <p class="block"><button class="start-scroll">' + self.lang.start_scroll + '</button></p>' +
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

    let elPriceMinContainer      = $('.' + self.options.classContainerListProductMin),
        elViewAllProductMinPrice = elPriceMinContainer.find('.view-all'),
        productList              = []
    ;

    elPriceMinContainer
        .hide()
        .draggable({
            axis       : 'y',
            containment: 'window',
            scroll     : false
        });

    elViewAllProductMinPrice.click(function () {
        let elView         = $(this),
            elProductItems = $('.product-list-wrap .product-item:not(.price-min)'),
            elProductMin   = $('.product-list-wrap .product-item.price-min')
        ;

        self.scrollToBottom.stop();

        if (elView.hasClass('un-view')) {
            elProductItems.show();
            elProductMin.hide();
            elView.removeClass('un-view').text(self.lang.view_all);
        } else {
            elProductItems.hide();
            elProductMin.show();
            elView.addClass('un-view').text(self.lang.un_view_all);
        }

        self.goToElement('.time-countdown', 100);
    });

    elBody
        .on('click', '.category-filter__item-wrap .category-filter__item, .flash-deal-block .time-tab__item', function () {
            elViewAllProductMinPrice.removeClass('un-view').text(self.lang.view_all);
            productList = [];
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

    // create an observer instance
    let observer = new MutationObserver(function () {
        let priceSearch   = self.priceSearch,
            elProductList = $('.product-list-wrap .product-item:not(.is-read)')
        ;

        if (!elProductList.length) {
            return;
        }

        elProductList.each(function () {
            let elProduct        = $(this),
                priceFinalText   = elProduct.find('.product-item__price--final').text(),
                priceFinalNumber = self.convertCurrencyToNumber(priceFinalText)
            ;

            elProduct.addClass('is-read');

            if (priceFinalNumber <= priceSearch) {
                if (productList[priceFinalNumber]) {
                    productList[priceFinalNumber]++;
                } else {
                    productList[priceFinalNumber] = 1;
                }

                // priceSearch = priceFinalNumber;
                elProduct.addClass('price-min price-min--' + priceFinalNumber);
            }
        });

        if (elProductList.length) {
            elViewAllProductMinPrice.removeClass('un-view').text(self.lang.view_all);
        }

        let productListText = '';

        productList.forEach(function (amount, price) {
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

        elPriceMinContainer
            .show()
            .end()
            .find('.price-list tbody')
            .html(productListText)
        ;
    });

    // Options for the observer (which mutations to observe)
    let observerConfig = {
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
 * DOM is ready
 */
$(function () {

    let sendoObj = new Sendo();
    console.log(sendoObj);

});
