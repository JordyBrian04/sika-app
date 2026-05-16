# SIKA APP — Mémoire Projet

> Dernière mise à jour : 2026-05-15 (migration VPS Contabo + domaine sika-app.org)

## 1. Vue d'ensemble

**Sika App** est une application mobile de gestion de budget personnel en FCFA, développée en React Native (Expo, TypeScript). Elle cible le marché ivoirien et ouest-africain.

**Auteur :** Jordy Brian (brian.gboko@southlandglobal.africa)
**Plateformes :** Android + iOS
**Monnaie :** FCFA (montants en entiers)

## 2. Stack technique — App mobile (sika-app)

| Technologie | Version | Rôle |
|---|---|---|
| React Native | 0.81.5 | Framework mobile |
| Expo SDK | ~54.0.33 | Plateforme de build/dev |
| expo-router | ~6.0.23 | Navigation (file-based routing) |
| expo-sqlite | ~16.0.10 | Base de données locale (async API) |
| expo-notifications | ~0.32.16 | Notifications push locales |
| expo-local-authentication | ~17.0.8 | Biométrie (Face ID / Fingerprint) |
| expo-file-system | ~19.0.21 | Opérations fichiers (backup/restore) |
| expo-document-picker | ~14.0.8 | Sélection de fichier (restore) |
| expo-sharing | ~14.0.8 | Partage de fichier (backup) |
| expo-background-fetch | ~14.0.9 | Tâches de fond (auto-backup) |
| react-native-reanimated | ~4.1.1 | Animations |
| react-native-gesture-handler | ~2.28.0 | Gestes (swipe, pan) |
| react-native-gifted-charts | ^1.4.74 | Graphiques (bar, pie) |
| zustand | ^5.0.11 | State management (toasts) |
| react-native-mmkv | ^4.1.2 | Stockage rapide clé-valeur (inactivité) |
| react-native-portalize | ^1.0.7 | Portails (BottomSheet) |

**Police :** Poppins (Regular, Medium, SemiBold, Bold)
**Couleur primaire :** #265ed7
**Couleurs :** COLORS.primary=#265ed7, dark=#1E1E1E, white=#FFFFFF, gray, green, secondary

## 3. Stack technique — Backend (sika-app-node)

| Technologie | Version | Rôle |
|---|---|---|
| Node.js | — | Runtime serveur |
| Express | ^5.2.1 | Framework HTTP |

**État actuel :** Projet vide, seul package.json avec Express installé. Aucun code source, aucune route, aucun modèle, aucune config.

## 4. Architecture de l'app mobile

### 4.1 Structure des fichiers

