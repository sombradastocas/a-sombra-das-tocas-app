import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, checkmarkOutline } from 'ionicons/icons';
import { Porquinho } from '../../models/porquinho.model';

export type PorquinhoFormData = Partial<Porquinho> & { peso?: number | null };

@Component({
    selector: 'app-porquinho-modal',
    templateUrl: './porquinho-modal.component.html',
    styleUrls: ['./porquinho-modal.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon]
})
export class PorquinhoModalComponent implements OnInit {
    private modalCtrl = inject(ModalController);

    // Recebe o porquinho se estivermos em modo de edição
    @Input() porquinhoEdit?: Porquinho;

    dados: PorquinhoFormData = {
        nome: '', dataNascimento: '', sexo: '', raca: '', cor: '', peso: undefined, origem: '', microchip: ''
    };

    constructor() {
        addIcons({ closeOutline, checkmarkOutline });
    }

    ngOnInit() {
        // Se recebermos um porquinho, preenchemos o formulário automaticamente!
        if (this.porquinhoEdit) {
            this.dados = { ...this.porquinhoEdit, peso: undefined  };
        }
    }

    cancelar() {
        this.modalCtrl.dismiss(null, 'cancel');
    }

    continuar() {
        if (this.dados.nome && this.dados.nome.trim().length > 0) {
            this.modalCtrl.dismiss(this.dados, 'confirm');
        }
    }
}
