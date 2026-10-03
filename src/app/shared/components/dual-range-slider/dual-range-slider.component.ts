import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dual-range-slider',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dual-range-slider.component.html',
  styleUrl: './dual-range-slider.component.scss',
})
export class DualRangeSliderComponent {
  @Input({ required: true }) min!: number;
  @Input({ required: true }) max!: number;
  @Input() step = 100;
  @Input({ required: true }) low!: number;
  @Input({ required: true }) high!: number;
  @Input() disabled = false;

  @Output() lowChange = new EventEmitter<number>();
  @Output() highChange = new EventEmitter<number>();
  @Output() rangeChange = new EventEmitter<{ low: number; high: number }>();

  get rangeSpan(): number {
    return Math.max(this.max - this.min, 1);
  }

  get fillLeftPercent(): number {
    return ((this.low - this.min) / this.rangeSpan) * 100;
  }

  get fillWidthPercent(): number {
    return ((this.high - this.low) / this.rangeSpan) * 100;
  }

  onLowInput(rawValue: string | number): void {
    const parsed = Number(rawValue);
    const nextLow = this.clampLow(parsed);
    this.lowChange.emit(nextLow);
    this.rangeChange.emit({ low: nextLow, high: this.high });
  }

  onHighInput(rawValue: string | number): void {
    const parsed = Number(rawValue);
    const nextHigh = this.clampHigh(parsed);
    this.highChange.emit(nextHigh);
    this.rangeChange.emit({ low: this.low, high: nextHigh });
  }

  private clampLow(value: number): number {
    return Math.min(Math.max(value, this.min), this.high);
  }

  private clampHigh(value: number): number {
    return Math.max(Math.min(value, this.max), this.low);
  }
}
