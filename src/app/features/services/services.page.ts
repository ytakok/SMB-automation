import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-services-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './services.page.html',
  styleUrl: './services.page.less',
})
export class ServicesPage {
  protected readonly services = [0, 1, 2, 3];
}
