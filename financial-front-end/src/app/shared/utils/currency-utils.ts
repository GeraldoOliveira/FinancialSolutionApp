export class CurrencyUtils {

    public static StringToDecimal(input): any {

        if (input == null || input == undefined) {
            return 0;
        }

        input = input.replace(/\./g, '');
        input = input.replace(/,/g, '.');
        return parseFloat(input);

    }

    public static DecimalToString(input): any {

        var ret = (input) ? input.toString().replace('.', ',') : null;
        if (ret) {
            var decArr = ret.split(',');
            if (decArr.length > 1) {
                var dec = decArr[1].length;
                if (dec == 1) {
                    ret += '0';
                }
            }
            return ret;
        }
    }

}