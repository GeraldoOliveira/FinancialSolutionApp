import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { User } from '../../../shared/models/user';
import { catchError, map, Observable } from "rxjs";
import { BaseService } from "../../../core/services/base.service";
import { Register } from "../register/register";

@Injectable({
    providedIn: Register
})
export class RegisterService extends BaseService {

    constructor(private http: HttpClient) { super(); }

    registerUser(user: User): Observable<User> {
        let response = this.http
            .post(this.UrlServiceV1 + 'new-user', user, this.GetHeadersJson())
            .pipe(
                map(this.ExtractData),
                catchError(this.ServiceError)
            );

        return response;
    }

}  