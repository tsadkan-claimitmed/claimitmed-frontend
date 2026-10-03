import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MemberApiService } from '../../../core/services/member-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import {
  MemberPolicyOverview,
  MemberCoveredService,
  MemberInNetworkProvider,
  CoveragePool,
} from '../../../core/models';
import { PolicyNetworkType } from '../../../core/models/enums';

type CoverageTab = 'overview' | 'services' | 'family' | 'providers';

@Component({
  selector: 'app-member-coverage',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './member-coverage.component.html',
  styleUrl: './member-coverage.component.scss',
})
export class MemberCoverageComponent implements OnInit {
  private readonly api = inject(MemberApiService);

  overview: MemberPolicyOverview | null = null;
  inNetworkProviders: MemberInNetworkProvider[] = [];
  loading = true;
  providersLoading = false;
  providersLoaded = false;
  providersError = '';
  activeTab: CoverageTab = 'overview';

  readonly baseTabs: { id: Exclude<CoverageTab, 'providers'>; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'services', label: 'Benefits & Services' },
    { id: 'family', label: 'Family' },
  ];

  ngOnInit(): void {
    this.api.getPolicyOverview().subscribe({
      next: (overview) => {
        this.overview = overview;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get tabs(): { id: CoverageTab; label: string }[] {
    const tabs: { id: CoverageTab; label: string }[] = [...this.baseTabs];
    if (this.showInNetworkProvidersTab) {
      tabs.push({ id: 'providers', label: 'In-Network Providers' });
    }
    return tabs;
  }

  get showInNetworkProvidersTab(): boolean {
    const networkType = this.overview?.policy.networkType ?? PolicyNetworkType.IN_NETWORK;
    return networkType !== PolicyNetworkType.OUT_OF_NETWORK;
  }

  setTab(tab: CoverageTab): void {
    this.activeTab = tab;
    if (tab === 'providers' && !this.providersLoaded && !this.providersLoading) {
      this.loadInNetworkProviders();
    }
  }

  loadInNetworkProviders(): void {
    this.providersLoading = true;
    this.providersError = '';
    this.api.getInNetworkProviders().subscribe({
      next: (providers) => {
        this.inNetworkProviders = providers;
        this.providersLoading = false;
        this.providersLoaded = true;
      },
      error: () => {
        this.providersError = 'Unable to load in-network providers.';
        this.providersLoading = false;
        this.providersLoaded = true;
      },
    });
  }

  usagePercent(pool: CoveragePool): number {
    const limit = this.toNumber(pool.annualLimit);
    const consumed = this.toNumber(pool.consumedAmount);
    if (limit === 0) return 0;
    return Math.min(100, Math.round((consumed / limit) * 100));
  }

  toNumber(value: number | string): number {
    return typeof value === 'number' ? value : parseFloat(value) || 0;
  }

  formatRelationship(value: string | undefined): string {
    if (!value) return '—';
    return value.charAt(0) + value.slice(1).toLowerCase().replace('_', ' ');
  }

  formatLimitModel(model: string): string {
    if (model === 'POLICY_WALLET') return 'Shared policy wallet';
    if (model === 'PER_BENEFIT') return 'Per benefit limits';
    return model.replace(/_/g, ' ').toLowerCase();
  }

  formatNetworkType(value: string | undefined): string {
    switch (value) {
      case PolicyNetworkType.IN_NETWORK:
        return 'In-network';
      case PolicyNetworkType.OUT_OF_NETWORK:
        return 'Out-of-network';
      case PolicyNetworkType.IN_AND_OUT_OF_NETWORK:
        return 'In-network & out-of-network';
      default:
        return value?.replace(/_/g, ' ') ?? '—';
    }
  }

  coverageExpired(): boolean {
    const status = this.overview?.member.status;
    return status === 'TERMINATED' || status === 'INACTIVE';
  }

  coverageStatusLabel(): string {
    return this.coverageExpired() ? 'EXPIRED' : (this.overview?.policy.status ?? '—');
  }

  memberStatusLabel(status?: string): string {
    if (status === 'TERMINATED' || status === 'INACTIVE') return 'EXPIRED';
    return status || '—';
  }

  isInNetworkPolicy(): boolean {
    const networkType = this.overview?.policy.networkType ?? PolicyNetworkType.IN_NETWORK;
    return networkType === PolicyNetworkType.IN_NETWORK
      || networkType === PolicyNetworkType.IN_AND_OUT_OF_NETWORK;
  }

  memberName(member: { firstName?: string | null; lastName?: string | null; memberNumber: string }): string {
    const name = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
    return name || member.memberNumber;
  }

  providerName(provider: MemberInNetworkProvider): string {
    return provider.providerName?.trim() || provider.providerCode;
  }

  providerAddress(provider: MemberInNetworkProvider): string {
    const parts = [provider.streetAddress, provider.city, provider.state].filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  }

  formatProviderType(value: string | null): string {
    if (!value) return '—';
    return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }

  servicesByBenefit(): { benefit: string; services: MemberCoveredService[] }[] {
    if (!this.overview) return [];
    const groups = new Map<string, MemberCoveredService[]>();
    for (const service of this.overview.coveredServices) {
      const key = service.benefitName ?? 'General coverage';
      const list = groups.get(key) ?? [];
      list.push(service);
      groups.set(key, list);
    }
    return [...groups.entries()]
      .map(([benefit, services]) => ({ benefit, services }))
      .sort((a, b) => a.benefit.localeCompare(b.benefit));
  }
}
