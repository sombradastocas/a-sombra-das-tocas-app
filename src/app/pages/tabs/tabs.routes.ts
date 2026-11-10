import type { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
    {
        path: '',
        component: TabsPage,
        children: [
            {
                path: 'inicio',
                loadComponent: () => import('../inicio/inicio.page').then((m) => m.InicioPage),
            },
            {
                path: 'pesos',
                loadComponent: () => import('../pesos/pesos.page').then((m) => m.PesosPage),
            },
            {
                path: 'calendario', // <-- Rota para o calendário
                loadComponent: () => import('../calendario/calendario.page').then((m) => m.CalendarioPage),
            },
            {
                path: 'porquinho/:id',
                loadComponent: () => import('../porquinho/porquinho.page').then((m) => m.PorquinhoPage),
            },
            {
                path: '',
                redirectTo: 'inicio',
                pathMatch: 'full',
            },
        ],
    },
];
