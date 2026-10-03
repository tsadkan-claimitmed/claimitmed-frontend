import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

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
    loginId: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly demoAccounts = [
    { role: 'Member', loginId: '+251911000003', icon: '👤' },
    { role: 'Provider', loginId: '+251911000004', icon: '🏥' },
    { role: 'Insurer', loginId: 'admin@abc.com', icon: '🛡️' },
    { role: 'Claim Officer', loginId: 'officer@platform.com', icon: '📋' },
    { role: 'Admin', loginId: 'admin@platform.com', icon: '⚙️' },
    { role: 'Employer', loginId: 'hr@techco.com', icon: '🏢' },
  ];

  fillDemo(loginId: string): void {
    this.form.patchValue({ loginId, password: 'password' });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { loginId, password } = this.form.getRawValue();
    this.auth.login({ loginId: loginId!, password: password! }).subscribe({
      next: () => {
        this.loading = false;
        if (this.auth.mustChangePassword) {
          this.router.navigate(['/change-password']);
        } else {
          this.router.navigate(['/portal']);
        }
      },
      error: (err: { userMessage?: string }) => {
        this.loading = false;
        this.errorMessage = err.userMessage ?? 'Invalid phone, email, or password. Please try again.';
      },
    });
  }
}
