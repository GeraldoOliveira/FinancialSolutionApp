export class LocalStorageUtils {
  public static userUpdatedSignal = new (class {
    private listeners: ((user: any) => void)[] = [];
    public subscribe(fn: (user: any) => void) {
      this.listeners.push(fn);
      return () => {
        this.listeners = this.listeners.filter(l => l !== fn);
      };
    }
    public emit(user: any) {
      this.listeners.forEach(fn => fn(user));
    }
  })();

  public saveLocalUser(response: any) {
    this.saveAccessToken(response.accessToken);
    this.saveUserToken(response.userToken);
    this.saveUser(response.user);
    this.saveClaims(response.claims);
  }

  public getUser() {
    try {
      const raw = localStorage.getItem('mfs.user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public saveUser(user: any) {
    localStorage.setItem('mfs.user', JSON.stringify(user));
    LocalStorageUtils.userUpdatedSignal.emit(user);
    return;
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
    return JSON.parse(localStorage.getItem('mfs.userClaims') || '[]');
  }

  public saveClaims(claims: any) {
    return localStorage.setItem('mfs.userClaims', JSON.stringify(claims));
  }

  public clearLocalUser() {
    localStorage.removeItem('mfs.accessToken');
    localStorage.removeItem('mfs.userToken');
    localStorage.removeItem('mfs.user');
    localStorage.removeItem('mfs.userClaims');
    LocalStorageUtils.userUpdatedSignal.emit(null);
  }
}

