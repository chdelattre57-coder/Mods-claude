# Prompt Master

Mod pour l'app Claude. Un bouton « Prompt Master » au-dessus de la zone de chat active un mode en trois temps :

1. Tu envoies ton idée : Claude ne fait pas la tâche, il te pose 5 questions maximum (but, public, format, ton, contraintes, exemple).
2. Tu réponds : Claude réécrit le tout en un seul prompt clair et complet, qu'il affiche sous « Prompt final ».
3. Tu tapes « go » pour lancer ce prompt, ou tu demandes une modification (Claude réaffiche le prompt corrigé et attend à nouveau « go »).

Bouton sur OFF : les messages partent normalement. Un message s'affiche à chaque bascule. La commande /prompt-master fait la même chose que le bouton.

Le texte à droite du bouton indique l'étape en cours : « envoie ton idée », « réponds aux questions » ou « tape go pour lancer ».
