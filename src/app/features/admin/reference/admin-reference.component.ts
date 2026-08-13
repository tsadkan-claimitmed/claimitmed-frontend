import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApiService } from '../../../core/services/admin-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { Benefit, MedicalService, Diagnosis } from '../../../core/models';

@Component({
  selector: 'app-admin-reference',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  templateUrl: './admin-reference.component.html',
})
export class AdminReferenceComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  activeTab: 'benefits' | 'services' | 'diagnoses' = 'benefits';
  benefits: Benefit[] = [];
  services: MedicalService[] = [];
  diagnoses: Diagnosis[] = [];
  loading = true;

  ngOnInit(): void {
    this.loadTab();
  }

  setTab(tab: 'benefits' | 'services' | 'diagnoses'): void {
    this.activeTab = tab;
    this.loadTab();
  }

  private loadTab(): void {
    this.loading = true;
    if (this.activeTab === 'benefits') {
      this.api.getBenefits().subscribe({ next: (b) => { this.benefits = b; this.loading = false; }, error: () => { this.loading = false; } });
    } else if (this.activeTab === 'services') {
      this.api.getMedicalServices().subscribe({ next: (s) => { this.services = s; this.loading = false; }, error: () => { this.loading = false; } });
    } else {
      this.api.getDiagnoses().subscribe({ next: (d) => { this.diagnoses = d; this.loading = false; }, error: () => { this.loading = false; } });
    }
  }
}
