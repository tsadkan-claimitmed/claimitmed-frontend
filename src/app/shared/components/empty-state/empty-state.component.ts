import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state">
      <div class="empty-icon">{{ icon }}</div>
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      @if (actionLabel) {
        <ng-content select="[action]"></ng-content>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() icon = '📋';
  @Input({ required: true }) title!: string;
  @Input({ required: true }) message!: string;
  @Input() actionLabel = '';
}
