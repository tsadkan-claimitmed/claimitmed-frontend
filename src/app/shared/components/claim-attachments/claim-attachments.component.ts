import { Component, Input, inject } from '@angular/core';
import { CommonModule, DatePipe, NgTemplateOutlet } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ClaimAttachment } from '../../../core/models';
import { DocumentType } from '../../../core/models/enums';
import { ConfigService } from '../../../core/services/config.service';

@Component({
  selector: 'app-claim-attachments',
  standalone: true,
  imports: [CommonModule, DatePipe, NgTemplateOutlet],
  templateUrl: './claim-attachments.component.html',
  styleUrl: './claim-attachments.component.scss',
})
export class ClaimAttachmentsComponent {
  private readonly config = inject(ConfigService);
  private readonly sanitizer = inject(DomSanitizer);

  @Input() attachments: ClaimAttachment[] = [];
  @Input() title = 'Attachments';
  @Input() emptyMessage = 'No files have been attached to this claim.';

  viewing: ClaimAttachment | null = null;
  viewingReceiptUrl: SafeResourceUrl | null = null;
  listingOpen = false;
  readonly previewLimit = 2;

  sortedAttachments(): ClaimAttachment[] {
    return [...this.attachments].sort((a, b) => Number(this.isReceipt(b)) - Number(this.isReceipt(a)));
  }

  assetUrl(attachment: ClaimAttachment): string | null {
    return this.config.resolveAssetUrl(attachment.url);
  }

  fileName(attachment: ClaimAttachment): string {
    if (this.isReceipt(attachment)) {
      return 'Visit tax invoice';
    }
    return attachment.originalFilename || attachment.url.split('/').pop() || 'attachment';
  }

  isReceipt(attachment: ClaimAttachment): boolean {
    return attachment.documentType === DocumentType.RECEIPT || attachment.mimeType === 'text/html';
  }

  viewAttachment(attachment: ClaimAttachment): void {
    const url = this.assetUrl(attachment);
    if (!url) {
      return;
    }
    if (this.isReceipt(attachment)) {
      this.viewing = attachment;
      this.viewingReceiptUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      return;
    }
    if (attachment.isImage) {
      this.viewing = attachment;
      this.viewingReceiptUrl = null;
    }
  }

  closeViewer(): void {
    this.viewing = null;
    this.viewingReceiptUrl = null;
  }

  openFileList(): void {
    this.listingOpen = true;
  }

  closeFileList(): void {
    this.listingOpen = false;
  }

  printReceipt(): void {
    const url = this.viewing ? this.assetUrl(this.viewing) : null;
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }

  download(attachment: ClaimAttachment): void {
    const url = this.assetUrl(attachment);
    if (!url) {
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = this.fileName(attachment);
    link.target = '_blank';
    link.rel = 'noopener';
    link.click();
  }
}
