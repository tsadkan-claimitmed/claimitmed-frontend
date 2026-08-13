import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserType } from '../../../core/models/enums';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  loading = false;
  errorMessage = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly demoAccounts = [
    { role: 'Member', email: 'john.doe@email.com', icon: '👤' },
    { role: 'Provider', email: 'staff@stpaul.com', icon: '🏥' },
    { role: 'Insurer', email: 'admin@abc.com', icon: '🛡️' },
    { role: 'Admin', email: 'admin@platform.com', icon: '⚙️' },
    { role: 'Employer', email: 'hr@techco.com', icon: '🏢' },
  ];

  fillDemo(email: string): void {
    this.form.patchValue({ email, password: 'password' });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.form.getRawValue();
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/portal']);
      },
      error: (err: { userMessage?: string }) => {
        this.loading = false;
        this.errorMessage = err.userMessage ?? 'Invalid email or password. Please try again.';
      },
    });
  }
}
