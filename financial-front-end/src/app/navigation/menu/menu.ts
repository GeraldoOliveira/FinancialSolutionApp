import { Component } from '@angular/core';
import { Home } from '../home/home';
import { NgbCollapse } from "@ng-bootstrap/ng-bootstrap";
import { LocalStorageUtils } from '../../utils/localstorage';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu',
  imports: [NgbCollapse],
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
  email: string = "";
  LocalStorageUtils = new LocalStorageUtils();

  userLogged(): boolean {

    this.token = this.LocalStorageUtils.getUserToken();
    this.user = this.LocalStorageUtils.getUser();

    if(this.user)
      this.email = this.user.email;
    return this.token !== null && this.token !== '';
  }

  logout() {
    this.LocalStorageUtils.clearLocalUser();
    this.router.navigate(['/home']);
  }
}
