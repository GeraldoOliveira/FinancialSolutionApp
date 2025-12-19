export class CurrencyUtils {

    public static StringToDecimal(input: string | null | undefined): number {
        if (input == null || input == undefined || input.trim() === '') {
            return 0;
        }

        let cleanValue = input.replace(/[R$\s]/g, '');
        cleanValue = cleanValue.replace(/\./g, '');

        cleanValue = cleanValue.replace(',', '.');

        const numericValue = parseFloat(cleanValue);

        return isNaN(numericValue) ? 0 : numericValue;
    }

    public static DecimalToString(input: number | null | undefined): string {
        if (input == null || input == undefined || isNaN(input)) {
            return '0,00';
        }

        return input.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    public static RoundToTwoDecimals(value: number): number {
        return Math.round(value * 100) / 100;
    }

}