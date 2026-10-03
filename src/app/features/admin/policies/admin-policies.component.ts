import { Component } from '@angular/core';
import { PolicyListComponent } from '../../../shared/features/policies/policy-list.component';

@Component({
  selector: 'app-admin-policies',
  standalone: true,
  imports: [PolicyListComponent],
  template: `
    <app-policy-list
      portal="admin"
      pageTitle="All Policies"
      subtitle="Browse policies across all insurers"
    />
  `,
})
export class AdminPoliciesComponent {}
