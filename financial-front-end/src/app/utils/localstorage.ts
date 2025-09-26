export class LocalStorageUtils {

    public getUser() {
        return JSON.parse(localStorage.getItem('mfs.user') || '{}');
    }

    public setUser(user: any) {
        localStorage.setItem('mfs.user', JSON.stringify(user));
    }

    public saveLocalUser(response: any) {
        this.saveAccessToken(response.accessToken);
        this.saveUserToken(response.userToken);
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
}