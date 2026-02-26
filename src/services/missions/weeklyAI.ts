import { all, getOne, runSql } from "@/src/db";
import { getWeekKey } from "@/src/services/missions/weekly"; // ton getWeekKey
import { toYYYYMMDD } from "@/src/utils/date";

type Profile = {
  periodDays: number;
  spendDays: number;
  txDays: number;
  noTxDays: number;
  totalSpend: number;
  totalIncome: number;
  totalSaving: number;
  avgDailySpend: number;
  irregularityScore: number; // 0..1
};

type MissionTemplate = {
  title: string;
  description: string;
  goal_amount: number;
  reward_xp: number;
  reward_coins: number;
  ai_reason: string;
};

type BoostTemplate = {
  code: string;
  title: string;
  description: string;
  goal_amount: number;
  reward_xp: number;
  reward_coins: number;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

async function buildProfile(days = 28, todayISO?: string): Promise<Profile> {
  const today = todayISO ?? toYYYYMMDD(new Date());

  // jours avec transaction
  const txDaysRow = await getOne<{ c: number }>(
    `
    SELECT COUNT(*) as c FROM (
      SELECT date FROM transactions
      WHERE date >= date(?, ?)
        AND date <= date(?)
      GROUP BY date
    )
    `,
    [today, `-${days - 1} day`, today],
  );
  const txDays = Number(txDaysRow?.c ?? 0);

  // jours avec dépense
  const spendDaysRow = await getOne<{ c: number }>(
    `
    SELECT COUNT(*) as c FROM (
      SELECT date FROM transactions
      WHERE type='depense'
        AND date >= date(?, ?)
        AND date <= date(?)
      GROUP BY date
    )
    `,
    [today, `-${days - 1} day`, today],
  );

  // totaux
  const totals = await getOne<{
    spend: number;
    income: number;
  }>(
    `
    SELECT
      COALESCE(SUM(CASE WHEN type='depense' THEN amount END),0) as spend,
      COALESCE(SUM(CASE WHEN type='entree' THEN amount END),0) as income
    FROM transactions
    WHERE date >= date(?, ?)
      AND date <= date(?)
    `,
    [today, `-${days - 1} day`, today],
  );

  // total épargne (goal_contributions)
  const savingRow = await getOne<{ total: number }>(
    `
    SELECT COALESCE(SUM(amount),0) as total
    FROM goal_contributions
    WHERE date >= date(?, ?)
      AND date <= date(?)
    `,
    [today, `-${days - 1} day`, today],
  );

  const spendDays = Number(spendDaysRow?.c ?? 0);
  const totalSpend = Number(totals?.spend ?? 0);
  const totalIncome = Number(totals?.income ?? 0);
  const totalSaving = Number(savingRow?.total ?? 0);

  const noTxDays = Math.max(0, days - txDays);
  const avgDailySpend = totalSpend / days;

  // irrégularité : si beaucoup de jours sans transaction => score monte
  const irregularityScore = clamp(noTxDays / days, 0, 1);

  return {
    periodDays: days,
    spendDays,
    txDays,
    noTxDays,
    totalSpend,
    totalIncome,
    totalSaving,
    avgDailySpend,
    irregularityScore,
  };
}

/** Choix de mission + boosts en fonction du profil */
function chooseMissionAndBoosts(profile: Profile): {
  mission: MissionTemplate;
  boosts: BoostTemplate[];
  ai_profile: any;
} {
  const ai_profile = profile;

  // Base difficulté (1..3)
  const difficulty =
    profile.totalSaving === 0 ? 1 : profile.irregularityScore > 0.45 ? 1 : 2;

  // 1) priorité : si tu n’épargnes jamais => mission épargne
  if (profile.totalSaving === 0) {
    const base = difficulty === 1 ? 5000 : 8000;

    return {
      mission: {
        title: "Mission de la semaine",
        description: `Épargner ${base.toLocaleString("fr-FR")} FCFA cette semaine (objectif démarrage).`,
        goal_amount: base,
        reward_xp: 90,
        reward_coins: 3,
        ai_reason:
          "Tu n’as pas épargné récemment. On commence simple pour créer l’habitude.",
      },
      boosts: [
        {
          code: "BOOST_NO_SPEND_DAY",
          title: "Boost: 1 journée sans dépense",
          description: "Choisis un jour et fais 0 dépense.",
          goal_amount: 1,
          reward_xp: 40,
          reward_coins: 1,
        },
        {
          code: "BOOST_EXTRA_SAVE",
          title: "Boost: +2 000 FCFA",
          description: "Bonus d’épargne pour accélérer ton objectif.",
          goal_amount: 2000,
          reward_xp: 50,
          reward_coins: 1,
        },
      ],
      ai_profile,
    };
  }

  // 2) si tu dépenses trop souvent (beaucoup de jours avec dépense)
  const spendRate = profile.spendDays / profile.periodDays;
  if (spendRate >= 0.6) {
    const targetNoSpendDays = difficulty === 1 ? 2 : 3;

    return {
      mission: {
        title: "Mission de la semaine",
        description: `Faire ${targetNoSpendDays} journée(s) sans dépense cette semaine.`,
        goal_amount: targetNoSpendDays,
        reward_xp: 100,
        reward_coins: 3,
        ai_reason:
          "Tu dépenses beaucoup de jours. On travaille le contrôle avec des journées sans dépense.",
      },
      boosts: [
        {
          code: "BOOST_SAVE_SMALL",
          title: "Boost: Épargne mini",
          description: "Épargner au moins 2 000 FCFA (même petit).",
          goal_amount: 2000,
          reward_xp: 40,
          reward_coins: 1,
        },
        {
          code: "BOOST_LOG_DAILY",
          title: "Boost: Régularité",
          description: "Ajouter au moins 1 transaction sur 3 jours.",
          goal_amount: 3, // 3 jours
          reward_xp: 40,
          reward_coins: 1,
        },
      ],
      ai_profile,
    };
  }

  // 3) si tu es irrégulier (beaucoup de jours sans transaction)
  if (profile.irregularityScore >= 0.4) {
    const days = difficulty === 1 ? 3 : 5;

    return {
      mission: {
        title: "Mission de la semaine",
        description: `Être régulier : enregistrer au moins 1 transaction sur ${days} jour(s).`,
        goal_amount: days,
        reward_xp: 90,
        reward_coins: 3,
        ai_reason:
          "Tu es irrégulier. On te pousse à suivre tes finances avec une mission de discipline.",
      },
      boosts: [
        {
          code: "BOOST_NO_SPEND_DAY",
          title: "Boost: 1 journée sans dépense",
          description: "Zéro dépense sur 1 journée.",
          goal_amount: 1,
          reward_xp: 35,
          reward_coins: 1,
        },
        {
          code: "BOOST_EXTRA_SAVE",
          title: "Boost: +2 000 FCFA",
          description: "Bonus épargne cette semaine.",
          goal_amount: 2000,
          reward_xp: 45,
          reward_coins: 1,
        },
      ],
      ai_profile,
    };
  }

  // 4) profil OK => mission épargne un peu plus ambitieuse
  const base = profile.totalSaving > 0 ? 8000 : 5000;

  return {
    mission: {
      title: "Mission de la semaine",
      description: `Épargner ${base.toLocaleString("fr-FR")} FCFA cette semaine.`,
      goal_amount: base,
      reward_xp: 90,
      reward_coins: 3,
      ai_reason:
        "Tu progresses déjà. On augmente un peu l’objectif pour accélérer.",
    },
    boosts: [
      {
        code: "BOOST_NO_SPEND_DAY",
        title: "Boost: 1 journée sans dépense",
        description: "Zéro dépense sur 1 journée.",
        goal_amount: 1,
        reward_xp: 35,
        reward_coins: 1,
      },
      {
        code: "BOOST_EXTRA_SAVE",
        title: "Boost: +3 000 FCFA",
        description: "Bonus d’épargne plus fort.",
        goal_amount: 3000,
        reward_xp: 55,
        reward_coins: 1,
      },
    ],
    ai_profile,
  };
}

/**
 * Génère mission + boosts IA si absent pour la semaine.
 * Appelle ça dans Home / Objectifs / au démarrage.
 */
export async function ensureWeeklyPackAI() {
  const week_key = getWeekKey(new Date());

  let mission = await getOne<any>(
    `SELECT * FROM weekly_missions WHERE week_key=? ORDER BY id DESC LIMIT 1`,
    [week_key],
  );

  if (mission) {
    const boosts = await all<any>(
      `SELECT * FROM weekly_boosts WHERE mission_id=? ORDER BY id ASC`,
      [mission.id],
    );
    return { mission, boosts };
  }

  // expire anciennes missions actives
  await runSql(
    `UPDATE weekly_missions SET status='expired' WHERE status='active' AND week_key <> ?`,
    [week_key],
  );

  const profile = await buildProfile(28);
  const pick = chooseMissionAndBoosts(profile);

  await runSql(
    `INSERT INTO weekly_missions (week_key,title,description,goal_amount,reward_xp,reward_coins,status,ai_reason,ai_profile)
     VALUES (?,?,?,?,?,?, 'active', ?, ?)`,
    [
      week_key,
      pick.mission.title,
      pick.mission.description,
      pick.mission.goal_amount,
      pick.mission.reward_xp,
      pick.mission.reward_coins,
      pick.mission.ai_reason,
      JSON.stringify(pick.ai_profile),
    ],
  );

  mission = await getOne<any>(
    `SELECT * FROM weekly_missions WHERE week_key=? ORDER BY id DESC LIMIT 1`,
    [week_key],
  );

  for (const b of pick.boosts) {
    await runSql(
      `INSERT OR IGNORE INTO weekly_boosts
       (mission_id,code,title,description,goal_amount,reward_xp,reward_coins,status)
       VALUES (?,?,?,?,?,?,?, 'active')`,
      [
        mission.id,
        b.code,
        b.title,
        b.description,
        b.goal_amount,
        b.reward_xp,
        b.reward_coins,
      ],
    );
  }

  const boosts = await all<any>(
    `SELECT * FROM weekly_boosts WHERE mission_id=? ORDER BY id ASC`,
    [mission.id],
  );

  return { mission, boosts };
}
