import { Component } from '@angular/core';
import { Home } from '../home/home';
import { NgbCollapse } from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: 'app-menu',
  imports: [NgbCollapse],
  templateUrl: './menu.html',
  styleUrl: './menu.css'
})
export class Menu {
  public isCollapsed: boolean;

  constructor() {
    this.isCollapsed = true;
  }
}
