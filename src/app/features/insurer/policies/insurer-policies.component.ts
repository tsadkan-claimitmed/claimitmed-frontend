import { Component } from '@angular/core';
import { PolicyListComponent } from '../../../shared/features/policies/policy-list.component';

@Component({
  selector: 'app-insurer-policies',
  standalone: true,
  imports: [PolicyListComponent],
  template: `
    <app-policy-list
      portal="insurer"
      pageTitle="Policies"
      subtitle="Insurance policies under your company"
    />
  `,
})
export class InsurerPoliciesComponent {}
