export interface PixPayloadParams {
  pixKey: string;
  merchantName: string;
  merchantCity?: string;
  amount: number;
  txId?: string;
}

export class PixGenerator {
  private static formatField(id: string, value: string): string {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  }

  private static crc16(payload: string): string {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = (crc << 1);
        }
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  public static generatePayload(params: PixPayloadParams): string {
    const cleanKey = params.pixKey.trim();
    const cleanName = (params.merchantName || 'FINANCIAL')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .substring(0, 25)
      .toUpperCase();

    const cleanCity = (params.merchantCity || 'SAO PAULO')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .substring(0, 15)
      .toUpperCase();

    const cleanAmount = params.amount.toFixed(2);
    const txId = (params.txId || '***').substring(0, 25);

    // 00: Payload Format Indicator = '01'
    const f00 = this.formatField('00', '01');

    // 26: Merchant Account Information
    const gui = this.formatField('00', 'br.gov.bcb.pix');
    const key = this.formatField('01', cleanKey);
    const f26 = this.formatField('26', `${gui}${key}`);

    // 52: Merchant Category Code = '0000'
    const f52 = this.formatField('52', '0000');

    // 53: Transaction Currency = '986' (BRL)
    const f53 = this.formatField('53', '986');

    // 54: Transaction Amount
    const f54 = this.formatField('54', cleanAmount);

    // 58: Country Code = 'BR'
    const f58 = this.formatField('58', 'BR');

    // 59: Merchant Name
    const f59 = this.formatField('59', cleanName || 'BENEFICIARIO');

    // 60: Merchant City
    const f60 = this.formatField('60', cleanCity || 'CIDADE');

    // 62: Additional Data Field (TxID)
    const ref = this.formatField('05', txId);
    const f62 = this.formatField('62', ref);

    // 63: CRC16
    const partialPayload = `${f00}${f26}${f52}${f53}${f54}${f58}${f59}${f60}${f62}6304`;
    const checksum = this.crc16(partialPayload);

    return `${partialPayload}${checksum}`;
  }
}
