import { Component, computed, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Home } from './navigation/home/home';
import { Footer } from './navigation/footer/footer';
import { Menu } from './navigation/menu/menu';
import { NotFound } from './navigation/not-found/not-found';

@Component({
  selector: 'app-root',
  imports: [
    Home,
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
