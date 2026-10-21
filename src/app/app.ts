import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { RouterOutlet } from '@angular/router';
import { catchError, map, of } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.less'
})
export class App {
  protected readonly title = signal('SMB-automation');

  // Calls the n8n workflow behind https://<site>/webhook/hello (routed by Caddy to n8n)
  protected readonly n8nMessage = toSignal(
    inject(HttpClient).get<{ message: string }>('/webhook/hello').pipe(
      map(res => res.message),
      catchError(() => of('n8n is not reachable yet'))
    ),
    { initialValue: 'Asking n8n…' }
  );
}
