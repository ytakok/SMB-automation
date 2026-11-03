import { Component, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ClipboardService } from './clipboard.service';
import { ConnectApp, ConnectField } from './connect-apps';

export interface ConnectValueChange {
  key: string;
  value: string;
}

type CopyState = 'idle' | 'copied' | 'failed';

/** One app on the /connect page: short steps, a direct link per step, paste fields inline. */
@Component({
  selector: 'app-connect-app-card',
  imports: [TranslatePipe],
  templateUrl: './connect-app-card.component.html',
  styleUrl: './connect-app-card.component.less',
})
export class ConnectAppCardComponent {
  private readonly clipboard = inject(ClipboardService);

  readonly app = input.required<ConnectApp>();
  readonly values = input<Partial<Record<string, string>>>({});
  readonly redirectUri = input('');
  readonly ready = input(false);
  readonly valueChange = output<ConnectValueChange>();

  protected readonly revealed = signal<ReadonlySet<string>>(new Set());
  protected readonly copyState = signal<CopyState>('idle');

  protected key(path: string): string {
    return `connect.apps.${this.app().id}.${path}`;
  }

  protected fieldId(field: ConnectField): string {
    return `connect-${this.app().id}-${field.key}`;
  }

  protected isRevealed(key: string): boolean {
    return this.revealed().has(key);
  }

  protected toggleReveal(key: string): void {
    const next = new Set(this.revealed());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.revealed.set(next);
  }

  protected onInput(key: string, event: Event): void {
    this.valueChange.emit({ key, value: (event.target as HTMLInputElement).value.trim() });
  }

  protected async copyRedirect(): Promise<void> {
    const copied = await this.clipboard.copy(this.redirectUri());
    this.copyState.set(copied ? 'copied' : 'failed');
  }
}
