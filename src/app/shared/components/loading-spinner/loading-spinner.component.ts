import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-container" [class.inline]="inline">
      <div class="spinner"></div>
      @if (message) {
        <p class="loading-message">{{ message }}</p>
      }
    </div>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      gap: 1rem;
    }
    .loading-container.inline {
      flex-direction: row;
      padding: 0.5rem;
    }
    .loading-message {
      margin: 0;
      color: #64748b;
      font-size: 0.875rem;
    }
  `],
})
export class LoadingSpinnerComponent {
  @Input() message = '';
  @Input() inline = false;
}
