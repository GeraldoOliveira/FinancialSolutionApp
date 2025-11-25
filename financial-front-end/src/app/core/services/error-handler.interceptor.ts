import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from '@angular/core';
import { Router } from "@angular/router";

import { throwError } from "rxjs";
import { catchError } from "rxjs/operators";

import { LocalStorageUtils } from '../../shared/utils/local-storage';

const localStorageUtils = new LocalStorageUtils();

export const errorHandlerInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    return next(req).pipe(

        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                localStorageUtils.clearLocalUser();
                router.navigate(['/login']);
            }
            if (error.status === 403) {
                router.navigate(['/access-denied']);
            }
            return throwError(() => error);
        })
    );


}