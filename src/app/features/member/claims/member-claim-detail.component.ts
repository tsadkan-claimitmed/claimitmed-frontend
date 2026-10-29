import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MemberApiService } from '../../../core/services/member-api.service';
import { ClaimDetail } from '../../../core/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ClaimWorkspaceComponent } from '../../../shared/components/claim-workspace/claim-workspace.component';

@Component({
  selector: 'app-member-claim-detail',
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
        backLink="/portal/member/claims"
        backLabel="← Back to My Claims"
        [errorMessage]="errorMessage"
      />
    }
  `,
})
export class MemberClaimDetailComponent implements OnInit {
  private readonly api = inject(MemberApiService);
  private readonly route = inject(ActivatedRoute);

  claim: ClaimDetail | null = null;
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Claim ID is missing.';
      this.loading = false;
      return;
    }
    this.api.getClaim(id).subscribe({
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
