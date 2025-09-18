/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
