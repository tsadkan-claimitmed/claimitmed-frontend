import { Component, Input, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ClaimAttachment } from '../../../core/models';
import { ConfigService } from '../../../core/services/config.service';

@Component({
  selector: 'app-claim-attachments',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './claim-attachments.component.html',
  styleUrl: './claim-attachments.component.scss',
})
export class ClaimAttachmentsComponent {
  private readonly config = inject(ConfigService);

  @Input() attachments: ClaimAttachment[] = [];
  @Input() title = 'Attachments';
  @Input() emptyMessage = 'No files have been attached to this claim.';

  viewing: ClaimAttachment | null = null;

  assetUrl(attachment: ClaimAttachment): string | null {
    return this.config.resolveAssetUrl(attachment.url);
  }

  fileName(attachment: ClaimAttachment): string {
    return attachment.originalFilename || attachment.url.split('/').pop() || 'attachment';
  }

  viewImage(attachment: ClaimAttachment): void {
    if (!attachment.isImage || !this.assetUrl(attachment)) {
      return;
    }
    this.viewing = attachment;
  }

  closeViewer(): void {
    this.viewing = null;
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
