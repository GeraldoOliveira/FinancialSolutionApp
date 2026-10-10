import { HttpErrorResponse, HttpHeaders } from "@angular/common/http"
import { throwError } from "rxjs";
import { LocalStorageUtils } from "../../shared/utils/local-storage";
import { environment } from "../../../environments/environment";

export abstract class BaseService {

    public LocalStorage = new LocalStorageUtils();

    protected UrlServiceV1: string = environment.apiUrlv1;

    protected GetHeadersJson() {
        return {
            headers: new HttpHeaders({
                'Content-Type': 'application/json'
            })
        };
    }

    protected GetAuthHeaderJson() {
        return {
            headers: new HttpHeaders({
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.LocalStorage.getUserToken()}`
            })
        };
    }

    protected ExtractData(response: any) {
        return response.data || {};
    }

    protected ServiceError(response: Response | any) {
        let customError: string[] = [];

        if (response instanceof HttpErrorResponse) {
            if (response.status === 0 || response.statusText === "Unknown Error") {
                customError.push("Ocorreu um erro ao conectar ao servidor. Verifique se o backend está em execução.");
                if (!response.error || typeof response.error !== 'object') {
                    (response as any).error = { error: customError };
                } else {
                    response.error.error = customError;
                }
            }
        }

        console.error(response);
        return throwError(() => response);
    }

}