```
app/
├── index.tsx                  # Écran de verrouillage (PIN 6 chiffres + biométrie)
├── _layout.tsx                # Layout racine (init DB, notifications, auto-backup)
├── modal.tsx                  # Modal générique
├── (modals)/white.tsx         # Modal blanc (inactivité)
├── (tabs)/
│   ├── _layout.tsx            # Config navigation par onglets
│   ├── index.tsx              # Accueil (solde, transactions récentes, jauge)
│   ├── budgets.tsx            # Gestion des budgets mensuels
│   ├── stats.tsx              # Statistiques (graphiques, score financier, calendrier)
│   ├── epargne.tsx            # Objectifs d'épargne et contributions
│   └── settings.tsx           # Paramètres, profil, XP/badges, backup/restore
├── (screens)/
│   ├── ListeTransactions.tsx  # Liste filtrée de transactions
│   ├── DetailTransactions.tsx # Détail d'une transaction
│   ├── DetailBudget.tsx       # Détail/édition d'un budget
│   ├── IncomingEvent.tsx      # Paiements récurrents à venir
│   ├── DetailEvent.tsx        # Détail d'un paiement récurrent
│   ├── Categories.tsx         # Gestion des catégories
│   ├── DetailGoal.tsx         # Détail d'un objectif d'épargne
│   └── ClotureMois.tsx        # Clôture mensuelle

src/
├── db/
│   ├── index.ts               # Core DB (openDb, runSql, all, getOne, migrate, seedDefaults)
│   ├── schema.ts              # Schéma SQL + migrations (DB_VERSION=2)
│   ├── autoBackupTask.ts      # Auto-backup en tâche de fond
│   └── repositories/
│       ├── userRepo.ts        # user_profile CRUD
│       ├── transactions.ts    # Transactions CRUD + editTransaction
│       ├── budgetRepo.ts      # Budgets mensuels
│       ├── category.ts        # Catégories
│       ├── recurringRepo.ts   # Paiements récurrents
│       ├── closureRepo.ts     # Clôtures mensuelles
│       ├── settingRepo.ts     # Backup/restore/reset
│       ├── statsRepo.ts       # Requêtes statistiques
│       ├── badgesRepo.ts      # Liste des badges avec statut
│       ├── financeRepo.ts     # Calculs financiers
│       └── calendarRepo.ts    # Calendrier de dépenses
├── services/
│   ├── gamification/
│   │   ├── xpService.ts       # XP, niveaux, calculs
│   │   └── daily.ts           # Streaks, jours d'activité
│   ├── badges/
│   │   └── badgeService.ts    # 18 badges, vérifications, unlockBadge
│   ├── goals/
│   │   ├── goalsRepo.ts       # CRUD objectifs
│   │   └── contributions.ts   # Contributions + vérif badges
│   ├── missions/
│   │   └── noSpendDay.ts      # Mission "zéro dépense"
│   ├── recurring/             # Logique paiements récurrents
│   ├── stats/
│   │   ├── financeScore.ts    # Score financier
│   │   └── expenseCalendar.ts # Heatmap 60 jours
│   └── calendar/
├── notifications/
│   ├── channels.ts            # Canaux de notification
│   ├── eod.ts                 # Notification fin de journée (DAILY trigger)
│   ├── closureReminder.ts     # Rappel clôture (DATE trigger, dernier jour du mois, 23h30)
│   ├── recurringNotifications.ts  # Rappels paiements récurrents (DATE trigger)
│   ├── eodHandlers.ts         # Handlers EOD
│   └── recurringHandlers.ts   # Handlers récurrents
├── components/
│   ├── BottomSheet.tsx        # Bottom sheet custom (Pan gesture sur handle uniquement)
│   ├── SwipeableTransaction.tsx # Ligne swipeable (activeOffsetX, failOffsetY)
│   ├── GaugeCard.tsx          # Jauge demi-cercle
│   ├── PieChart.tsx           # Graphique en anneau
│   └── ExpenseCalendar60Days.tsx # Calendrier heatmap
├── theme/fonts.ts             # FONT_FAMILY constants
├── state/toastStore.ts        # Zustand store pour toasts
└── ui/components/             # Composants utilitaires (modal queue, etc.)
```

### 4.2 Base de données SQLite

**Fichier :** budget.db
**Version :** DB_VERSION = 2
**Migration :** PRAGMA user_version, migrations incrémentales

#### Tables (15+) :

| Table | Rôle |
|---|---|
| user_profile | Profil utilisateur unique (id=1), PIN, nom, genre, XP, niveau, streaks |
| categories | Catégories de transactions (17 par défaut : depense, entree, event) |
| transactions | Transactions financières (amount INTEGER en FCFA) |
| budgets | Budgets mensuels par catégorie (UNIQUE month+year+category) |
| recurring_payments | Paiements récurrents (fréquence, intervalle, rappels) |
| saving_goals | Objectifs d'épargne (cible, date, priorité) |
| goal_contributions | Contributions aux objectifs |
| goal_rules | Règles automatiques par objectif |
| goal_streaks | Séries de réussite par objectif |
| badges | 18 badges définis (code, title, description) |
| user_badges | Badges débloqués par l'utilisateur |
| xp_events | Journal XP (UNIQUE action+ref_id pour anti-doublon) |
| daily_missions | Missions quotidiennes |
| weekly_missions | Missions hebdomadaires |
| weekly_boosts | Boosts de mission hebdomadaire |
| closures | Clôtures mensuelles (théorique vs physique) |
| recurring_notification_links | Liens notification ↔ paiement récurrent |
| recurring_due_queue | File d'attente des échéances récurrentes |

