import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DebouncedSearchService {
  createDebouncedHandler(
    onSearch: (query: string) => void,
    debounceMs = 300,
  ): { update: (query: string) => void; clear: () => void; destroy: () => void } {
    const subject = new Subject<string>();
    const subscription = subject
      .pipe(debounceTime(debounceMs), distinctUntilChanged())
      .subscribe(onSearch);

    return {
      update: (query: string) => subject.next(query),
      clear: () => onSearch(''),
      destroy: () => subscription.unsubscribe(),
    };
  }
}
