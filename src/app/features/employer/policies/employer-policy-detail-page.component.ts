import { Component } from '@angular/core';
import { PolicyDetailComponent } from '../../../shared/features/policies/policy-detail.component';

@Component({
  selector: 'app-employer-policy-detail-page',
  standalone: true,
  imports: [PolicyDetailComponent],
  template: `<app-policy-detail portal="employer" />`,
})
export class EmployerPolicyDetailPageComponent {}