### 4.3 Authentification actuelle

- **Mono-utilisateur** : un seul profil (id=1)
- **PIN 6 chiffres** stocké en clair dans user_profile.pass
- **Biométrie** via expo-local-authentication (Face ID / empreinte)
- **Verrouillage automatique** : 3 secondes d'inactivité → retour au PIN
- **Pas de compte en ligne**, pas d'email/mot de passe

### 4.4 Backup / Restore

- **Backup :** Copie de budget.db → /Documents/backups/sika-backup-{timestamp}.db → partage via Share Sheet
- **Restore :** DocumentPicker → sélection d'un .db → remplacement de budget.db → restart app
- **Auto-backup :** Tâche de fond tous les 2 jours, garde les 10 derniers
- **Reset :** Suppression de toutes les données + reseed catégories et badges

### 4.5 Gamification

- **18 badges** : FIRST_TX, FIRST_EXPENSE, FIRST_INCOME, FIRST_BUDGET, FIRST_GOAL, NO_SPEND_DAY, WEEK_CONTROL, MONTH_CONTROL, THREE_MONTHS, TEN_TX, FIFTY_TX, HUNDRED_TX, SAVE_START, SAVE_50K, SAVE_100K, GOAL_DONE, RECURRING_CREATED, BILLS_TRACKED
- **XP** : actions donnent de l'XP, niveaux calculés
- **Streaks** : jours consécutifs d'activité
- **Missions** : quotidiennes et hebdomadaires avec boosts

### 4.6 Notifications push locales

- **Paiements récurrents** : rappel J-N avant échéance (DATE trigger)
- **Fin de journée** : rappel quotidien (DAILY trigger)
- **Clôture mensuelle** : dernier jour du mois à 23h30 (DATE trigger)

## 5. Bugs connus et corrigés

| Bug | Cause | Fix |
|---|---|---|
| DB migrate: duplicate column gender | DB_VERSION=12, anciennes migrations rejouées | DB_VERSION=2, consolidation migrations |
| DB migrate: default value not constant | datetime('now') comme DEFAULT dans closures | DEFAULT retiré, valeur set manuellement dans le repo |
| Streak ne s'incrémente pas | updateActivityAndStreak() reset à 0 au startup | Réécrit pour ne pas reset quand pas de transactions |
| Swipe bloque le scroll | Pan gesture capture tout le mouvement horizontal | activeOffsetX([-15,15]) + failOffsetY([-10,10]) |
| Notifications récurrentes ne se déclenchent pas | Format trigger sans champ `type` | Ajout type: SchedulableTriggerInputTypes.DATE/DAILY |
| active_days affiche "011" | Stocké comme TEXT | Parse Number() + format conditionnel |
| Database is locked | unlockBadge() sans await (écritures parallèles) | Ajout await sur tous les unlockBadge() |
| Badges non créés en production | seedDefaults() dans if(__DEV__) + return prématuré | Appel inconditionnel + séparation catégories/badges |
| Texte dupliqué dans BottomSheet | Pan gesture sur tout le sheet + closures stale onChangeText | Pan uniquement sur handle + setState fonctionnel (prev => ...) |
| Scroll difficile dans BottomSheet (event) | Sheet pas assez haut + conflit gesture/scroll | MAX_TRANSLATE_Y pour event + nestedScrollEnabled |

## 6. Problèmes iOS (corrigés)

### 6.1 Biométrie non visible sur iOS TestFlight — CORRIGÉ

**Fix appliqué (app/index.tsx) :**
- Ajout de `hasHardwareAsync()` + `isEnrolledAsync()` + `supportedAuthenticationTypesAsync()` au montage
- State `biometricAvailable` contrôle l'affichage du bouton
- Icône adaptative : "face-recognition" (Face ID) ou "fingerprint" selon le type détecté
- `authenticateAsync()` enrichi avec `promptMessage`, `cancelLabel`, `disableDeviceFallback`

### 6.2 Backup/Restore iOS — CORRIGÉ

