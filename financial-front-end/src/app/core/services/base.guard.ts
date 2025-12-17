import { ActivatedRouteSnapshot, Router } from "@angular/router";
import { LocalStorageUtils } from "../../shared/utils/local-storage";
import { inject } from "@angular/core";




function accessDeniedNavigate(router: Router) {
    router.navigate(['/access-denied']);
    return false;
}

export function validateClaims(route: ActivatedRouteSnapshot): boolean {
    const router = inject(Router);
    const localStorage = new LocalStorageUtils();

    if (!localStorage.getUserToken()) {
        router.navigate(['/login']);
        return false;
    }

    let userClaimsStorage: any = localStorage.getUserClaims();
    let claim: any = route.data[0]

    if (claim !== undefined) {
        if (claim) {
            if (!userClaimsStorage) {
                return accessDeniedNavigate(router);
            }

            let userClaims = userClaimsStorage.find(x => x.type === claim.claim.type);
            if (!userClaims) {
                return accessDeniedNavigate(router);
            }

            let claimsValues = userClaims.value.split(',');
            if (!claimsValues.includes(claim.claim.value)) {
                return accessDeniedNavigate(router);
            }

        }
        return true;
    } else {
        return false;
    };

}

export function validateToken(): boolean {

    const router = inject(Router);
    const localStorage = new LocalStorageUtils();

    if (!localStorage.getUserToken()) {
        router.navigate(['/login']);
        return false;
    }

    return true;
}