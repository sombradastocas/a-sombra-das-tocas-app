import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController, ActionSheetController, ToastController, ModalController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { Camera, MediaTypeSelection } from '@capacitor/camera';
import { addIcons } from 'ionicons';
import { add, scaleOutline, checkmarkCircleOutline, homeOutline, cutOutline, cameraOutline,
    imageOutline, closeOutline, downloadOutline, pushOutline, alarmOutline } from 'ionicons/icons';
import { NatureHeaderComponent } from '../../components/nature-header/nature-header.component';
import { PorquinhoFormData, PorquinhoModalComponent } from '../../components/porquinho-modal/porquinho-modal.component';
import { DadosService, Tarefa, addDias, hojeLocal } from '../../services/dados.service';

@Component({
    selector: 'app-inicio',
    templateUrl: './inicio.page.html',
    styleUrls: ['./inicio.page.scss'],
    standalone: true,
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    imports: [CommonModule, FormsModule, RouterModule, NatureHeaderComponent]
})
export class InicioPage implements OnInit {
    dados = inject(DadosService);
    private alertCtrl = inject(AlertController);
    private actionSheetCtrl = inject(ActionSheetController);
    private toastCtrl = inject(ToastController);
    private modalCtrl = inject(ModalController); // Corrigido para injetar o ModalController
    private router = inject(Router);

    constructor() {
        addIcons({
            add, scaleOutline, checkmarkCircleOutline, homeOutline, cutOutline, downloadOutline, pushOutline,
            cameraOutline, imageOutline, closeOutline, alarmOutline });
    }

    async ngOnInit() {
        await this.dados.carregar();
    }

    // 1. Abre o novo Modal de Criação de Porquinho
    async abrirModalCriarPorquinho() {
        const modal = await this.modalCtrl.create({
            component: PorquinhoModalComponent,
            breakpoints: [0, 0.9, 1],
            initialBreakpoint: 0.9
        });

        await modal.present();

        // Espera que o utilizador feche o modal
        const { data, role } = await modal.onWillDismiss();

        // Se clicou em Continuar (e há dados)...
        if (role === 'confirm' && data) {
            // ... chama o menu da foto, passando o objeto completo do formulário
            await this.mostrarMenuFoto(data);
        }
    }

    async verificarEAgendarPesagem() {
        if (this.dados.temAlarmePesagem()) return;

        const hoje = hojeLocal();
        const alert = await this.alertCtrl.create({
            header: 'Pesagem Semanal',
            message: 'Para monitorizar a saúde, deves pesar a manada 1x por semana. Quando queres fazer a primeira pesagem?',
            inputs: [
                { name: 'data', type: 'date', value: hoje, min: hoje }
            ],
            buttons: [
                { text: 'Agora não', role: 'cancel' },
                {
                    text: 'Agendar',
                    handler: async (d) => {
                        if (d.data) {
                            await this.dados.adicionarTarefa('Pesagem Semanal da Manada', d.data, 7, 'pesagem');
                        }
                    }
                }
            ]
        });
        await alert.present();
    }

    // 3. Menu Bonito (Action Sheet)
    async mostrarMenuFoto(dadosForm: PorquinhoFormData) {
        const actionSheet = await this.actionSheetCtrl.create({
            header: 'Foto de Perfil',
            subHeader: `Escolhe uma foto para o(a) ${dadosForm.nome}`,
            buttons: [
                { text: 'Tirar Foto Agora', icon: 'camera-outline', handler: () => { this.capturarFoto(dadosForm, 'camera'); } },
                { text: 'Escolher da Galeria', icon: 'image-outline', handler: () => { this.capturarFoto(dadosForm, 'photos'); } },
                {
                    text: 'Sem Foto (Usar Padrão)',
                    icon: 'close-outline',
                    handler: async () => {
                        const id = await this.dados.adicionarPorquinho({
                            nome: dadosForm.nome!,
                            dataNascimento: dadosForm.dataNascimento,
                            sexo: dadosForm.sexo,
                            cor: dadosForm.cor,
                            origem: dadosForm.origem,
                            microchip: dadosForm.microchip
                        });

                        if (dadosForm.peso) await this.dados.adicionarPeso(id, Number(dadosForm.peso));
                        await this.verificarEAgendarPesagem();
                    }
                },
                { text: 'Cancelar Registo', role: 'cancel' }
            ]
        });
        await actionSheet.present();
    }

