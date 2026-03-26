// ============================================================
//  db.js  –  Supabase-Client & Datenbankabfragen
//  Wird als erstes Script geladen, vor charts.js und logic.js
// ============================================================

const { createClient } = supabase;

const SUPABASE_URL      = 'https://DEINE-URL.supabase.co';   // ← anpassen
const SUPABASE_ANON_KEY = 'DEIN-ANON-KEY';                   // ← anpassen

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ── Hilfsfunktion: Fehler einheitlich behandeln ────────────
function handleError(label, error) {
    console.error(`[DB] ${label}:`, error.message);
    return null;
}


// ── Alle einzigartigen Encounter einer Gruppe ──────────────
// Gibt ein Array von { fight_name } zurück, sortiert alphabetisch.
async function fetchEncountersByGroup(groupName) {
    const { data, error } = await db
        .from('logs')
        .select('fight_name')
        .eq('group_name', groupName)
        .order('fight_name');

    if (error) return handleError('fetchEncountersByGroup', error);

    // Duplikate entfernen
    const unique = [...new Map(data.map(r => [r.fight_name, r])).values()];
    return unique;
}


// ── Alle Spielernamen eines Encounters (einer Gruppe) ──────
// Gibt ein Array von Strings (player_name) zurück.
async function fetchPlayersByGroupAndEncounter(groupName, fightName) {
    const { data, error } = await db
        .from('players')
        .select('player_name, log:logs!log_id(group_name, fight_name)')
        .eq('log.group_name', groupName)
        .eq('log.fight_name', fightName);

    if (error) return handleError('fetchPlayersByGroupAndEncounter', error);

    const unique = [...new Set(data.map(r => r.player_name))].sort();
    return unique;
}


// ── Hauptabfrage: Alle Daten für Charts ───────────────────
// Gibt ein strukturiertes Objekt zurück, das charts.js direkt
// verwenden kann.
//
// filter = {
//   groupName:   string,
//   fightName:   string,
//   playerNames: string[]   (leeres Array = alle)
// }
async function fetchRaidData(filter) {
    const { groupName, fightName, playerNames } = filter;

    // 1. Passende Logs holen
    const { data: logs, error: logsErr } = await db
        .from('logs')
        .select('id, fight_name, time_start, time_end, duration_ms, success, is_cm, is_lcm')
        .eq('group_name', groupName)
        .eq('fight_name', fightName)
        .order('time_start', { ascending: true });

    if (logsErr) return handleError('fetchRaidData/logs', logsErr);
    if (!logs?.length) return null;

    const logIds = logs.map(l => l.id);

    // 2. Alle Phasen dieser Logs
    const { data: phases, error: phasesErr } = await db
        .from('phases')
        .select('log_id, phase_index, name, duration_ms')
        .in('log_id', logIds)
        .order('phase_index');

    if (phasesErr) return handleError('fetchRaidData/phases', phasesErr);

    // 3. Spieler + alle Stats in einem einzigen Join-Query
    let playerQuery = db
        .from('players')
        .select(`
            id,
            log_id,
            player_name,
            account,
            profession,
            group_nr,
            dps:player_dps (
                phase_index, dps, condi_dps, power_dps, breakbar_damage
            ),
            stats:player_stats (
                phase_index,
                wasted, time_wasted, saved, time_saved,
                stack_dist, dist_to_com,
                avg_active_boons, avg_active_conditions,
                skill_cast_uptime, flanking_rate,
                killed, downed
            ),
            support:player_support (
                phase_index, resurrects, resurrect_time, condi_cleanse, boon_strips
            ),
            defenses:player_defenses (
                phase_index, damage_taken, boon_strips,
                received_crowd_control, received_crowd_control_duration
            )
        `)
        .in('log_id', logIds);

    // Spieler-Filter anwenden (falls nicht alle gewählt)
    if (playerNames?.length > 0) {
        playerQuery = playerQuery.in('player_name', playerNames);
    }

    const { data: players, error: playersErr } = await playerQuery;
    if (playersErr) return handleError('fetchRaidData/players', playersErr);

    // 4. Alles zusammenführen
    return buildDataModel(logs, phases, players);
}


// ── Datenmodell aufbauen ──────────────────────────────────
// Wandelt die flachen DB-Ergebnisse in ein Chart-freundliches
// Modell um.
//
// Rückgabe:
// {
//   logs: [...],
//   phaseNames:     { [logId]: { [phase_index]: name } },
//   phaseDurations: { [logId]: { [phase_index]: duration_ms } },
//   players: [
//     {
//       player_name, account, profession,
//       logId,
//       dps:      { [phase_index]: { dps, condi_dps, power_dps, breakbar_damage } },
//       stats:    { [phase_index]: { ... } },
//       support:  { [phase_index]: { ... } },
//       defenses: { [phase_index]: { ... } },
//     }
//   ]
// }
function buildDataModel(logs, phases, players) {
    // phase_index → Name pro Log
    // phase_index → duration_ms pro Log
    const phaseNames     = {};
    const phaseDurations = {};

    for (const p of phases) {
        if (!phaseNames[p.log_id])     phaseNames[p.log_id]     = {};
        if (!phaseDurations[p.log_id]) phaseDurations[p.log_id] = {};

        phaseNames[p.log_id][p.phase_index]     = p.name;
        phaseDurations[p.log_id][p.phase_index] = p.duration_ms;
    }

    // Spieler-Daten indexieren: Array → { [phase_index]: Objekt }
    const indexByPhase = (arr) =>
        Object.fromEntries((arr ?? []).map(row => [row.phase_index, row]));

    const playersModel = players.map(p => ({
        player_name: p.player_name,
        account:     p.account,
        profession:  p.profession,
        logId:       p.log_id,
        dps:         indexByPhase(p.dps),
        stats:       indexByPhase(p.stats),
        support:     indexByPhase(p.support),
        defenses:    indexByPhase(p.defenses),
    }));

    return { logs, phaseNames, phaseDurations, players: playersModel };
}