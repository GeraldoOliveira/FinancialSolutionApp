import { Component, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ReceiptData {
  file: File;
  previewUrl: string;
  name: string;
  detectedTotal?: number;
  detectedDate?: string;
  detectedStore?: string;
}

@Component({
  selector: 'app-receipt-uploader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './receipt-uploader.html',
  styleUrl: './receipt-uploader.css'
})
export class ReceiptUploaderComponent {
  @Input() set initialUrl(val: string | null | undefined) {
    if (val) {
      this.previewUrl.set(val);
      this.receiptName.set(this.initialName || 'Comprovante anexado');
    }
  }
  @Input() initialName?: string;

  @Output() receiptCaptured = new EventEmitter<ReceiptData>();
  @Output() receiptCleared = new EventEmitter<void>();

  public isDragging = signal<boolean>(false);
  public previewUrl = signal<string | null>(null);
  public receiptName = signal<string>('');
  public isProcessing = signal<boolean>(false);

  @HostListener('window:paste', ['$event'])
  handlePaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          this.processFile(file, 'Comprovante colado (Ctrl+V)');
          break;
        }
      }
    }
  }

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
      this.processFile(event.dataTransfer.files[0], event.dataTransfer.files[0].name);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0], input.files[0].name);
    }
  }

  private processFile(file: File, fileName: string): void {
    this.isProcessing.set(true);
    const reader = new FileReader();

    reader.onload = () => {
      const url = reader.result as string;
      this.previewUrl.set(url);
      this.receiptName.set(fileName);
      this.isProcessing.set(false);

      this.receiptCaptured.emit({
        file,
        previewUrl: url,
        name: fileName
      });
    };

    reader.readAsDataURL(file);
  }

  clearReceipt(): void {
    this.previewUrl.set(null);
    this.receiptName.set('');
    this.receiptCleared.emit();
  }
}
