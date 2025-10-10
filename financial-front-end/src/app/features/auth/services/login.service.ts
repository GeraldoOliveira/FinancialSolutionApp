import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { User } from '../../../shared/models/user';
import { catchError, map, Observable } from "rxjs";
import { BaseService } from "../../../core/services/base.service";
import { Login } from "../login/login";

@Injectable({
    providedIn: Login
})
export class LoginService extends BaseService {

    constructor(private http: HttpClient) { super(); }

    loginUser(user: User): Observable<User> {
        let response = this.http
            .post(this.UrlServiceV1 + 'login', user, this.GetHeadersJson())
            .pipe(
                map(this.ExtractData),
                catchError(this.ServiceError)
            );

        return response;
    }
}  