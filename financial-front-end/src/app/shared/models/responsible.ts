export interface Responsible {
  id: number;
  name: string;
  phone: string; // Obrigatório para integração e notificações automáticas (WhatsApp / SMS)
  email?: string;
  color?: string;
  avatar?: string;
  pixKey?: string;
  pixKeyType?: 'CPF' | 'EMAIL' | 'PHONE' | 'RANDOM';
  city?: string;
  notes?: string;
  active?: boolean;
}
