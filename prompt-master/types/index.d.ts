// idle : aucune demande en cours
// questions : Claude a posé ses questions, la prochaine réponse les complète
// attente : Claude a montré le prompt final, on attend « go » ou des corrections
export type Etape = 'idle' | 'questions' | 'attente'

declare module 'claude-code' {
  interface PluginState {
    'prompt-master': { actif: boolean; etape: Etape }
  }
}
