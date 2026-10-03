import { Component } from '@angular/core';
import { PolicyDetailComponent } from '../../../shared/features/policies/policy-detail.component';

@Component({
  selector: 'app-insurer-policy-detail-page',
  standalone: true,
  imports: [PolicyDetailComponent],
  template: `<app-policy-detail portal="insurer" />`,
})
export class InsurerPolicyDetailPageComponent {}
