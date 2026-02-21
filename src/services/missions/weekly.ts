import { all, getOne, runSql } from "@/src/db";

export type WeeklyMission = {
  id: number;
  week_key: string;
  title: string;
  description: string;
  goal_amount: number;
  progress_amount: number;
  reward_xp: number;
  reward_coins: number;
  status: "active" | "done" | "expired";
  created_at: string;
};

export type WeeklyBoost = {
  id: number;
  mission_id: number;
  code: string;
  title: string;
  description: string;
  goal_amount: number;
  progress_amount: number;
  reward_xp: number;
  reward_coins: number;
  status: "active" | "done" | "expired";
  created_at: string;
};

export type WeeklyPack = {
  mission: WeeklyMission;
  boosts: WeeklyBoost[];
};

/** "YYYY-W##" */
export function getWeekKey(date = new Date()) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  const yy = d.getUTCFullYear();
  const ww = String(weekNo).padStart(2, "0");
  return `${yy}-W${ww}`;
}

function buildMission(week_key: string, minWeekly: number) {
  const base = Math.max(1000, minWeekly);
  return {
    week_key,
    title: "Mission de la semaine",
    description: `Épargner ${base.toLocaleString("fr-FR")} FCFA minimum cette semaine.`,
    goal_amount: base,
    reward_xp: 80,
    reward_coins: 3,
  };
}

function buildBoosts() {
  // 2 boosts simples (tu peux en ajouter plus tard)
  return [
    {
      code: "BOOST_EXTRA_SAVE",
      title: "Boost: +2 000 FCFA",
      description: "Accélère ton objectif principal avec un effort bonus.",
      goal_amount: 2000,
      reward_xp: 50,
      reward_coins: 1,
    },
    {
      code: "BOOST_NO_SPEND_DAY",
      title: "Boost: 1 journée sans dépense",
      description: "Aujourd’hui, fais 0 dépense. (1 fois dans la semaine)",
      goal_amount: 1, // on compte en "jours validés"
      reward_xp: 40,
      reward_coins: 1,
    },
  ] as const;
}

/** crée mission+boosts si absent */
export async function ensureWeeklyPack(minWeekly: number): Promise<WeeklyPack> {
  const week_key = getWeekKey(new Date());

  let mission = await getOne<WeeklyMission>(
    `SELECT * FROM weekly_missions WHERE week_key=? ORDER BY id DESC LIMIT 1`,
    [week_key],
  );

  if (!mission) {
    // expire anciennes missions
    await runSql(
      `UPDATE weekly_missions SET status='expired' WHERE status='active' AND week_key <> ?`,
      [week_key],
    );

    const m = buildMission(week_key, minWeekly);
    await runSql(
      `INSERT INTO weekly_missions (week_key,title,description,goal_amount,reward_xp,reward_coins,status)
       VALUES (?,?,?,?,?,?, 'active')`,
      [
        m.week_key,
        m.title,
        m.description,
        m.goal_amount,
        m.reward_xp,
        m.reward_coins,
      ],
    );

    mission = await getOne<WeeklyMission>(
      `SELECT * FROM weekly_missions WHERE week_key=? ORDER BY id DESC LIMIT 1`,
      [week_key],
    );
  }

  // boosts
  const boosts = await all<WeeklyBoost>(
    `SELECT * FROM weekly_boosts WHERE mission_id=? ORDER BY id ASC`,
    [mission!.id],
  );

  if (boosts.length === 0) {
    for (const b of buildBoosts()) {
      await runSql(
        `INSERT OR IGNORE INTO weekly_boosts
         (mission_id,code,title,description,goal_amount,reward_xp,reward_coins,status)
         VALUES (?,?,?,?,?,?,?, 'active')`,
        [
          mission!.id,
          b.code,
          b.title,
          b.description,
          b.goal_amount,
          b.reward_xp,
          b.reward_coins,
        ],
      );
    }
  }

  const boosts2 = await all<WeeklyBoost>(
    `SELECT * FROM weekly_boosts WHERE mission_id=? ORDER BY id ASC`,
    [mission!.id],
  );

  return { mission: mission!, boosts: boosts2 };
}

export async function getWeeklyPack(minWeekly: number) {
  return ensureWeeklyPack(minWeekly);
}

/**
 * Progression quand l’utilisateur épargne.
 * - la mission principale progresse
 * - le boost "extra save" progresse aussi
 */
export async function onSaving(amount: number, minWeekly: number) {
  const pack = await getWeeklyPack(minWeekly);
  await progressMissionAmount(pack.mission.id, amount);
  await progressBoostAmount(pack.mission.id, "BOOST_EXTRA_SAVE", amount);
  return getWeeklyPack(minWeekly);
}

/**
 * Boost "no spend day"
 * Appelle ça une fois par jour (ex: quand tu affiches Home)
 * si aucune dépense aujourd’hui => valide le boost (1/1)
 */
export async function onNoSpendDayValidated(minWeekly: number) {
  const pack = await getWeeklyPack(minWeekly);

  const boost = pack.boosts.find((b) => b.code === "BOOST_NO_SPEND_DAY");
  if (!boost || boost.status !== "active") return pack;

  // juste set progress=1
  await runSql(
    `UPDATE weekly_boosts SET progress_amount=?, status='done' WHERE id=?`,
    [1, boost.id],
  );

  // ici tu branches tes rewards
  // await addXP(boost.reward_xp); await addCoins(boost.reward_coins);

  return getWeeklyPack(minWeekly);
}

/** helpers */
async function progressMissionAmount(missionId: number, amount: number) {
  const mission = await getOne<WeeklyMission>(
    `SELECT * FROM weekly_missions WHERE id=?`,
    [missionId],
  );
  if (!mission || mission.status !== "active") return;

  const inc = Math.max(0, amount);
  const next = Math.min(mission.goal_amount, mission.progress_amount + inc);

  await runSql(`UPDATE weekly_missions SET progress_amount=? WHERE id=?`, [
    next,
    missionId,
  ]);

  if (next >= mission.goal_amount) {
    await runSql(`UPDATE weekly_missions SET status='done' WHERE id=?`, [
      missionId,
    ]);
    // rewards mission ici
    // await addXP(mission.reward_xp); await addCoins(mission.reward_coins);
  }
}

async function progressBoostAmount(
  missionId: number,
  code: string,
  amount: number,
) {
  const boost = await getOne<WeeklyBoost>(
    `SELECT * FROM weekly_boosts WHERE mission_id=? AND code=? LIMIT 1`,
    [missionId, code],
  );

  if (!boost || boost.status !== "active") return;

  const inc = Math.max(0, amount);
  const next = Math.min(boost.goal_amount, boost.progress_amount + inc);

  await runSql(`UPDATE weekly_boosts SET progress_amount=? WHERE id=?`, [
    next,
    boost.id,
  ]);

  if (next >= boost.goal_amount) {
    await runSql(`UPDATE weekly_boosts SET status='done' WHERE id=?`, [
      boost.id,
    ]);
    // rewards boost ici
    // await addXP(boost.reward_xp); await addCoins(boost.reward_coins);
  }
}
