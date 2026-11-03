import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TenantService } from '../../core/tenant/tenant.service';
import { ClipboardService } from './clipboard.service';
import { ConnectAppCardComponent, ConnectValueChange } from './connect-app-card.component';
import {
  buildConnectionSheet,
  CONNECT_APPS,
  ConnectApp,
  ConnectValues,
  DEFAULT_SELECTED_APPS,
  isAppReady,
  OAUTH_CALLBACK_PATH,
} from './connect-apps';

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Customer onboarding: collect the keys n8n needs for each app.
 * Privacy: values live only in signals in this tab. They are never saved, sent or logged.
 */
@Component({
  selector: 'app-connect-page',
  imports: [ConnectAppCardComponent, RouterLink, TranslatePipe],
  templateUrl: './connect.page.html',
  styleUrl: './connect.page.less',
})
export class ConnectPage {
  private readonly tenant = inject(TenantService);
  private readonly clipboard = inject(ClipboardService);
  protected readonly i18n = inject(I18nService);

  protected readonly apps = CONNECT_APPS;
  protected readonly howSteps = [0, 1, 2];
  protected readonly oneTimeSecretUrl = 'https://onetimesecret.com';

  protected readonly selected = signal<ReadonlySet<string>>(new Set(DEFAULT_SELECTED_APPS));
  protected readonly values = signal<ConnectValues>({});
  protected readonly sheetCopy = signal<CopyState>('idle');

  protected readonly selectedApps = computed(() =>
    this.apps.filter((app) => this.selected().has(app.id)),
  );
  protected readonly readyCount = computed(
    () => this.selectedApps().filter((app) => isAppReady(app, this.values())).length,
  );
  protected readonly redirectUri = computed(() => {
    const base = this.tenant.config().automation?.n8nBaseUrl ?? '';
    return base.replace(/\/+$/, '') + OAUTH_CALLBACK_PATH;
  });
  protected readonly sheet = computed(() =>
    buildConnectionSheet(
      this.selectedApps(),
      this.values(),
      this.tenant.config().name,
      this.redirectUri(),
    ),
  );

  protected valuesFor(appId: string): Record<string, string> {
    return this.values()[appId] ?? {};
  }

  protected isReady(app: ConnectApp): boolean {
    return isAppReady(app, this.values());
  }

  protected toggle(appId: string, event: Event): void {
    const next = new Set(this.selected());
    if ((event.target as HTMLInputElement).checked) {
      next.add(appId);
    } else {
      next.delete(appId);
    }
    this.selected.set(next);
    this.sheetCopy.set('idle');
  }

  protected setValue(appId: string, change: ConnectValueChange): void {
    this.values.update((all) => ({
      ...all,
      [appId]: { ...all[appId], [change.key]: change.value },
    }));
    this.sheetCopy.set('idle');
  }

  protected async copySheet(): Promise<void> {
    const copied = await this.clipboard.copy(this.sheet());
    this.sheetCopy.set(copied ? 'copied' : 'failed');
  }
}
