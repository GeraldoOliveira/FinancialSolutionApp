import { ApplicationConfig, importProvidersFrom, isDevMode, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideServiceWorker } from '@angular/service-worker';

import { provideToastr } from 'ngx-toastr';
import { NgxSpinnerModule } from 'ngx-spinner';

import { routes } from './app.routes';
import { errorHandlerInterceptor } from './core/services/error-handler.interceptor';
import { workspaceContextInterceptor } from './core/services/workspace-context.interceptor';

registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([workspaceContextInterceptor, errorHandlerInterceptor])
    ),
    provideToastr(),
    importProvidersFrom(NgxSpinnerModule.forRoot({})),
    provideAnimations(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
