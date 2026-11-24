import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Etape } from '../types'

const actif = atom({ plugin: 'prompt-master', key: 'actif' } as const, false)
const etape = atom(
  { plugin: 'prompt-master', key: 'etape' } as const,
  'idle' as Etape,
)

// Mot qui lance le prompt final : « go », seul, ponctuation tolérée.
const GO = /^\s*go\s*[.!]*\s*$/i

const ETAPE_1 = `[Prompt Master — étape 1 : questions]
Le mode Prompt Master est activé. Ne réalise PAS la tâche demandée dans le message ci-dessus.
Lis l'idée de l'utilisateur et repère ce qui manque pour en faire un prompt complet : le but, le public visé (pour qui), le format attendu, le ton, les contraintes, un exemple.
Pose au maximum 5 questions, en français, sous forme de liste numérotée courte. Une question par ligne, sans préambule ni explication.
Ne pose que les questions utiles : ignore un point déjà clair dans le message.
Termine par une seule phrase invitant l'utilisateur à répondre. N'utilise aucun outil.`

const ETAPE_2 = `[Prompt Master — étape 2 : prompt réécrit]
Le message ci-dessus contient les réponses de l'utilisateur à tes questions. Ne réalise toujours PAS la tâche.
Réécris l'idée de départ et ces réponses en un seul prompt clair et complet, en français, qui précise le but, le public, le format, le ton, les contraintes et l'exemple quand ils sont connus.
Affiche ce prompt dans un bloc de code, sous le titre « Prompt final ».
Termine exactement par : « Réponds go pour lancer ce prompt, ou indique ce que tu veux modifier. »
N'utilise aucun outil.`

const CORRECTION = `[Prompt Master — correction du prompt]
L'utilisateur n'a pas encore dit « go » : le message ci-dessus est une demande de modification du prompt final. Ne réalise PAS la tâche.
Applique la modification, affiche le prompt final complet mis à jour dans un bloc de code sous le titre « Prompt final »,
puis termine exactement par : « Réponds go pour lancer ce prompt, ou indique ce que tu veux modifier. »
N'utilise aucun outil.`

const LANCEMENT = `[Prompt Master — lancement]
L'utilisateur a validé avec « go ». Exécute maintenant intégralement le dernier « Prompt final » que tu as affiché, comme s'il venait d'être envoyé tel quel. Ne le réaffiche pas et ne pose plus de questions de clarification.`

// Ce que voit Claude en plus du message, selon l'étape où en est l'échange.
export function prochaineEtape(
  courante: Etape,
  texte: string,
): { consigne: string; suivante: Etape } {
  if (courante === 'questions') {
    return { consigne: ETAPE_2, suivante: 'attente' }
  }
  if (courante === 'attente') {
    return GO.test(texte)
      ? { consigne: LANCEMENT, suivante: 'idle' }
      : { consigne: CORRECTION, suivante: 'attente' }
  }

  return { consigne: ETAPE_1, suivante: 'questions' }
}

async function basculer($: EngineInterface) {
  const allume = !(await read($, actif))
  await update($, actif, () => allume)
  await update($, etape, () => 'idle' as Etape)
  $.ui.toast(
    allume
      ? 'Prompt Master activé : tes prochains messages passeront par les questions.'
      : 'Prompt Master désactivé : tes messages partent normalement.',
  )
  $.ui.status(allume ? 'Prompt Master : activé' : undefined)

  return allume
}

const LIBELLE_ETAPE: Record<Etape, string> = {
  idle: 'envoie ton idée',
  questions: 'réponds aux questions',
  attente: 'tape go pour lancer, ou demande une modification',
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'prompt-master',
      description: 'Active ou désactive le mode Prompt Master',
    })
    if (await read($, actif)) {
      $.ui.status('Prompt Master : activé')
    }

    return next(e)
  })

  on('command.run', { command: 'prompt-master' }, async $ => {
    const allume = await basculer($)

    return {
      text: allume ? 'Prompt Master activé.' : 'Prompt Master désactivé.',
    }
  })

  on('prompt.submit', async ($, e, next) => {
    // Seuls les messages tapés par la personne passent par le mode.
    const tape = e.origin.kind === 'composer' || e.origin.kind === 'bridge'
    if (!tape || e.command || e.isMeta || !(await read($, actif))) {
      return next(e)
    }

    const { consigne, suivante } = prochaineEtape(await read($, etape), e.text)
    await update($, etape, () => suivante)

    return next({ ...e, context: [...(e.context ?? []), consigne] })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const allume = await read($, actif)
    const ou = await read($, etape)

    return (
      <Box flexDirection="row" gap={1}>
        <Button
          key="prompt-master"
          label={allume ? 'Prompt Master : ON' : 'Prompt Master : OFF'}
          onPress={() => basculer($)}
        />
        <Text dimColor>
          {allume ? `Étape : ${LIBELLE_ETAPE[ou]}` : 'messages envoyés normalement'}
        </Text>
      </Box>
    )
  })
}
