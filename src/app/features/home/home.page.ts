import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ChatbotWidgetComponent } from '../chatbot/chatbot-widget.component';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, TranslatePipe, ChatbotWidgetComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.less',
})
export class HomePage {
  protected readonly services = ['workflow', 'integration', 'ai'];
}
