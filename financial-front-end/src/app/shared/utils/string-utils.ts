export class StringUtils {
    public static isNullOrEmpty(val: string): boolean {
        if(val === undefined || val === null || val.trim() === ''){
            return true;
        }
        return false;
    }

    public static justNumbers(number: string) : string {
        return number.replace(/[^0-9]/g,'');
    }
}