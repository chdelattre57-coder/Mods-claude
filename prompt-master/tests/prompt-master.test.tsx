import { expect, test } from 'claude-code/testing'

const BANDE = {
  plugin: 'prompt-master',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const COMPOSER = { kind: 'composer' } as const

test('éteint : le message part tel quel', async ($, on) => {
  on('prompt.submit', (_, e) => ({ text: e.text, context: e.context }))
  const r = await $.prompt.submit({ text: 'Écris un mail', wait: false, origin: COMPOSER })
  expect(r.context).toBeUndefined()
})

test('bouton, questions, prompt final, corrections puis go', async ($, on) => {
  on('prompt.submit', (_, e) => ({ text: e.text, context: e.context }))
  const toasts: string[] = []
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  const ui = await $.ui.mount({ ...BANDE, surface: 'desktop' })
  expect((await ui.find({ type: 'Button' }))?.text).toBe('Prompt Master : OFF')

  await ui.press({ key: 'prompt-master' })
  expect((await ui.find({ type: 'Button' }))?.text).toBe('Prompt Master : ON')
  expect(toasts[0]).toMatch(/activé/)

  const envoyer = async (text: string) =>
    (await $.prompt.submit({ text, wait: false, origin: COMPOSER })).context?.join('\n') ?? ''

  const idee = await envoyer('Un mail pour présenter la DucoBox Sky 235')
  expect(idee).toMatch(/étape 1/)
  expect(idee).toMatch(/5 questions/)
  expect((await ui.find({ type: 'Text', text: /réponds aux questions/ }))).toBeDefined()

  expect(await envoyer('1. Promoteurs 2. Mail court 3. Ton direct')).toMatch(/étape 2/)
  expect(await envoyer('Ajoute un appel à rendez-vous')).toMatch(/correction/)
  expect(await envoyer('Go !')).toMatch(/lancement/)

  // Après le go, une nouvelle idée repart à l'étape 1.
  expect(await envoyer('Autre idée')).toMatch(/étape 1/)

  await ui.press({ key: 'prompt-master' })
  expect((await ui.find({ type: 'Button' }))?.text).toBe('Prompt Master : OFF')
  expect(toasts[1]).toMatch(/désactivé/)
  expect(await envoyer('Message normal')).toBe('')
  await ui.unmount()
})

test('la bande s\'affiche sur toutes les surfaces', async $ => {
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BANDE, surface })
    expect((await ui.find({ type: 'Button' }))?.text).toBe('Prompt Master : OFF')
    await ui.unmount()
  }
})