**Fix appliqué (settingRepo.ts) :**
- Backup : UTI changé de `public.database` à `public.data` (plus compatible iOS)
- Restore : DocumentPicker utilise `["public.data", "public.item", "public.content"]` sur iOS au lieu de `*/*`
- Validation ajoutée : vérifie que le fichier sélectionné est bien un `.db`
- Note : sur iOS, la sauvegarde passe par la Share Sheet (Fichiers, iCloud, AirDrop) — c'est le design d'Apple

## 7. Plan de monétisation — Sika Pro

### 7.1 Fonctionnalités gratuites

- Transactions illimitées (entrées/dépenses)
- Solde global et historique
- Catégories par défaut (17, non modifiables)
- Budgets : max 5 catégories/mois
- Objectifs d'épargne : max 2
- Gamification complète (badges, streaks, XP, missions)
- Notifications de paiements récurrents
- Statistiques de base (répartition, évolution, comparaison, prédiction épargne)

### 7.2 Fonctionnalités Pro (achat in-app)

| Feature | Description |
|---|---|
| Sync cloud + multi-appareils | Backup cloud automatique, sync entre appareils |
| Rapports avancés | Analyses poussées, insights intelligents |
| Export PDF/Excel | Export de l'historique |
| Objectifs illimités + règles | Arrondi automatique, contributions programmées, priorités |
| Budgets illimités + alertes | Alerte 80%, dépense inhabituelle, prédiction dépassement |
| Catégories personnalisées | Créer, renommer, supprimer, icônes, couleurs |
| Clôture mensuelle | Réconciliation théorique vs physique |
| Thèmes et personnalisation | Couleurs, mode sombre amélioré, icônes app |
| Mode famille (futur) | Budget partagé avec conjoint |

### 7.3 Prix suggérés (marché ivoirien)

- **Mensuel :** 1 490 FCFA/mois
- **Annuel :** 9 900 FCFA/an (~825 FCFA/mois)
- **À vie (early adopters) :** 19 900 FCFA

### 7.4 Implémentation technique

- **RevenueCat** (react-native-purchases) pour la gestion des achats
- Champ `plan` dans user_profile : "free" | "pro"
- Champ `plan_expires_at` : timestamp d'expiration
- Hook `useIsPro()` : retourne booléen basé sur le statut
- Écran paywall dédié accessible depuis settings et chaque feature verrouillée

## 8. Architecture cloud (à implémenter)

### 8.1 Base de données recommandée

**Supabase (PostgreSQL)** — recommandé pour :
- Auth intégrée (email, téléphone, social)
- PostgreSQL managé
- API REST auto-générée
- Realtime subscriptions
- Storage pour backups cloud
- Free tier généreux
- SDK JavaScript officiel

### 8.2 Schéma de sync offline-first

1. SQLite reste la DB principale côté client
2. Nouvelles colonnes sur chaque table : `sync_id` (UUID), `updated_at`, `deleted_at` (soft delete), `sync_status` (0=synced, 1=pending, 2=conflict)
3. Endpoints sync : `POST /sync/push` + `POST /sync/pull`
4. Résolution de conflits : last-write-wins (basé sur updated_at)
5. Sync en arrière-plan quand connecté (toutes les 5-15 min)

### 8.3 Migration des utilisateurs existants

- Les utilisateurs actuels (sans compte en ligne) gardent toutes leurs données locales
- À la première mise à jour, l'app propose de créer un compte (optionnel)
- S'ils créent un compte, un sync initial push toutes les données locales vers le cloud
- S'ils refusent, tout reste en local (plan gratuit)
- Le PIN local est conservé dans tous les cas

## 9. Identifiants du projet

