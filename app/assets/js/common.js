function convertNumberToCurrency(number, is_symbol) {
    let symbol = (is_symbol) ? 'đ' : '';
    return (number / 1000).toFixed(3) + symbol;
}