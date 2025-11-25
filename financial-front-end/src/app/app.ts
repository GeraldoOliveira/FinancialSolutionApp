import { Component, computed, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from './shared/components/footer/footer';
import { Menu } from './shared/components/menu/menu';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxBrazil } from 'ngx-brazil';

@Component({
  selector: 'app-root',
  imports: [
    Footer,
    Menu,
    RouterOutlet,
    NgbModule,
    NgxBrazil
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('financial-front-end');
  protected returnPage = false
}

