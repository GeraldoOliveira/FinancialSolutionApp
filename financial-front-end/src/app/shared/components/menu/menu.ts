import { Component } from '@angular/core';
import { Dashboard } from '../../../features/dashboard/dashboard';
import { NgbCollapse } from "@ng-bootstrap/ng-bootstrap";
import { LocalStorageUtils } from '../../utils/localstorage';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-menu',
  imports: [NgbCollapse, RouterLink],
  templateUrl: './menu.html',
  styleUrl: './menu.css'
})
export class Menu {
  public isCollapsed: boolean;

  constructor(private router: Router) {
    this.isCollapsed = true;
  }

  token: string = "";
  user: any;
  LocalStorageUtils = new LocalStorageUtils();

  userLogged(): boolean {

    this.token = this.LocalStorageUtils.getUserToken();
    this.user = this.LocalStorageUtils.getUser();
    
    return this.token !== null && this.token !== '';

  }

  logout() {
    this.LocalStorageUtils.clearLocalUser();
  }

}
