import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type SnackbarType = 'success' | 'error' | 'info';

export interface SnackbarMessage {
  id: number;
  type: SnackbarType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  private readonly messagesSubject = new BehaviorSubject<SnackbarMessage[]>([]);
  private nextId = 0;

  readonly messages$ = this.messagesSubject.asObservable();

  show(message: string, type: SnackbarType = 'info', durationMs = 5000): void {
    const id = ++this.nextId;
    this.messagesSubject.next([...this.messagesSubject.value, { id, type, message }]);
    window.setTimeout(() => this.dismiss(id), durationMs);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error', 7000);
  }

  dismiss(id: number): void {
    this.messagesSubject.next(this.messagesSubject.value.filter((entry) => entry.id !== id));
  }
}
