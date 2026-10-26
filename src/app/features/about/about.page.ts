import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-about-page',
  imports: [TranslatePipe],
  templateUrl: './about.page.html',
  styleUrl: './about.page.less',
})
export class AboutPage {
  protected readonly principles = [0, 1, 2];
}
