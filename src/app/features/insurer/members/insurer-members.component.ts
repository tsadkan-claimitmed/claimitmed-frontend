import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { InsurerApiService } from '../../../core/services/insurer-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { Member } from '../../../core/models';

@Component({
  selector: 'app-insurer-members',
  standalone: true,
  imports: [CommonModule, DatePipe, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './insurer-members.component.html',
})
export class InsurerMembersComponent implements OnInit {
  private readonly api = inject(InsurerApiService);

  members: Member[] = [];
  loading = true;

  ngOnInit(): void {
    this.api.getMembers().subscribe({
      next: (res) => { this.members = res.data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
