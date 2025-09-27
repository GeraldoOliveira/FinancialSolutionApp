import { HttpErrorResponse, HttpHeaders } from "@angular/common/http"
import { throwError } from "rxjs";
import { LocalStorageUtils } from "../utils/localstorage";
import { environment } from "../../environments/environment";

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

    protected ExtractData(response: any) {
        return response.data || {};
    }

    protected ServiceError(response: Response | any) {
        let customError: string[] = [];

        if (response instanceof HttpErrorResponse) {
            if (response.statusText === "Unknown Error") {
                customError.push("Ocorreu um erro desconhecido. Verifique a sua conexão com a internet.");
                response.error.errors = customError;
            }
        }
 
        console.error(response);
        return throwError(() => new Error(response));
    }
    
}