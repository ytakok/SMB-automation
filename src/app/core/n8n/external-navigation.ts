import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

/** Leaves the site (e.g. to a sign-in page). A service so tests can replace it. */
@Injectable({ providedIn: 'root' })
export class ExternalNavigation {
  private readonly document = inject(DOCUMENT);

  go(url: string): void {
    this.document.location.assign(url);
  }
}