- **Bundle ID :** com.brianjordy.sikaapp
- **EAS Project ID :** 5f0eb089-138c-4a0d-84d1-430a292781aa
- **Scheme :** sikaapp
- **Domaine :** sika-app.org (Namecheap)
- **API production :** https://api.sika-app.org
- **Site vitrine :** https://sika-app.org
- **Hébergement :** VPS Contabo (Nginx + PM2 + Let's Encrypt)
- **Ancien hébergement :** Render (suspendu)

## 10. Décisions architecturales

| Décision | Choix | Raison |
|---|---|---|
| Base locale | SQLite (expo-sqlite) | Offline-first, performant, pas de serveur requis |
| Montants | INTEGER (FCFA) | Pas de décimales en FCFA, évite les erreurs de float |
| Migrations | PRAGMA user_version + Record<number, string[]> | Simple, incrémental, compatible expo-sqlite |
| Notifications | expo-notifications avec triggers DATE/DAILY | Push locales sans serveur |
| Gamification | Stockée en local (badges, XP, missions) | Pas besoin de sync, recalculable |
| State management | Zustand (toasts uniquement) | Léger, le reste est en state local React |
| Animations | react-native-reanimated | Performant, animations sur le thread UI |
| BottomSheet | Custom (Pan gesture sur handle seulement) | Évite les conflits TextInput/scroll |
| CircularProgressBar | react-native-svg (remplacé Skia) | Skia v2+ nécessite NitroModules → crash Expo Go |
| Cloud auth | Phone + password via backend Node (sans OTP) | Pas de budget Twilio, OTP ajouté en v2 |
| Sync | Push/pull via sika-app-node → Supabase | Backend centralisé, RLS par user_id |

## 11. Cloud sync (implémenté — session 2026-05-04)

### 11.1 Fichiers créés

| Fichier | Rôle |
|---|---|
| `src/services/cloud/api.ts` | Client HTTP avec refresh JWT automatique (préventif -5min + retry 401) |
| `src/services/cloud/authService.ts` | register/login/logout/getCloudProfile |
| `src/services/cloud/syncService.ts` | fullSync() : push sync_status=1 → pull depuis serveur |
| `hooks/useIsPro.ts` | Lit plan + plan_expires_at depuis SQLite, se rafraîchit au focus |
| `app/(screens)/CloudSignup.tsx` | Écran inscription/connexion (phone + email optionnel + password) |

### 11.2 DB_VERSION = 3

Colonnes ajoutées sur `user_profile` : `cloud_user_id`, `cloud_phone`, `cloud_email`, `access_token`, `refresh_token`, `token_expires_at`, `plan`, `plan_expires_at`, `last_sync_at`, `device_id`.

Colonnes ajoutées sur toutes les tables syncables : `sync_id` (UUID auto-généré), `sync_status` (0=synced, 1=pending), `updated_at`, `deleted_at`.

**Important :** `migrate()` dans `src/db/index.ts` ignore les erreurs "duplicate column name" (idempotent).

### 11.3 Backend (sika-app-node)

Endpoints ajoutés :
- `POST /auth/register/phone-password` — phone + password + name + email? (sans OTP)
- `POST /auth/login/phone-password` — connexion par téléphone + password

### 11.4 URL dev

`API_BASE` dans `src/services/cloud/api.ts` → `http://192.168.1.102:3000` (IP locale, à ajuster).

### 11.5 Flux utilisateur

- **Nouvel utilisateur** : après création profil PIN → redirigé vers CloudSignup → "Plus tard" ou inscription → `/(tabs)` via `router.replace`
- **Utilisateur existant** : migration 3 transparente, section "☁️ Sync cloud" dans Paramètres

## 12. Bugs corrigés — session 2026-05-04

| Bug | Cause | Fix |
|---|---|---|
| Écran noir au lancement | Race condition : 2e useEffect lit user_profile avant migrate() | `useEffect(..., [ready])` — attend que la DB soit prête |
| MMKV crash Expo Go | NitroModules non supportés, import au niveau module | `require()` dynamique dans try/catch |
| Migration "duplicate column" | Migration partiellement appliquée, user_version non mis à jour | try/catch par step dans migrate(), ignore "duplicate column name" |
| CircularProgressBar crash Expo Go | Skia v2+ utilise NitroModules → Canvas fail | Remplacement par react-native-svg |
| CircularProgressBar NaN/Infinity | Division par zéro dans les stats passée à Skia | `Number.isFinite()` + clamp avant rendu |
| `Skia.Path.Make()` hors useMemo | Objet natif non initialisé au premier render | useMemo (puis remplacé par SVG) |
| Double calcul `calculatePercentage` | Appelée 2× dans les props de CircularProgressBar (DetailGoal.tsx) | IIFE pour calculer une seule fois |
| CloudSignup → router.back() bloquait sur PIN | `back()` revenait à l'écran PIN au lieu des tabs | `router.replace("/(tabs)")` partout |
| JSON Parse error inscription | Backend pas redémarré → Express renvoyait HTML 404 | `safeJson()` + message d'erreur lisible |
| Badges sans condition | checkBudgetBadges/checkGoalBadges/checkNoSpendDayBadge déclenchaient sans vérifier | Ajout COUNT checks et vérification transactions du jour |
| Alerte récurrence oubliée manquante | catchup.ts créait la queue mais pas de notification | `checkOverdueRecurringPayments()` dans eodHandlers |
| Alertes budget 80%/100% manquaient les sauts | condition `ratio < 1.0` bloquait si on sautait direct à 110% | `checkBudgetThresholdAlerts()` avec comparaison avant/après tx |

## 13. Nouvelles fonctionnalités (session 2026-05-06)

| Fonctionnalité | Fichier | Notes |
|---|---|---|
| Multi-monnaies Pro | `src/services/currency/currencyService.ts` | XOF/XAF/USD/EUR, cache SQLite 24h, fallback taux fixes, DB_VERSION=4 |
| Rapport mensuel HTML | `src/services/reports/reportService.ts` | `generateMonthlyPDF()` + `generateShareCard()`, expo-file-system + expo-sharing |
| EAS OTA Updates | `app.json` + `eas.json` | channel production/preview/development, policy appVersion |
| Score financier | `src/services/stats/financeScore.ts` | Audit effectué, formules documentées, TODO améliorer UI (tâche #13 en attente) |

### Notes importantes
- **expo-print non installé** : `reportService.ts` utilise expo-file-system (génère HTML). Pour vrai PDF : `npx expo install expo-print` puis adapter le service.
- **currency_rates** : stocké en JSON dans `user_profile.currency_rates` (migration 4).
- **EAS OTA** : pour publier une update : `eas update --channel production --message "Fix bugs"`

## 14. Fix sync complet (session 2026-05-12)

### Problèmes identifiés et corrigés

| Problème | Cause | Fix |
|---|---|---|
| Données manquantes après sync | Ordre des tables non garanti — enfants pullés avant parents, FK non résolvable → skip silencieux | Tables ordonnées parent→enfant : categories, saving_goals, recurring_payments, transactions, budgets, goal_*, closures |
| Premier sync sur nouvel appareil incomplet | Pull avec `neq("device_id")` filtrait les données même quand `last_sync_at=null` | Filtre `neq(device_id)` appliqué UNIQUEMENT en sync incrémental (quand `last_sync_at` est fourni) |
| Données tronquées sur gros volumes | Supabase limite à 1000 lignes par requête, pas de pagination | Ajout boucle de pagination avec `range(from, from+PAGE_SIZE-1)` et `count: "exact"` |
| Push lent et fragile | Chaque row envoyé individuellement en upsert | Batch upsert (toutes les rows d'une table en une seule requête), fallback un par un si le batch échoue |
| Soft-deletes ignorés au pull | Enregistrements avec `deleted_at` pullés mais pas supprimés localement | Si `deleted_at` est set, `DELETE FROM table WHERE sync_id = ?` localement |
| Timing last_sync_at | `synced_at` calculé après le pull → fenêtre de perte de données | `synced_at` calculé AVANT de lire les données côté serveur |
| Erreurs d'insertion silencieuses | `.catch(() => {})` masquait les erreurs | Erreurs propagées et loguées dans le résultat de sync |

### Fichiers modifiés

| Fichier | Changements |
|---|---|
| `sika-app-node/src/routes/sync.ts` | Ordre des tables, batch upsert, pagination pull, timing synced_at, gestion soft-delete |
| `sika-app/src/services/cloud/syncService.ts` | Ordre parent→enfant, gestion soft-delete au pull, erreurs non silencieuses, batch update sync_status |