    // 4. Capturar a Foto
    async capturarFoto(dadosForm: PorquinhoFormData, origem: 'camera' | 'photos') {
        try {
            let webPath: string | undefined;

            if (origem === 'camera') {
                const foto = await Camera.takePhoto({
                    quality: 80,
                    targetWidth: 512,
                    targetHeight: 512,
                    editable: 'in-app',
                });
                webPath = foto.webPath;
            } else {
                const { results } = await Camera.chooseFromGallery({
                    mediaType: MediaTypeSelection.Photo,
                    allowMultipleSelection: false,
                    quality: 80,
                    targetWidth: 512,
                    targetHeight: 512,
                });
                webPath = results[0]?.webPath;
            }

            let fotoDataUrl: string | undefined;
            if (webPath) {
                fotoDataUrl = await this.webPathParaDataUrl(webPath);
            }

            // Grava enviando o objeto tipado
            const id = await this.dados.adicionarPorquinho({
                nome: dadosForm.nome!,
                foto: fotoDataUrl,
                dataNascimento: dadosForm.dataNascimento,
                sexo: dadosForm.sexo,
                cor: dadosForm.cor,
                origem: dadosForm.origem,
                microchip: dadosForm.microchip
            });

            if (dadosForm.peso) await this.dados.adicionarPeso(id, Number(dadosForm.peso));
            await this.verificarEAgendarPesagem();

        } catch (error) {
            // Em caso de erro ao tirar foto, grava na mesma
            const id = await this.dados.adicionarPorquinho({
                nome: dadosForm.nome!,
                dataNascimento: dadosForm.dataNascimento,
                sexo: dadosForm.sexo,
                raca: dadosForm.raca,
                cor: dadosForm.cor,
                origem: dadosForm.origem,
                microchip: dadosForm.microchip
            });
            if (dadosForm.peso) await this.dados.adicionarPeso(id, Number(dadosForm.peso));
            await this.verificarEAgendarPesagem();
        }
    }

    private async webPathParaDataUrl(webPath: string, tamanho = 256): Promise<string> {
        const blob = await (await fetch(webPath)).blob();
        const bitmap = await createImageBitmap(blob);

        const lado = Math.min(bitmap.width, bitmap.height);
        const sx = (bitmap.width - lado) / 2;
        const sy = (bitmap.height - lado) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = tamanho;
        canvas.height = tamanho;
        canvas.getContext('2d')!.drawImage(bitmap, sx, sy, lado, lado, 0, 0, tamanho, tamanho);
        bitmap.close();

        return canvas.toDataURL('image/jpeg', 0.8);
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

    async menuTarefa(t: Tarefa) {
        const botoes: any[] = [];
        if (t.tipo === 'pesagem') {
            botoes.push({
                text: 'Registar Pesos Agora',
                icon: 'scale-outline',
                handler: () => {
                    this.router.navigate(['/pesos']);
                }
            });
        }

        botoes.push(
            { text: 'Marcar como feita', icon: 'checkmark-circle-outline', handler: () => { this.dados.concluirTarefa(t.id); } },
            { text: 'Adiar 1 dia', icon: 'time-outline', handler: () => { this.dados.adiarTarefa(t.id, 1); } },
            { text: 'Apagar', icon: 'trash-outline', role: 'destructive', handler: () => { this.dados.apagarTarefa(t.id); } },
            { text: 'Fechar', role: 'cancel' }
        );
        const sheet = await this.actionSheetCtrl.create({
            header: t.titulo,
            buttons: botoes,
        });
        await sheet.present();
    }

    async gaiolaLimpa() {
        const t = await this.dados.gaiolaLimpa();
        const toast = await this.toastCtrl.create({
            message: `Limpeza registada! Próxima: ${this.etiqueta(t).split(' · ')[0].toLowerCase()}.`,
            duration: 2500,
            position: 'top',
        });
        await toast.present();
    }

    exportarBackup() {
        const json = this.dados.exportarDadosJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const dataHoje = new Date().toISOString().slice(0,10);
        a.download = `sombra-das-tocas-backup-${dataHoje}.json`;
        a.click();

        window.URL.revokeObjectURL(url);
    }

    clicarImportar() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (evento: any) => this.importarBackup(evento);
        input.click();
    }

    async importarBackup(evento: any) {
        const file = evento.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const conteudo = e.target?.result as string;
            const sucesso = await this.dados.importarDadosJSON(conteudo);

            const toast = await this.toastCtrl.create({
                message: sucesso ? 'Dados restaurados com sucesso!' : 'Erro: Ficheiro inválido.',
                duration: 3000,
                position: 'top',
                color: sucesso ? 'success' : 'danger'
            });
            await toast.present();
        };
        reader.readAsText(file);
    }
}
