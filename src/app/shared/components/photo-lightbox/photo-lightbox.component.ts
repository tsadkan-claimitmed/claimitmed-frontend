import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-photo-lightbox',
  standalone: true,
  templateUrl: './photo-lightbox.component.html',
  styleUrl: './photo-lightbox.component.scss',
})
export class PhotoLightboxComponent {
  @Input() src: string | null = null;
  @Input() title = 'Photo';
  @Input() downloadName = 'photo.jpg';
  @Output() readonly closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.src) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  async download(): Promise<void> {
    if (!this.src) {
      return;
    }

    try {
      const response = await fetch(this.src, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Download failed');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = this.downloadName || 'photo.jpg';
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(this.src, '_blank', 'noopener');
    }
  }
}
