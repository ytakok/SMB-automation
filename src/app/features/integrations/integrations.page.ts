import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { ErrorLogService } from '../../core/logging/error-log.service';
import {
  CONNECTION_PROVIDERS,
  ConnectionProvider,
  ConnectionProviderId,
} from '../../core/n8n/connection-providers';
import { ExternalNavigation } from '../../core/n8n/external-navigation';
import {
  ConnectionResult,
  INVITE_CODE_PATTERN,
  N8nConnectionsService,
} from '../../core/n8n/n8n-connections.service';
import { N8nError, N8nErrorKind } from '../../core/n8n/n8n-webhook.client';

type StartState =
  | { status: 'idle' }
  | { status: 'starting'; provider: ConnectionProviderId }
  | { status: 'error'; provider: ConnectionProviderId; kind: N8nErrorKind };

/**
 * One-click account connections (the recommended way): the customer signs in with Google or
 * Microsoft and approves access; n8n stores the tokens. No keys are created, copied or sent.
 * The agency sends customers a link with their invite code: /<lang>/integrations?code=ABC-123
 */
@Component({
  selector: 'app-integrations-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './integrations.page.html',
  styleUrl: './integrations.page.less',
})
export class IntegrationsPage {
  protected readonly i18n = inject(I18nService);
  private readonly connections = inject(N8nConnectionsService);
  private readonly navigation = inject(ExternalNavigation);
  private readonly logger = inject(ErrorLogService);
  private readonly injector = inject(Injector);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly providers = CONNECTION_PROVIDERS;
  protected readonly howSteps = [0, 1, 2];
  protected readonly result = signal<ConnectionResult | null>(
    this.connections.readResult(this.params),
  );
  protected readonly state = signal<StartState>({ status: 'idle' });
  protected readonly codeTouched = signal(false);

  protected readonly inviteCode = inject(NonNullableFormBuilder).control(
    this.params.get('code')?.trim() ?? '',
    [Validators.required, Validators.pattern(INVITE_CODE_PATTERN)],
  );

  private readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');
  private readonly resultHeading = viewChild<ElementRef<HTMLElement>>('resultHeading');

  constructor() {
    if (this.result()) {
      afterNextRender(() => this.resultHeading()?.nativeElement.focus());
    }
  }

  protected codeInvalid(): boolean {
    return this.codeTouched() && this.inviteCode.invalid;
  }

  protected codeErrorKey(): string {
    return this.inviteCode.hasError('required')
      ? 'integrations.code.errors.required'
      : 'integrations.code.errors.pattern';
  }

  protected accessIndexes(provider: ConnectionProvider): number[] {
    return Array.from({ length: provider.accessCount }, (_, index) => index);
  }

  protected isStarting(provider: ConnectionProvider): boolean {
    const state = this.state();
    return state.status === 'starting' && state.provider === provider.id;
  }

  protected errorFor(provider: ConnectionProvider): N8nErrorKind | null {
    const state = this.state();
    return state.status === 'error' && state.provider === provider.id ? state.kind : null;
  }

  protected async connect(provider: ConnectionProvider): Promise<void> {
    if (this.state().status === 'starting') {
      return;
    }
    this.codeTouched.set(true);
    if (this.inviteCode.invalid) {
      this.focusLater(() => this.codeInput()?.nativeElement);
      return;
    }

    this.result.set(null);
    this.state.set({ status: 'starting', provider: provider.id });
    try {
      const authUrl = await this.connections.start(provider, this.inviteCode.value);
      this.navigation.go(authUrl);
    } catch (error) {
      const kind = error instanceof N8nError ? error.kind : 'network';
      if (kind !== 'rejected') {
        void this.logger.log(error, { source: 'manual', extra: { feature: 'integrations', kind } });
      }
      this.state.set({ status: 'error', provider: provider.id, kind });
    }
  }

  private focusLater(target: () => HTMLElement | undefined): void {
    afterNextRender(() => target()?.focus(), { injector: this.injector });
  }
}
