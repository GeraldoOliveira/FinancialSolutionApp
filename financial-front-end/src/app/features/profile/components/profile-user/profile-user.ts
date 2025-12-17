import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '../../../../shared/models/user';

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

  }

  editProfile() {
    this.router.navigate(['/profile/edit/', this.user.id]);
  }
}