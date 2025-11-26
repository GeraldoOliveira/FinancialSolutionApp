export class LocalStorageUtils {

    public saveLocalUser(response: any) {
        this.saveAccessToken(response.accessToken);
        this.saveUserToken(response.userToken);
        this.saveUser(response.user);
        this.saveClaims(response.claims);
    }

    public getUser() {
        return JSON.parse(localStorage.getItem('mfs.user') || '{}');
    }

    public saveUser(user: any) {
        return localStorage.setItem('mfs.user', JSON.stringify(user));
    }

    public getAccessToken() {
        return localStorage.getItem('mfs.accessToken');
    }

    public saveAccessToken(accessToken: string) {
        return localStorage.setItem('mfs.accessToken', accessToken);
    }

    public getUserToken() {
        return localStorage.getItem('mfs.userToken');
    }

    public saveUserToken(userToken: any) {
        return localStorage.setItem('mfs.userToken', userToken);
    }

    public getUserClaims() {
        return JSON.parse(localStorage.getItem('mfs.userClaims') || '{}');
    }

    public saveClaims(claims: any) {
        return localStorage.setItem('mfs.userClaims', JSON.stringify(claims));
    }

    public clearLocalUser() {
        localStorage.removeItem('mfs.accessToken');
        localStorage.removeItem('mfs.userToken');
        localStorage.removeItem('mfs.user');
        localStorage.removeItem('mfs.userClaims');
    }
}