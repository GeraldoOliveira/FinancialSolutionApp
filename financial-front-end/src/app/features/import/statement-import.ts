import { Component, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BankStatementParser, RawBankTransaction } from '../../shared/utils/bank-statement-parser';
import {
  StatementImportService,
  ClassifiedTransaction
} from './services/statement-import.service';
import { ResponsibleService } from '../../core/services/responsible.service';

@Component({
  selector: 'app-statement-import',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, FormsModule, RouterLink],
  templateUrl: './statement-import.html'
})
export class StatementImport {
  public isDragging = signal(false);
  public isAnalyzing = signal(false);
  public isImporting = signal(false);
  public importCompleted = signal(false);
  public importedCount = signal(0);

  public fileName = signal('');
  public transactions = signal<ClassifiedTransaction[]>([]);

  // Filtro
  public filterType = signal<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');

  // Categorias disponíveis para edição
  public availableCategories: string[] = [
    'Supermercado',
    'Alimentacao',
    'Carro',
    'Viagem',
    'Saude',
    'Lazer',
    'Moradia',
    'Outros'
  ];

  // Métricas Computadas
  public selectedTransactions = computed(() => {
    return this.transactions().filter(t => t.selected);
  });

  public filteredTransactions = computed(() => {
    const f = this.filterType();
    return this.transactions().filter(t => {
      if (f === 'ALL') return true;
      return t.type === f;
    });
  });

  public totalSelectedExpenses = computed(() => {
    return this.selectedTransactions()
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
  });

  public totalSelectedIncomes = computed(() => {
    return this.selectedTransactions()
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
  });

  public isAllSelected = computed(() => {
    const list = this.transactions();
    return list.length > 0 && list.every(t => t.selected);
  });

  constructor(
    private importService: StatementImportService,
    public responsibleService: ResponsibleService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    this.fileName.set(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.processContent(content, file.name);
    };

    reader.readAsText(file);
  }

  processContent(content: string, fileName: string): void {
    this.isAnalyzing.set(true);
    let rawList: RawBankTransaction[] = [];

    if (fileName.toLowerCase().endsWith('.ofx')) {
      rawList = BankStatementParser.parseOFX(content);
    } else {
      rawList = BankStatementParser.parseCSV(content, fileName);
    }

    if (rawList.length === 0) {
      this.isAnalyzing.set(false);
      this.toastr.warning(
        'Não foi possível encontrar transações no arquivo. Verifique o formato ou tente o exemplo simulado.',
        'Arquivo Vazio'
      );
      return;
    }

    // Envia ao classificador de IA / heurísticas
    this.importService.classifyTransactions(rawList).subscribe({
      next: (res) => {
        this.transactions.set(res.items);
        this.isAnalyzing.set(false);
        this.importCompleted.set(false);
        this.toastr.success(
          `${res.items.length} transações identificadas e categorizadas pela IA!`,
          'Extrato Processado'
        );
      },
      error: () => {
        this.isAnalyzing.set(false);
        this.toastr.error('Erro ao categorizar transações com IA.', 'Erro');
      }
    });
  }

  loadSampleStatement(): void {
    const sampleOFX = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLFILEID:NONE
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>BRL
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261005120000
<TRNAMT>-342.80
<MEMO>SUPERMERCADO PAO DE ACUCAR
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261006143000
<TRNAMT>-190.50
<MEMO>POSTO IPIRANGA COMBUSTIVEL
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261007201500
<TRNAMT>-84.90
<MEMO>IFOOD RESTAURANTE DELIVERY
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261008080000
<TRNAMT>4500.00
<MEMO>SALARIO TECH CORP BRASIL
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261009101200
<TRNAMT>-68.40
<MEMO>DROGASIL FARMACIA MEDICAMENTOS
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261010184000
<TRNAMT>-39.90
<MEMO>NETFLIX ASSINATURA STREAMING
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

    this.fileName.set('extrato_bancario_exemplo.ofx');
    this.processContent(sampleOFX, 'extrato_bancario_exemplo.ofx');
  }

  toggleAll(checked: boolean): void {
    this.transactions.update(list => list.map(t => ({ ...t, selected: checked })));
  }

  toggleTransaction(tx: ClassifiedTransaction): void {
    tx.selected = !tx.selected;
  }

  confirmBatchImport(): void {
    const selected = this.selectedTransactions();
    if (selected.length === 0) {
      this.toastr.warning('Selecione pelo menos uma transação para importar.', 'Atenção');
      return;
    }

    this.isImporting.set(true);

    const expensesToImport = selected
      .filter(t => t.type === 'EXPENSE')
      .map(t => ({
        expenseOrigin: {
          name: t.establishment,
          description: t.originalDescription
        },
        totalValue: t.amount.toString(),
        paymentMethod: t.paymentMethod,
        methodList: t.paymentMethod,
        creditCardId: t.paymentMethod === '1' ? 1 : 0,
        creditCardList: t.paymentMethod === '1' ? '1' : 'None',
        installments: 1,
        userId: 2,
        categoryId: 1,
        categoryList: t.category,
        date: new Date(t.date),
        expenseResponsibles: t.suggestedResponsibles
      }));

    const incomesToImport = selected
      .filter(t => t.type === 'INCOME')
      .map(t => ({
        description: t.establishment,
        source: 'Salário / Transferência',
        amount: t.amount,
        date: t.date,
        recipientId: 2,
        received: true,
        notes: `Importado de extrato: ${t.originalDescription}`
      }));

    // Executa importação
    const hasExpenses = expensesToImport.length > 0;
    const hasIncomes = incomesToImport.length > 0;

    const finalize = () => {
      this.isImporting.set(false);
      this.importCompleted.set(true);
      this.importedCount.set(selected.length);
      this.toastr.success(
        `Importação concluída: ${expensesToImport.length} despesa(s) e ${incomesToImport.length} receita(s) adicionadas!`,
        'Sucesso'
      );
    };

    if (hasExpenses && hasIncomes) {
      this.importService.importExpensesBatch(expensesToImport).subscribe({
        next: () => {
          this.importService.importIncomesBatch(incomesToImport).subscribe({
            next: () => finalize(),
            error: () => {
              this.isImporting.set(false);
              this.toastr.error('Erro ao importar receitas em lote.', 'Erro');
            }
          });
        },
        error: () => {
          this.isImporting.set(false);
          this.toastr.error('Erro ao importar despesas em lote.', 'Erro');
        }
      });
    } else if (hasExpenses) {
      this.importService.importExpensesBatch(expensesToImport).subscribe({
        next: () => finalize(),
        error: () => {
          this.isImporting.set(false);
          this.toastr.error('Erro ao importar despesas em lote.', 'Erro');
        }
      });
    } else if (hasIncomes) {
      this.importService.importIncomesBatch(incomesToImport).subscribe({
        next: () => finalize(),
        error: () => {
          this.isImporting.set(false);
          this.toastr.error('Erro ao importar receitas em lote.', 'Erro');
        }
      });
    }
  }

  resetImport(): void {
    this.transactions.set([]);
    this.fileName.set('');
    this.importCompleted.set(false);
    this.importedCount.set(0);
  }
}
