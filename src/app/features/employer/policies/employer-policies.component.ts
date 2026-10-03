import { Component } from '@angular/core';
import { PolicyListComponent } from '../../../shared/features/policies/policy-list.component';

@Component({
  selector: 'app-employer-policies',
  standalone: true,
  imports: [PolicyListComponent],
  template: `
    <app-policy-list
      portal="employer"
      pageTitle="Our Policies"
      subtitle="View policies offered to your organization"
    />
  `,
})
export class EmployerPoliciesComponent {}
