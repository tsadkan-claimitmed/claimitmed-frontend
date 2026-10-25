import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  HostListener,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { ProviderApiService } from '../../../core/services/provider-api.service';
import { DebouncedSearchService } from '../../../core/services/debounced-search.service';
import { MedicalService } from '../../../core/models';

@Component({
  selector: 'app-service-search-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ServiceSearchSelectComponent),
      multi: true,
    },
  ],
  templateUrl: './service-search-select.component.html',
  styleUrl: './service-search-select.component.scss',
})
export class ServiceSearchSelectComponent implements ControlValueAccessor, OnInit, OnChanges, OnDestroy {
  private readonly api = inject(ProviderApiService);
  private readonly debouncedSearch = inject(DebouncedSearchService);
  private readonly elementRef = inject(ElementRef);

  @Input() inputId = 'service-search';
  @Input() placeholder = 'Search by service name or code...';
  @Input() memberId: string | null = null;
  @Input() requiresPreauthOnly = false;
  @Input() excludePreauthRequired = false;

  @Output() serviceSelected = new EventEmitter<string>();

  searchQuery = '';
  results: MedicalService[] = [];
  selectedService: MedicalService | null = null;
  loading = false;
  open = false;
  disabled = false;

  private onChange: (value: string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private readonly searchHandler = this.debouncedSearch.createDebouncedHandler((query) => {
    this.fetchServices(query);
  });

  ngOnInit(): void {
    this.fetchServices('');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['memberId'] || changes['requiresPreauthOnly'] || changes['excludePreauthRequired']) {
      this.fetchServices(this.searchQuery);
    }
  }

  ngOnDestroy(): void {
    this.searchHandler.destroy();
  }

  writeValue(value: string | null): void {
    if (!value) {
      this.selectedService = null;
      this.searchQuery = '';
      return;
    }

    if (this.selectedService?.id === value) return;

    this.api.getMedicalService(value).subscribe({
      next: (service) => {
        this.selectedService = service;
        this.searchQuery = this.serviceLabel(service);
      },
      error: () => {
        this.selectedService = null;
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
    this.selectedService = null;
    this.onChange(null);
    this.open = true;
    this.searchHandler.update(value);
  }

  onFocus(): void {
    this.open = true;
    this.onTouched();
    if (!this.results.length) {
      this.fetchServices(this.searchQuery);
    }
  }

  selectService(service: MedicalService): void {
    this.selectedService = service;
    this.searchQuery = this.serviceLabel(service);
    this.open = false;
    this.onChange(service.id);
    this.onTouched();
    this.serviceSelected.emit(service.id);
  }

  clearSelection(): void {
    this.selectedService = null;
    this.searchQuery = '';
    this.open = false;
    this.onChange(null);
    this.searchHandler.clear();
  }

  serviceLabel(service: MedicalService): string {
    return `${service.serviceName} (${service.serviceCode})`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.open = false;
    }
  }

  private fetchServices(query: string): void {
    this.loading = true;
    const request = this.requiresPreauthOnly
      ? this.memberId
        ? this.api.searchPreauthServices(this.memberId, query)
        : null
      : this.excludePreauthRequired
        ? this.memberId
          ? this.api.searchCheckinServices(this.memberId, query)
          : null
        : this.api.searchMedicalServices(query);

    if (!request) {
      this.results = [];
      this.loading = false;
      return;
    }

    request.subscribe({
      next: (services) => {
        this.results = services;
        this.loading = false;
      },
      error: () => {
        this.results = [];
        this.loading = false;
      },
    });
  }
}
