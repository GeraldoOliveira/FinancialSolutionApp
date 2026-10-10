import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '../../../../shared/models/user';
import { LocalStorageUtils } from '../../../../shared/utils/local-storage';

@Component({
  selector: 'app-profile-user',
  imports: [],
  templateUrl: './profile-user.html',
  styleUrl: './profile-user.css'
})
export class ProfileUser {

  user: any;

  constructor(private route: ActivatedRoute,
    private router: Router
  ) {
    this.user = this.route.snapshot.data['user'];
  }

  ngOnInit() {
    const local = new LocalStorageUtils().getUser();
    if (local && (!this.user || String(local.id) === String(this.user?.id))) {
      this.user = { ...this.user, ...local };
    }
  }

  editProfile() {
    this.router.navigate(['/profile/edit/', this.user.id]);
  }
}