import {
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { PolicyApiService } from '../../../core/services/policy-api.service';
import { DebouncedSearchService } from '../../../core/services/debounced-search.service';
import { Employer } from '../../../core/models';

@Component({
  selector: 'app-employer-search-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EmployerSearchSelectComponent),
      multi: true,
    },
  ],
  templateUrl: './employer-search-select.component.html',
  styleUrl: './employer-search-select.component.scss',
})
export class EmployerSearchSelectComponent implements ControlValueAccessor, OnInit, OnDestroy {
  private readonly api = inject(PolicyApiService);
  private readonly debouncedSearch = inject(DebouncedSearchService);
  private readonly elementRef = inject(ElementRef);

  @Input() inputId = 'employer-search';
  @Input() placeholder = 'Search employer by name...';

  searchQuery = '';
  results: Employer[] = [];
  selectedEmployer: Employer | null = null;
  loading = false;
  open = false;
  disabled = false;

  private onChange: (value: string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private readonly searchHandler = this.debouncedSearch.createDebouncedHandler((query) => {
    this.fetchEmployers(query);
  });

  ngOnInit(): void {
    this.fetchEmployers('');
  }

  ngOnDestroy(): void {
    this.searchHandler.destroy();
  }

  writeValue(value: string | null): void {
    if (!value) {
      this.selectedEmployer = null;
      this.searchQuery = '';
      return;
    }

    if (this.selectedEmployer?.id === value) return;

    this.api.getEmployer(value).subscribe({
      next: (employer) => {
        this.selectedEmployer = employer;
        this.searchQuery = this.employerLabel(employer);
      },
      error: () => {
        this.selectedEmployer = null;
        this.searchQuery = '';
      },
    });
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.selectedEmployer = null;
    this.onChange(null);
    this.open = true;
    this.searchHandler.update(value);
  }

  onFocus(): void {
    this.open = true;
    this.onTouched();
    if (!this.results.length) {
      this.fetchEmployers(this.searchQuery);
    }
  }

  selectEmployer(employer: Employer): void {
    this.selectedEmployer = employer;
    this.searchQuery = this.employerLabel(employer);
    this.open = false;
    this.onChange(employer.id);
    this.onTouched();
  }

  clearSelection(): void {
    this.selectedEmployer = null;
    this.searchQuery = '';
    this.open = false;
    this.onChange(null);
    this.searchHandler.clear();
  }

  employerLabel(employer: Employer): string {
    return `${employer.name} (${employer.employerCode})`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.open = false;
    }
  }

  private fetchEmployers(query: string): void {
    this.loading = true;
    this.api.searchEmployers(query).subscribe({
      next: (employers) => {
        this.results = employers;
        this.loading = false;
      },
      error: () => {
        this.results = [];
        this.loading = false;
      },
    });
  }
}
