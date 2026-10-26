import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { TenantService } from '../../core/tenant/tenant.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, NgOptimizedImage],
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  protected readonly tenant = inject(TenantService);
  protected readonly i18n = inject(I18nService);
  protected readonly menuOpen = signal(false);
  protected readonly announcement = signal('');

  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly main = viewChild<ElementRef<HTMLElement>>('main');
  private readonly menuToggle = viewChild<ElementRef<HTMLButtonElement>>('menuToggle');

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.menuOpen.set(false);
        if (this.browser) {
          queueMicrotask(() => {
            this.main()?.nativeElement.focus();
            this.announcement.set(document.title);
          });
        }
      });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected languageLink(code: string): string[] {
    const path = this.router.url.split(/[?#]/, 1)[0].split('/').filter(Boolean).slice(1);
    return ['/', code, ...path];
  }

  @HostListener('document:keydown.escape')
  protected closeMenuOnEscape(): void {
    if (this.menuOpen()) {
      this.closeMenu();
      this.menuToggle()?.nativeElement.focus();
    }
  }
}
