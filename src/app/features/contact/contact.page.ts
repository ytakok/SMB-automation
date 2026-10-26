import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TenantService } from '../../core/tenant/tenant.service';

@Component({
  selector: 'app-contact-page',
  imports: [TranslatePipe],
  templateUrl: './contact.page.html',
  styleUrl: './contact.page.less',
})
export class ContactPage {
  protected readonly tenant = inject(TenantService);
}
