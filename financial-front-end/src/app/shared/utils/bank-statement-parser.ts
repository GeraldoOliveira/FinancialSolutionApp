export interface RawBankTransaction {
  date: string;
  description: string;
  amount: number;
  type?: 'DEBIT' | 'CREDIT';
  fitId?: string;
  isCardInvoice?: boolean;
}

export class BankStatementParser {

  /**
   * Faz o parse de arquivo OFX (Open Financial Exchange) padrão de bancos brasileiros
   */
  public static parseOFX(content: string): RawBankTransaction[] {
    const transactions: RawBankTransaction[] = [];
    const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match: RegExpExecArray | null;

    while ((match = trnRegex.exec(content)) !== null) {
      const block = match[1];

      // Extrai campos
      const trnType = this.extractTag(block, 'TRNTYPE');
      const dtPosted = this.extractTag(block, 'DTPOSTED');
      const trnAmt = this.extractTag(block, 'TRNAMT');
      const memo = this.extractTag(block, 'MEMO') || this.extractTag(block, 'NAME') || 'Transação OFX';
      const fitId = this.extractTag(block, 'FITID');

      if (trnAmt) {
        const amountNum = parseFloat(trnAmt.replace(',', '.'));
        const formattedDate = this.formatOfxDate(dtPosted);

        transactions.push({
          date: formattedDate,
          description: memo.trim(),
          amount: amountNum,
          type: trnType?.toUpperCase() === 'CREDIT' || amountNum > 0 ? 'CREDIT' : 'DEBIT',
          fitId: fitId || undefined
        });
      }
    }

    return transactions;
  }

  /**
   * Faz o parse de arquivo CSV ou TXT com detecção inteligente de delimitador, colunas e se é fatura de cartão (ex: Nubank)
   */
  public static parseCSV(content: string, fileName: string = ''): RawBankTransaction[] {
    const transactions: RawBankTransaction[] = [];
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];

    // Detecta delimitador (, ou ; ou \t)
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : (firstLine.includes('\t') ? '\t' : ',');

    // Detecta se é fatura de cartão (ex: Nubank CSV que possui headers "date,category,title,amount" ou arquivo nubank)
    const lowerFirstLine = firstLine.toLowerCase();
    const isNubankOrCard = fileName.toLowerCase().includes('nubank') || 
      fileName.toLowerCase().includes('fatura') ||
      (lowerFirstLine.includes('category') && lowerFirstLine.includes('title') && lowerFirstLine.includes('amount')) ||
      (lowerFirstLine.includes('categoria') && lowerFirstLine.includes('título') && lowerFirstLine.includes('valor')) ||
      (lowerFirstLine.includes('categoria') && lowerFirstLine.includes('titulo') && lowerFirstLine.includes('valor'));

    for (let i = 0; i < lines.length; i++) {
      const rawCols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (rawCols.length < 2) continue;

      // Pula cabeçalhos prováveis
      const lineStr = lines[i].toLowerCase();
      if ((lineStr.includes('data') || lineStr.includes('date')) && 
          (lineStr.includes('valor') || lineStr.includes('amount') || lineStr.includes('descri') || lineStr.includes('title') || lineStr.includes('histórico'))) {
        continue;
      }

      let dateVal = '';
      let descVal = '';
      let amountVal: number | null = null;

      // Itera colunas para identificar Data, Descrição e Valor
      for (const col of rawCols) {
        // Tenta identificar Data
        if (!dateVal && this.isValidDateStr(col)) {
          dateVal = this.normalizeDate(col);
          continue;
        }

        // Tenta identificar Valor Numérico
        const parsedAmt = this.parseCurrency(col);
        if (amountVal === null && parsedAmt !== null) {
          amountVal = parsedAmt;
          continue;
        }

        // Caso contrário, considera como parte da descrição
        if (col && !descVal && !this.isValidDateStr(col)) {
          descVal = col;
        }
      }

      if (descVal && amountVal !== null) {
        // Em faturas de cartão Nubank:
        // - Valor positivo = compra efetuada (DEBIT / Despesa)
        // - Valor negativo = pagamento efetuado na fatura ou estorno (CREDIT / Receita de abatimento)
        let txType: 'DEBIT' | 'CREDIT';
        if (isNubankOrCard) {
          txType = amountVal < 0 ? 'CREDIT' : 'DEBIT';
        } else {
          txType = amountVal >= 0 ? 'CREDIT' : 'DEBIT';
        }

        transactions.push({
          date: dateVal || new Date().toISOString().substring(0, 10),
          description: descVal,
          amount: amountVal,
          type: txType,
          isCardInvoice: isNubankOrCard
        });
      }
    }

    return transactions;
  }

  private static extractTag(block: string, tag: string): string {
    const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
    const match = block.match(regex);
    return match ? match[1].trim() : '';
  }

  private static formatOfxDate(dt: string): string {
    if (!dt || dt.length < 8) return new Date().toISOString().substring(0, 10);
    // DTPOSTED típico: YYYYMMDD ou YYYYMMDDHHMMSS
    const y = dt.substring(0, 4);
    const m = dt.substring(4, 6);
    const d = dt.substring(6, 8);
    return `${y}-${m}-${d}`;
  }

  private static isValidDateStr(str: string): boolean {
    const clean = str.trim();
    // DD/MM/YYYY ou YYYY-MM-DD ou DD-MM-YYYY
    return /^\d{2}[/-]\d{2}[/-]\d{4}$/.test(clean) || /^\d{4}-\d{2}-\d{2}$/.test(clean);
  }

  private static normalizeDate(str: string): string {
    const clean = str.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    const parts = clean.split(/[/-]/);
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
    return new Date().toISOString().substring(0, 10);
  }

  private static parseCurrency(val: string): number | null {
    const clean = val.replace(/R\$/gi, '').replace(/\s/g, '').trim();
    // Ex: " -1.250,50 " ou " 45.00 " ou " -45,00 "
    if (!/^-?\d+(?:[.,]\d+)?$/.test(clean) && !/^-?\d{1,3}(?:\.\d{3})*(?:,\d{2})?$/.test(clean)) {
      return null;
    }
    let normalized = clean;
    if (clean.includes(',') && clean.includes('.')) {
      // 1.250,50 -> 1250.50
      normalized = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
      // 150,50 -> 150.50
      normalized = clean.replace(',', '.');
    }
    const num = parseFloat(normalized);
    return isNaN(num) ? null : num;
  }
}
