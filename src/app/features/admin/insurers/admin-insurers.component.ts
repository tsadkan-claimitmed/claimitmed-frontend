import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { ConfigService } from '../../../core/services/config.service';
import {
  AdminEntityCrudComponent,
  CrudColumn,
  CrudField,
} from '../../../shared/components/admin-entity-crud/admin-entity-crud.component';
import {
  ORG_CONTACT_CRUD_FIELDS,
} from '../../../shared/constants/org-contact-fields';
import { Insurer } from '../../../core/models';

@Component({
  selector: 'app-admin-insurers',
  standalone: true,
  imports: [AdminEntityCrudComponent],
  templateUrl: './admin-insurers.component.html',
  styleUrl: './admin-insurers.component.scss',
})
export class AdminInsurersComponent implements OnInit, OnDestroy {
  private readonly api = inject(AdminApiService);
  private readonly config = inject(ConfigService);

  items: Insurer[] = [];
  loading = true;
  saving = false;
  uploadingLogo = false;
  errorMessage = '';
  savedSuccessfully = 0;
  selectedInsurer: Insurer | null = null;
  pendingLogoFile: File | null = null;
  pendingLogoPreviewUrl: string | null = null;

  readonly columns: CrudColumn[] = [
    { key: 'companyCode', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'city', label: 'City' },
    { key: 'status', label: 'Status' },
  ];

  readonly fields: CrudField[] = [
    { key: 'companyCode', label: 'Company Code', required: true, placeholder: 'e.g. ABC-INS', readonlyOnEdit: true },
    { key: 'name', label: 'Company Name', required: true, placeholder: 'ABC Insurance' },
    ...ORG_CONTACT_CRUD_FIELDS,
  ];

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.clearPendingLogo();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getInsurers().subscribe({
      next: (items) => {
        this.items = items;
        if (this.selectedInsurer) {
          this.selectedInsurer = items.find((row) => row.id === this.selectedInsurer!.id) ?? null;
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to load insurers.';
        this.loading = false;
      },
    });
  }

  logoUrl(insurer: Insurer | null): string | null {
    return this.config.resolveAssetUrl(insurer?.logoUrl);
  }

  onCreate(body: Record<string, unknown>): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.createInsurer(body as never).subscribe({
      next: (created) => {
        const file = this.pendingLogoFile;
        this.clearPendingLogo();
        if (!file) {
          this.saving = false;
          this.savedSuccessfully++;
          this.load();
          return;
        }
        this.api.uploadInsurerLogo(created.id, file).subscribe({
          next: () => {
            this.saving = false;
            this.savedSuccessfully++;
            this.load();
          },
          error: (err) => {
            this.errorMessage = err.userMessage ?? 'Insurer created, but logo upload failed.';
            this.saving = false;
            this.savedSuccessfully++;
            this.load();
          },
        });
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to create insurer.';
        this.saving = false;
      },
    });
  }

  onUpdate(event: { id: string; body: Record<string, unknown> }): void {
    this.saving = true;
    this.errorMessage = '';
    this.api.updateInsurer(event.id, event.body as never).subscribe({
      next: () => {
        this.saving = false;
        this.savedSuccessfully++;
        this.load();
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to update insurer.';
        this.saving = false;
      },
    });
  }

  onToggleStatus(item: unknown): void {
    const insurer = item as Insurer;
    const action = insurer.status === 'ACTIVE'
      ? this.api.deactivateInsurer(insurer.id)
      : this.api.activateInsurer(insurer.id);

    action.subscribe({
      next: (updated) => {
        const index = this.items.findIndex((row) => row.id === updated.id);
        if (index >= 0) this.items[index] = updated;
        this.selectedInsurer = updated;
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to update insurer status.';
      },
    });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!this.selectedInsurer) {
      this.setPendingLogo(file);
      input.value = '';
      return;
    }

    this.uploadingLogo = true;
    this.errorMessage = '';
    this.api.uploadInsurerLogo(this.selectedInsurer.id, file).subscribe({
      next: (updated) => {
        this.uploadingLogo = false;
        const index = this.items.findIndex((row) => row.id === updated.id);
        if (index >= 0) this.items[index] = updated;
        this.selectedInsurer = updated;
        input.value = '';
      },
      error: (err) => {
        this.errorMessage = err.userMessage ?? 'Failed to upload logo.';
        this.uploadingLogo = false;
        input.value = '';
      },
    });
  }

  previewLogoUrl(): string | null {
    return this.pendingLogoPreviewUrl ?? this.logoUrl(this.selectedInsurer);
  }

  private setPendingLogo(file: File): void {
    this.clearPendingLogo();
    this.pendingLogoFile = file;
    this.pendingLogoPreviewUrl = URL.createObjectURL(file);
  }

  private clearPendingLogo(): void {
    if (this.pendingLogoPreviewUrl) {
      URL.revokeObjectURL(this.pendingLogoPreviewUrl);
    }
    this.pendingLogoFile = null;
    this.pendingLogoPreviewUrl = null;
  }

  onSelectedItemChange(item: unknown): void {
    this.selectedInsurer = (item as Insurer | null) ?? null;
    this.clearPendingLogo();
  }
}
