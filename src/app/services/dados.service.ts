import { Injectable, computed, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import {Porquinho} from "../models/porquinho.model";

export interface RegistoPeso {
    id: string;
    porquinhoId: string;
    data: string; // ISO, ex: 2026-11-05
    peso: number; // gramas
}

export interface Tarefa {
    id: string;
    notifId: number; // id numérico exigido pelas notificações
    titulo: string;
    data: string; // próxima data, 'YYYY-MM-DD'
    repetirDias?: number;
    tipo?: 'limpeza' | 'pesagem';
}

export function paraIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function hojeLocal(): string {
    return paraIso(new Date());
}
export function addDias(data: string, dias: number): string {
    const [a, m, d] = data.split('-').map(Number);
    return paraIso(new Date(a, m - 1, d + dias));
}

@Injectable({ providedIn: 'root' })
export class DadosService {
    private readonly KEY = 'sombra-das-tocas';
    private readonly HORA_AVISO = 9;

    porquinhos = signal<Porquinho[]>([]);
    registos = signal<RegistoPeso[]>([]);
    tarefas = signal<Tarefa[]>([]);

    tarefasOrdenadas = computed(() =>
        [...this.tarefas()].sort((a, b) => a.data.localeCompare(b.data))
    );

    // Verifica se já existe um alerta de pesagem
    temAlarmePesagem(): boolean {
        return this.tarefas().some(t => t.tipo === 'pesagem');
    }

    async carregar() {
        const { value } = await Preferences.get({ key: this.KEY });
        if (value) {
            const dados = JSON.parse(value);
            this.porquinhos.set(dados.porquinhos ?? []);
            this.registos.set(dados.registos ?? []);
            this.tarefas.set(dados.tarefas ?? []);
        }
    }

    private async guardar() {
        try {
            await Preferences.set({
                key: this.KEY,
                value: JSON.stringify({
                    porquinhos: this.porquinhos(),
                    registos: this.registos(),
                    tarefas: this.tarefas(),
                }),
            });
        } catch (e) {
            console.error('Erro ao guardar dados', e);
        }
    }

    async adicionarPorquinho(dados: Omit<Porquinho, 'id'>): Promise<string> {
        const id = crypto.randomUUID();
        const novo: Porquinho = { id, ...dados };
        this.porquinhos.update((lista) => [...lista, novo]);
        await this.guardar();
        return id;
    }

    async atualizarPorquinho(id: string, alteracoes: Partial<Omit<Porquinho, 'id'>>) {
        this.porquinhos.update((lista) =>
            lista.map((p) => (p.id === id ? { ...p, ...alteracoes } : p))
        );
        await this.guardar();
    }

    async adicionarPeso(porquinhoId: string, peso: number) {
        const novo: RegistoPeso = {
            id: crypto.randomUUID(),
            porquinhoId,
            data: new Date().toISOString().slice(0, 10),
            peso,
        };
        this.registos.update((lista) => [novo, ...lista]);
        await this.guardar();
    }

    async adicionarTarefa(
        titulo: string,
        data: string,
        repetirDias?: number,
        tipo?: Tarefa['tipo']
    ): Promise<Tarefa> {
        const nova: Tarefa = {
            id: crypto.randomUUID(),
            notifId: Math.floor(Math.random() * 2_000_000_000),
            titulo: titulo.trim(),
            data,
            repetirDias,
            tipo,
        };
        this.tarefas.update((lista) => [...lista, nova]);
        await this.guardar();
        await this.pedirPermissao();
        await this.agendar(nova);
        return nova;
    }

    async concluirTarefa(id: string) {
        const t = this.tarefas().find((x) => x.id === id);
        if (!t) return;

        if (t.repetirDias) {
            const atualizada = { ...t, data: addDias(hojeLocal(), t.repetirDias) };
            this.tarefas.update((l) => l.map((x) => (x.id === id ? atualizada : x)));
            await this.guardar();
            await this.agendar(atualizada);
        } else {
            await this.apagarTarefa(id);
        }
    }

    async adiarTarefa(id: string, dias = 1) {
        const t = this.tarefas().find((x) => x.id === id);
        if (!t) return;
        const base = t.data < hojeLocal() ? hojeLocal() : t.data;
        const atualizada = { ...t, data: addDias(base, dias) };
        this.tarefas.update((l) => l.map((x) => (x.id === id ? atualizada : x)));
        await this.guardar();
        await this.agendar(atualizada);
    }

    async apagarTarefa(id: string) {
        const t = this.tarefas().find((x) => x.id === id);
        this.tarefas.update((l) => l.filter((x) => x.id !== id));
        await this.guardar();
        if (t) await this.cancelar(t);
    }

    async gaiolaLimpa(): Promise<Tarefa> {
        const existente = this.tarefas().find((t) => t.tipo === 'limpeza');
        if (existente) {
            await this.concluirTarefa(existente.id);
            return this.tarefas().find((t) => t.id === existente.id)!;
        }
        return this.adicionarTarefa('Limpar a gaiola', addDias(hojeLocal(), 3), 3, 'limpeza');
    }

    exportarDadosJSON(): string {
        const dados = {
            porquinhos: this.porquinhos(),
            registos: this.registos(),
            tarefas: this.tarefas()
        };
        return JSON.stringify(dados, null, 2);
    }

    async importarDadosJSON(jsonString: string): Promise<boolean> {
        try {
            const dados = JSON.parse(jsonString);
            if (Array.isArray(dados.porquinhos) && Array.isArray(dados.registos) && Array.isArray(dados.tarefas)) {
                this.porquinhos.set(dados.porquinhos);
                this.registos.set(dados.registos);
                this.tarefas.set(dados.tarefas);

                await this.guardar();
                for (const t of this.tarefas()) {
                    await this.agendar(t);
                }
                return true;
            }
            return false;
        } catch (e) {
            console.error('Erro ao processar o JSON importado:', e);
            return false;
        }
    }

    // ---------- Notificações ----------
    private async pedirPermissao() {
        if (!Capacitor.isNativePlatform()) return;
        try {
            await LocalNotifications.requestPermissions();
        } catch (e) {
            console.error(e);
        }
    }

    private async cancelar(t: Tarefa) {
        if (!Capacitor.isNativePlatform()) return;
        try {
            await LocalNotifications.cancel({ notifications: [{ id: t.notifId }] });
        } catch (e) {
            console.error(e);
        }
    }

    private async agendar(t: Tarefa) {
        if (!Capacitor.isNativePlatform()) return;
        try {
            await this.cancelar(t);
            const [a, m, d] = t.data.split('-').map(Number);
            const quando = new Date(a, m - 1, d, this.HORA_AVISO, 0, 0);
            if (quando.getTime() <= Date.now()) return;
            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: t.notifId,
                        title: 'A Sombra das Tocas',
                        body: t.titulo,
                        schedule: { at: quando },
                    },
                ],
            });
        } catch (e) {
            console.error('Erro ao agendar notificação', e);
        }
    }
}
