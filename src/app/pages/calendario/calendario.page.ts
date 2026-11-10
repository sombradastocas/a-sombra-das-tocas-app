import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActionSheetController, AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { homeOutline, alarmOutline, checkmarkCircleOutline, timeOutline, trashOutline, add } from 'ionicons/icons';

import { NatureHeaderComponent } from '../../components/nature-header/nature-header.component';
import { DadosService, Tarefa, addDias, hojeLocal } from '../../services/dados.service';

@Component({
    selector: 'app-calendario',
    templateUrl: './calendario.page.html',
    styleUrls: ['./calendario.page.scss'],
    standalone: true,
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    imports: [CommonModule, FormsModule, NatureHeaderComponent]
})
export class CalendarioPage implements OnInit {
    dados = inject(DadosService);
    private alertCtrl = inject(AlertController);
    private actionSheetCtrl = inject(ActionSheetController);
    private toastCtrl = inject(ToastController);

    constructor() {
        addIcons({ homeOutline, alarmOutline, checkmarkCircleOutline, timeOutline, trashOutline, add });
    }

    async ngOnInit() {
        await this.dados.carregar();
    }

    etiqueta(t: Tarefa): string {
        const hoje = hojeLocal();
        let texto: string;
        if (t.data < hoje) texto = 'Atrasada';
        else if (t.data === hoje) texto = 'Hoje';
        else if (t.data === addDias(hoje, 1)) texto = 'Amanhã';
        else {
            const [a, m, d] = t.data.split('-').map(Number);
            texto = new Date(a, m - 1, d).toLocaleDateString('pt-PT', {
                weekday: 'long', day: 'numeric', month: 'short',
            });
        }
        return t.repetirDias ? `${texto} · repete a cada ${t.repetirDias} dia(s)` : texto;
    }

    atrasada(t: Tarefa): boolean {
        return t.data < hojeLocal();
    }

    async menuTarefa(t: Tarefa) {
        const sheet = await this.actionSheetCtrl.create({
            header: t.titulo,
            buttons: [
                { text: 'Marcar como feita', icon: 'checkmark-circle-outline', handler: () => { this.dados.concluirTarefa(t.id); } },
                { text: 'Adiar 1 dia', icon: 'time-outline', handler: () => { this.dados.adiarTarefa(t.id, 1); } },
                { text: 'Apagar', icon: 'trash-outline', role: 'destructive', handler: () => { this.dados.apagarTarefa(t.id); } },
                { text: 'Fechar', role: 'cancel' },
            ],
        });
        await sheet.present();
    }

    async novaTarefa() {
        const hoje = hojeLocal();
        const alert = await this.alertCtrl.create({
            header: 'Novo lembrete',
            inputs: [
                { name: 'titulo', type: 'text', placeholder: 'Ex: Cortar unhas' },
                { name: 'data', type: 'date', value: hoje, min: hoje },
                { name: 'repetirDias', type: 'number', placeholder: 'Repetir de X em X dias (opcional)', min: 1 },
            ],
            buttons: [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Guardar',
                    handler: async (d) => {
                        if (!d.titulo?.trim() || !d.data) return false;
                        const n = Math.floor(Number(d.repetirDias));
                        await this.dados.adicionarTarefa(d.titulo, d.data, n > 0 ? n : undefined);
                        return true;
                    },
                },
            ],
        });
        await alert.present();
    }
}
