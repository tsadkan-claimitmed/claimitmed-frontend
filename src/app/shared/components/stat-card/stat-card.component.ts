import { Component, Input } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss',
})
export class StatCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() icon = '📊';
  @Input() accent: 'primary' | 'success' | 'warning' | 'info' = 'primary';
  @Input() isCurrency = false;
}
