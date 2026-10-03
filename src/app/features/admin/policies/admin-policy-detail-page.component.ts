import { Component } from '@angular/core';
import { PolicyDetailComponent } from '../../../shared/features/policies/policy-detail.component';

@Component({
  selector: 'app-admin-policy-detail-page',
  standalone: true,
  imports: [PolicyDetailComponent],
  template: `<app-policy-detail portal="admin" />`,
})
export class AdminPolicyDetailPageComponent {}
