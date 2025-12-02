import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface TabItem {
  label: string;
  route: string; // Ou id, se for navegação interna
}

@Component({
  selector: 'app-tab-navigation',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './tab-navigation.html',
  styleUrl: './tab-navigation.css'
})
export class TabNavigation {

  @Input() tabs: TabItem[] = [];

  @Input() activeRoute: string = '';

  @Output() tabSelected = new EventEmitter<string>();

  selectTab(route: string): void {
    this.tabSelected.emit(route);
  }

  isTabActive(route: string): boolean {
    return this.activeRoute === route;
  }
}
