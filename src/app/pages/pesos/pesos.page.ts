import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { addIcons } from 'ionicons';
import { saveOutline, trendingUpOutline, trendingDownOutline } from 'ionicons/icons';
import { NatureHeaderComponent } from '../../components/nature-header/nature-header.component';
import { DadosService } from '../../services/dados.service';

@Component({
    selector: 'app-pesos',
    templateUrl: './pesos.page.html',
    styleUrls: ['./pesos.page.scss'],
    standalone: true,
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    imports: [CommonModule, FormsModule, NatureHeaderComponent]
})
export class PesosPage implements OnInit {
    dados = inject(DadosService); //[cite: 14]

    porquinhoSelecionadoId: string = '';
    novoPeso: number | null = null; //[cite: 14]

    // Junta os registos aos dados completos dos respetivos porquinhos e calcula a tendência
    historicoFormatado = computed(() => {
        // Agora guardamos o objeto completo do porquinho para termos acesso à foto
        const porquinhosMap = new Map(this.dados.porquinhos().map((p) => [p.id, p]));
        const lista = this.dados.registos(); //[cite: 18]

        return lista.map((reg, index) => {
            // Procura o registo imediatamente anterior do mesmo porquinho para comparar a tendência
            const anterior = lista.slice(index + 1).find((r) => r.porquinhoId === reg.porquinhoId);
            const tendencia = anterior ? (reg.peso >= anterior.peso ? 'up' : 'down') : 'up';
            const porquinho = porquinhosMap.get(reg.porquinhoId);

            return {
                id: reg.id,
                nome: porquinho?.nome ?? 'Porquinho',
                foto: porquinho?.foto, // Adicionada a extração da foto
                data: reg.data,
                peso: reg.peso,
                tendencia,
            };
        });
    });

    constructor() {
        addIcons({ saveOutline, trendingUpOutline, trendingDownOutline }); //[cite: 14]
    }

    async ngOnInit() {
        await this.dados.carregar(); //[cite: 11]
        const lista = this.dados.porquinhos(); //[cite: 11]
        if (lista.length > 0 && !this.porquinhoSelecionadoId) {
            this.porquinhoSelecionadoId = lista[0].id;
        }
    }

    async guardarPeso() {
        if (this.novoPeso && this.porquinhoSelecionadoId) { //[cite: 14]
            await this.dados.adicionarPeso(this.porquinhoSelecionadoId, Number(this.novoPeso)); //[cite: 14]
            this.novoPeso = null; //[cite: 14]
        }
    }
}
