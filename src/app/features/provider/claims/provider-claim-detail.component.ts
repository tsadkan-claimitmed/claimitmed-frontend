import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ProviderApiService } from '../../../core/services/provider-api.service';
import { ClaimDetail } from '../../../core/models';
import { ClaimStatus } from '../../../core/models/enums';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ClaimWorkspaceComponent } from '../../../shared/components/claim-workspace/claim-workspace.component';

@Component({
  selector: 'app-provider-claim-detail',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent, EmptyStateComponent, ClaimWorkspaceComponent],
  template: `
    @if (loading) {
      <app-loading-spinner message="Loading claim details..." />
    } @else if (errorMessage && !claim) {
      <app-empty-state icon="⚠️" title="Unable to load claim" [message]="errorMessage" />
    } @else if (claim) {
      <app-claim-workspace
        [claim]="claim"
        backLink="/portal/provider/claims"
        [visitLink]="'/portal/provider/treatments/' + claim.treatmentCaseId"
        preauthBasePath="/portal/provider/preauth"
        [canResubmit]="claim.status === ClaimStatus.NEED_INFO"
        [actionLoading]="resubmitting"
        [errorMessage]="errorMessage"
        [successMessage]="successMessage"
        [selectedFiles]="selectedFiles"
        [resubmitComments]="resubmitComments"
        (filesSelected)="onFilesSelected($event)"
        (removeSelectedFile)="removeSelectedFile($event)"
        (resubmitCommentsChange)="resubmitComments = $event"
        (resubmit)="resubmitClaim()"
      />
    }
  `,
})
export class ProviderClaimDetailComponent implements OnInit {
  private readonly api = inject(ProviderApiService);
  private readonly route = inject(ActivatedRoute);

  readonly ClaimStatus = ClaimStatus;

  claim: ClaimDetail | null = null;
  loading = true;
  errorMessage = '';
  successMessage = '';
  resubmitComments = '';
  selectedFiles: File[] = [];
  resubmitting = false;

  ngOnInit(): void {
    const claimId = this.route.snapshot.paramMap.get('id');
    if (!claimId) {
      this.errorMessage = 'Claim ID is missing.';
      this.loading = false;
      return;
    }
    this.loadClaim(claimId);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const incoming = Array.from(input.files ?? []);
    input.value = '';
    const next = [...this.selectedFiles];
    for (const file of incoming) {
      if (file.size > 10 * 1024 * 1024) {
        this.errorMessage = `${file.name} is larger than 10 MB.`;
        continue;
      }
      if (next.length >= 10) {
        this.errorMessage = 'You can attach up to 10 files.';
        break;
      }
      next.push(file);
    }
    this.selectedFiles = next;
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

  resubmitClaim(): void {
    if (!this.claim || this.resubmitting) return;
    const claimId = this.claim.id;
    this.resubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.api.resubmitClaim(claimId, { files: this.selectedFiles, comments: this.resubmitComments }).subscribe({
      next: () => {
        this.selectedFiles = [];
        this.resubmitComments = '';
        this.successMessage = 'Claim sent back for review.';
        this.loadClaim(claimId);
        this.resubmitting = false;
      },
      error: (err) => {
        this.resubmitting = false;
        this.errorMessage = err.userMessage ?? 'Failed to resubmit claim.';
      },
    });
  }

  private loadClaim(claimId: string): void {
    this.api.getClaim(claimId).subscribe({
      next: (claim) => {
        this.claim = claim;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'This claim could not be found or you do not have access.';
        this.loading = false;
      },
    });
  }
}
