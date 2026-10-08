# SDK TypeScript 221

Client typé de l'API 221 (EF-221-02), vérification des signatures de webhook,
données de référence hors ligne (EF-221-03), modules « paquet » `telephonie` et
`monnaie`. Site et documentation : <https://221.orvlabs.com/documentation>. Les types
générés sont rebâtis dans le dépôt principal (`npm run generate`) ; ce dépôt publie
le résultat.

| Import | Contenu | Origine |
| --- | --- | --- |
| `@orvlabs/sdk-221` | `createApiClient()` : toutes les routes de l'OpenAPI, typées | Types générés par [openapi-typescript](https://openapi-ts.dev/), client [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) |
| `@orvlabs/sdk-221/webhook` | `verifyWebhook()` : signature `X-221-Signature` d'un webhook | `node:crypto` (HMAC-SHA256, comparaison à temps constant) |
| `@orvlabs/sdk-221/offline` | `holidays`, `holiday`, `operatorFor`, `banks`, `bank`, `places`, `place`, `snapshot` | Instantané versionné de `server/data.json` (jours fériés, préfixes, banques, géographie jusqu'à la commune) |
| `@orvlabs/sdk-221/telephonie` | `analysePhone()` : validation +221, formats, opérateur d'origine | libphonenumber-js, même règle que `GET /v1/telephone/analyse` ; n'embarque que les préfixes d'opérateurs, pas tout l'instantané |
| `@orvlabs/sdk-221/monnaie` | `formatAmount()` : « 1 250 000 FCFA », en lettres, en euros | n2words, même règle que `GET /v1/monnaie/format` |

## Installation

```sh
npm install @orvlabs/sdk-221
```

Pas encore publié sur npm : la commande fonctionnera à la publication.

## Développement

`packages/` est un espace de travail npm (`sdk-ts`, `mcp`) : `@orvlabs/sdk-221` y est
résolu en local, sans registre.

```sh
cd packages && npm ci
cd sdk-ts
npm run generate   # contrat Go (make openapi, sans serveur) et instantané : OpenAPI, types, données
npm run build
npm test           # test/api.test.ts appelle l'API Go locale (make dev)
```

`npm run generate` refait tout ce qui vient du contrat ; rien de généré n'est
modifié à la main ni versionné (`src/generated/`, `dist/`).

## Clés API

Une clé a la forme `sk_221_pay_test_…` (mode test) ou `sk_221_pay_live_…` (mode réel).
Les clés déjà émises avec `221pay_test_`, `221pay_live_` ou `sk_221_` restent acceptées. Le client envoie
`Authorization: Bearer <clé>`. Ne mettez jamais la clé dans du code exécuté par
le navigateur.

```ts
import { createApiClient } from '@orvlabs/sdk-221';

const api = createApiClient({ apiKey: process.env.API_KEY }); // sans baseUrl : https://apps.orvlabs.com
```

Les routes de données fonctionnent aussi sans clé, avec un quota bas par adresse IP.

## Créer un paiement

`Idempotency-Key` est propre à chaque paiement : renvoyer la même valeur ne crée
pas de doublon. Le contrat décrit le corps comme du binaire : on passe le JSON
sérialisé, sans second `JSON.stringify` (`bodySerializer`).

```ts
const { data, error } = await api.POST('/v1/payments', {
  params: { header: { 'Idempotency-Key': 'commande-1042' } },
  body: JSON.stringify({
    amount: '10000',
    currency: 'XOF',
    rail: 'sn_wave',
    merchant_reference: 'commande-1042',
    return_url: 'https://boutique.example/merci',
  }),
  bodySerializer: (body) => body,
});
if (error) throw new Error(`${error.code}: ${error.message}`);
```

## Vérifier un webhook

Lisez le corps brut avant tout décodage JSON ; refusez la requête si la
fonction renvoie `false` (signature fausse, ou horodatage de plus de 5 minutes,
`maxAgeSeconds` pour changer la durée).

```ts
import { verifyWebhook } from '@orvlabs/sdk-221/webhook';

// Express : app.post('/webhooks/221', express.raw({ type: 'application/json' }), (req, res) => …)
const ok = verifyWebhook(process.env.WEBHOOK_SECRET!, req.header('X-221-Timestamp') ?? '', req.body, req.header('X-221-Signature') ?? '');
if (!ok) return res.sendStatus(401);
```

Dédupliquez sur l'identifiant de l'événement : une livraison peut être rejouée.

## Premier appel, sans clé

```ts
import type { JourFerie } from '@orvlabs/sdk-221/offline';

const { data } = await api.GET('/v1/jours-feries', { params: { query: { year: '2026' } } });
console.log((data?.data as JourFerie[])[0]?.name.fr); // « Jour de l'an »
```

## Erreurs et quotas

Le client ne lève pas d'exception pour une réponse HTTP d'erreur : il renvoie
`error`, au format `{ code, message, request_id, fields? }` de l'API (les codes
sont en majuscules : `QUOTA_EXCEEDED`, `INVALID_REQUEST`…). Testez `code`, pas
le statut.

```ts
const { error, response } = await api.GET('/v1/categories');
if (error) {
  if (response.status === 429) {
    const seconds = Number(response.headers.get('Retry-After')); // attendre, ou utiliser une clé
  }
  throw new Error(`${error.code}: ${error.message}`);
}
```

Ne relancez pas un 429 en boucle : attendez `Retry-After` secondes.

## Hors ligne

```ts
import { holidays, operatorFor, place, snapshot } from '@orvlabs/sdk-221/offline';
import { analysePhone } from '@orvlabs/sdk-221/telephonie';
import { formatAmount } from '@orvlabs/sdk-221/monnaie';

holidays(2026);                  // jours fériés de l'année (date_status : confirmee ou previsionnelle) ; RangeError hors des années embarquées
analysePhone('+221 70 123 45 67'); // même réponse que l'API ; null si ce n'est pas un numéro
formatAmount(1250000).words;     // « un million deux cent cinquante mille francs CFA »
place('reg_om6lpn2l');           // Dakar, ses ancêtres et ses enfants
snapshot.built_at;               // date des données embarquées
```

L'opérateur est celui du préfixe d'origine : avec la portabilité, un abonné
peut avoir changé d'opérateur (`notice` le rappelle). Les données embarquées
datent de `snapshot.built_at` ; l'API reste la référence la plus récente.

## Exemple et tests

```sh
node examples/premier-appel.mjs      # API_KEY et API_URL facultatifs
npm test                             # vitest ; test/api.test.ts appelle l'API locale (API_URL)
```

Le quota anonyme est de 10 appels par minute : relancez les tests d'API après
une minute si une 429 apparaît. Les tests d'API comparent les réponses en ligne
aux fonctions hors ligne : un écart signale une règle dupliquée qui a divergé.

## Règles dupliquées

`telephonie.ts`, `monnaie.ts` et `normalize()` dans `offline.ts` recopient
`server/internal/api/telephone.go`, `montant.go` et `data.go` : ces fichiers de
l'API dépendent de ses erreurs HTTP et de son jeu de données, ils ne peuvent pas
être importés tels quels. Les tests de parité détectent toute divergence.
