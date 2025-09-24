import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { User } from './../models/user';

@Injectable({
      providedIn: 'root'
    })
export class AccountService {
    // constructor(private http: HttpClient) {}
    constructor() {}
    registerUser(user: User){
        
    }

    loginUser(user: User){

    }
}