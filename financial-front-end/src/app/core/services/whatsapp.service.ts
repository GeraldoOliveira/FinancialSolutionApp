import { Injectable } from '@angular/core';

export interface WhatsAppMessagePayload {
  recipientPhone: string;
  recipientName: string;
  establishment: string;
  totalAmount: number;
  proratedAmount: number;
  paymentMethod: string;
  cardName?: string;
  invoiceMonth?: string;
  date: string;
  receiptNotes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsappService {
  generateExpenseMessage(payload: WhatsAppMessagePayload): string {
    const formattedTotal = this.formatCurrency(payload.totalAmount);
    const formattedProrated = this.formatCurrency(payload.proratedAmount);

    let message = `*Olá, ${payload.recipientName}!* 👋\n\n`;
    message += `Acabei de registrar uma nova despesa no *Financial App*:\n\n`;
    message += `🛒 *Local/Gasto:* ${payload.establishment}\n`;
    message += `📅 *Data:* ${payload.date}\n`;
    message += `💳 *Forma de Pagamento:* ${payload.paymentMethod}`;

    if (payload.cardName) {
      message += ` (${payload.cardName})`;
    }
    message += `\n`;

    if (payload.invoiceMonth) {
      message += `🗓️ *Fatura de Referência:* ${payload.invoiceMonth}\n`;
    }

    message += `💰 *Valor Total:* ${formattedTotal}\n`;
    message += `-----------------------------------\n`;
    message += `📌 *Sua parte no rateio:* *${formattedProrated}*\n`;

    if (payload.receiptNotes) {
      message += `📝 *Obs / Comprovante:* ${payload.receiptNotes}\n`;
    }

    message += `-----------------------------------\n`;
    message += `_Confira os detalhes e o comprovante no app._ ✨`;

    return message;
  }

  getWhatsAppUrl(phone: string, message: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  }

  openWhatsApp(phone: string, message: string): void {
    const url = this.getWhatsAppUrl(phone, message);
    window.open(url, '_blank');
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
}
