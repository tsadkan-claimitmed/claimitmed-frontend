import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { Insurer, Employer, Provider } from '../../../core/models';

@Component({
  selector: 'app-admin-organizations',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  templateUrl: './admin-organizations.component.html',
})
export class AdminOrganizationsComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  activeTab: 'insurers' | 'employers' | 'providers' = 'insurers';
  insurers: Insurer[] = [];
  employers: Employer[] = [];
  providers: Provider[] = [];
  loading = true;

  ngOnInit(): void { this.loadTab(); }

  setTab(tab: 'insurers' | 'employers' | 'providers'): void {
    this.activeTab = tab;
    this.loadTab();
  }

  private loadTab(): void {
    this.loading = true;
    if (this.activeTab === 'insurers') {
      this.api.getInsurers().subscribe({ next: (i) => { this.insurers = i; this.loading = false; }, error: () => { this.loading = false; } });
    } else if (this.activeTab === 'employers') {
      this.api.getEmployers().subscribe({ next: (e) => { this.employers = e; this.loading = false; }, error: () => { this.loading = false; } });
    } else {
      this.api.getProviders().subscribe({ next: (p) => { this.providers = p; this.loading = false; }, error: () => { this.loading = false; } });
    }
  }
}
