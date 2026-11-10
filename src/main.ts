import { inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { AppComponent } from "./app/app.component";
import { DadosService } from './app/services/dados.service';
import { routes } from "./app/app.routes";

bootstrapApplication(AppComponent, {
    providers: [
        provideZoneChangeDetection(),
        provideIonicAngular(),
        provideRouter(routes),
        provideAppInitializer(() => inject(DadosService).carregar()),
    ],
});
defineCustomElements(window);
