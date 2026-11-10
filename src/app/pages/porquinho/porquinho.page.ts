import { Component, computed, inject, ViewChild, ElementRef, effect, AfterViewInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ModalController, IonContent, IonIcon, IonItem, IonLabel, IonList } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { createOutline, scaleOutline, warningOutline } from 'ionicons/icons';
import { NatureHeaderComponent } from '../../components/nature-header/nature-header.component';
import { PorquinhoModalComponent } from '../../components/porquinho-modal/porquinho-modal.component';
import { DadosService } from '../../services/dados.service';
import { Chart, registerables } from 'chart.js';

// Registar os componentes do Chart.js
Chart.register(...registerables);

@Component({
    selector: 'app-porquinho',
    standalone: true,
    templateUrl: './porquinho.page.html',
    styleUrls: ['./porquinho.page.scss'],
    imports: [DatePipe, NatureHeaderComponent, IonContent, IonIcon, IonList, IonItem, IonLabel],
})
export class PorquinhoPage {
    dados = inject(DadosService);
    private modalCtrl = inject(ModalController);
    private id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

    @ViewChild('graficoCanvas') graficoCanvas!: ElementRef;
    chartInstance: any;

    porquinho = computed(() => this.dados.porquinhos().find((p) => p.id === this.id));

    // Registos deste porquinho (do mais recente para o mais antigo)
    historico = computed(() => {
        const r = this.dados.registos().filter((x) => x.porquinhoId === this.id);
        return r.map((reg, i) => ({
            ...reg,
            diferenca: r[i + 1] ? reg.peso - r[i + 1].peso : null,
        }));
    });

    alertaPeso = computed(() => {
        const h = this.historico();
        if (h.length >= 2) {
            const quebra = h[1].peso - h[0].peso;

            if (quebra >= 50) {
                return { tipo: 'critico', valor: quebra };
            } else if (quebra >= 20 && quebra < 50) {
                return { tipo: 'atencao', valor: quebra };
            }
        }
        return null;
    });

    resumo = computed(() => {
        const h = this.historico();
        if (h.length === 0) return null;
        return {
            ultimo: h[0].peso,
            variacao: h[0].peso - h[h.length - 1].peso,
            total: h.length,
        };
    });

    idade = computed(() => {
        const nasc = this.porquinho()?.dataNascimento;
        if (!nasc) return null;
        const d = new Date(nasc);
        const hoje = new Date();
        let meses = (hoje.getFullYear() - d.getFullYear()) * 12 + hoje.getMonth() - d.getMonth();
        if (hoje.getDate() < d.getDate()) meses--;
        if (meses < 1) return 'menos de 1 mês';
        const anos = Math.floor(meses / 12);
        const m = meses % 12;
        const txtAnos = `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
        const txtMeses = `${m} ${m === 1 ? 'mês' : 'meses'}`;
        if (anos === 0) return txtMeses;
        return m === 0 ? txtAnos : `${txtAnos} e ${txtMeses}`;
    });

    constructor() {
        addIcons({ createOutline, scaleOutline, warningOutline });

        // Sempre que o histórico muda, atualiza o gráfico
        effect(() => {
            const h = this.historico();

            setTimeout(() => {
                if (this.graficoCanvas && this.graficoCanvas.nativeElement) {
                    this.desenharGrafico(h);
                }
            }, 50);
        });
    }

    desenharGrafico(historico: any[]) {
        if (!this.graficoCanvas) return;
        if (this.chartInstance) this.chartInstance.destroy(); // Limpa o gráfico anterior

        if (historico.length < 2) return; // Só desenha se houver pelo menos 2 pontos

        // Inverte os dados para o gráfico mostrar cronologicamente (da esquerda para a direita)
        const dadosOrdenados = [...historico].reverse();
        const datePipe = new DatePipe('en-US');
        const labels = dadosOrdenados.map(r => datePipe.transform(r.data, 'dd/MM') || '');
        const pesos = dadosOrdenados.map(r => r.peso);

        this.chartInstance = new Chart(this.graficoCanvas.nativeElement, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Peso (g)',
                    data: pesos,
                    borderColor: '#825b41', // Castanho madeira
                    backgroundColor: 'rgba(130, 91, 65, 0.15)', // Castanho translúcido
                    borderWidth: 2,
                    pointBackgroundColor: '#233026', // Verde floresta
                    pointRadius: 4,
                    fill: true,
                    tension: 0.3 // Curvas suaves
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        suggestedMin: Math.min(...pesos) - 30,
                        suggestedMax: Math.max(...pesos) + 30
                    }
                }
            }
        });
    }

    async editar() {
        const p = this.porquinho();
        if (!p) return;

        const modal = await this.modalCtrl.create({
            component: PorquinhoModalComponent,
            componentProps: { porquinhoEdit: p },
            breakpoints: [0, 0.9, 1],
            initialBreakpoint: 0.9
        });

        await modal.present();
        const { data, role } = await modal.onWillDismiss();

        if (role === 'confirm' && data) {
            await this.dados.atualizarPorquinho(p.id, {
                nome: data.nome.trim(),
                dataNascimento: data.dataNascimento || undefined,
                sexo: data.sexo || undefined,
                raca: data.raca || undefined,
                cor: data.cor || undefined,
                origem: data.origem || undefined,
                microchip: data.microchip || undefined
            });
        }
    }
}
