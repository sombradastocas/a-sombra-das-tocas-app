import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonHeader, IonToolbar } from '@ionic/angular';

@Component({
    selector: 'app-nature-header',
    templateUrl: './nature-header.component.html',
    imports: [RouterLink, IonBackButton, IonButtons, IonHeader, IonToolbar],
})
export class NatureHeaderComponent {
    titulo = input.required<string>();
    destaque = input<string>('');
    voltar = input(false);
}
