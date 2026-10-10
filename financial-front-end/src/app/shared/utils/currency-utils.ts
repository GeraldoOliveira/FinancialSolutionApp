export class CurrencyUtils {

    public static StringToDecimal(input: string | number | null | undefined): number {
        if (input == null || input == undefined) {
            return 0;
        }

        if (typeof input === 'number') {
            return isNaN(input) ? 0 : input;
        }

        const trimmed = input.toString().trim();
        if (trimmed === '') {
            return 0;
        }

        let cleanValue = trimmed.replace(/[R$\s]/g, '');

        if (cleanValue.includes(',') && cleanValue.includes('.')) {
            // Ex: "1.234,56" -> remove pontos de milhar, substitui vírgula por ponto
            cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
        } else if (cleanValue.includes(',')) {
            // Ex: "123,45" -> substitui vírgula decimal por ponto
            cleanValue = cleanValue.replace(',', '.');
        } else if ((cleanValue.match(/\./g) || []).length > 1) {
            // Ex: "1.000.000" -> múltiplos pontos são separadores de milhar
            cleanValue = cleanValue.replace(/\./g, '');
        }

        const numericValue = parseFloat(cleanValue);

        return isNaN(numericValue) ? 0 : numericValue;
    }

    public static DecimalToString(input: number | string | null | undefined): string {
        if (input == null || input == undefined) {
            return '0,00';
        }

        const numeric = typeof input === 'number' ? input : this.StringToDecimal(input);
        if (isNaN(numeric)) {
            return '0,00';
        }

        return numeric.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    public static RoundToTwoDecimals(value: number): number {
        return Math.round(value * 100) / 100;
    }

}