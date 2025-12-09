import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { User } from '../../../shared/models/user';
import { ProfileService } from '../services/profile.service';

@Injectable({
    providedIn: 'root'
})
export class ProfileResolve implements Resolve<User> {

    constructor(private profileService: ProfileService) { }

    resolve(route: ActivatedRouteSnapshot) {
        console.log(this.profileService.getById(route.params['id']))
        return this.profileService.getById(route.params['id']);
    }
}