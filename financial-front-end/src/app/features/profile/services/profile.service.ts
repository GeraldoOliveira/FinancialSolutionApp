import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';

import { BaseService } from '../../../core/services/base.service';
import { User } from '../../../shared/models/user';
import { LocalStorageUtils } from '../../../shared/utils/local-storage';

@Injectable({
  providedIn: 'root',
})
export class ProfileService extends BaseService {
  constructor(private http: HttpClient) {
    super();
  }

  getById(id: string): Observable<User> {
    return this.http.get<User>(this.UrlServiceV1 + 'user/' + id).pipe(
      map((user) => {
        const localUser = new LocalStorageUtils().getUser();
        if (localUser && (String(localUser.id) === String(id) || !user)) {
          return { ...user, ...localUser };
        }
        return user;
      }),
      catchError(() => {
        const localUser = new LocalStorageUtils().getUser();
        if (localUser) return of(localUser);
        return of({
          id: Number(id) || 1,
          name: 'Geraldo Oliveira',
          email: 'gevo.neto@hotmail.com',
        } as User);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  registerProfile(userTransaction: User): Observable<User> {
    let response = this.http
      .post(
        this.UrlServiceV1 + 'profile',
        userTransaction,
        this.GetAuthHeaderJson(),
      )
      .pipe(map(this.ExtractData), catchError(this.ServiceError));

    return response;
  }

  updateProfile(userTransaction: User): Observable<User> {
    let response = this.http
      .put<any>(
        this.UrlServiceV1 + 'profile/',
        userTransaction,
        this.GetAuthHeaderJson(),
      )
      .pipe(map(this.ExtractData), catchError(this.ServiceError));

    return response;
  }

  deleteProfile(id: string): Observable<User> {
    let response = this.http
      .delete<any>(
        this.UrlServiceV1 + 'profile/' + id,
        this.GetAuthHeaderJson(),
      )
      .pipe(map(this.ExtractData), catchError(this.ServiceError));

    return response;
  }
}
