import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnackbarMessage, SnackbarService } from '../../../core/services/snackbar.service';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="snackbar-container" aria-live="polite" aria-relevant="additions">
      @for (message of messages; track message.id) {
        <div class="snackbar snackbar-{{ message.type }}" role="status">
          <span class="snackbar-icon" aria-hidden="true">
            @if (message.type === 'success') { ✓ }
            @else if (message.type === 'error') { ✕ }
            @else { ℹ }
          </span>
          <span class="snackbar-text">{{ message.message }}</span>
          <button
            type="button"
            class="snackbar-close"
            (click)="dismiss(message.id)"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './snackbar.component.scss',
})
export class SnackbarComponent {
  private readonly snackbar = inject(SnackbarService);

  messages: SnackbarMessage[] = [];

  constructor() {
    this.snackbar.messages$.subscribe((messages) => {
      this.messages = messages;
    });
  }

  dismiss(id: number): void {
    this.snackbar.dismiss(id);
  }
}
