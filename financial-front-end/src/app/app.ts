import { Component, computed, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from './navigation/footer/footer';
import { Menu } from './navigation/menu/menu';

@Component({
  selector: 'app-root',
  imports: [
    Footer,
    Menu,
    RouterOutlet
],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('financial-front-end');
  protected returnPage = false
}
