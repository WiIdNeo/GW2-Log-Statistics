// ============================================================
//  charts.js  –  Dynamische Chart-Generierung
//  Abhängigkeit: Chart.js muss vorher geladen sein.
// ============================================================


// ════════════════════════════════════════════════════════════
//  INFRASTRUKTUR
// ════════════════════════════════════════════════════════════

// ── Chart-Registry ────────────────────────────────────────
// Zentrale Map aller aktiven Chart-Instanzen.
// Key: canvasId (string) → Value: Chart-Instanz
const chartRegistry = new Map();


// ── Einen Chart erstellen oder neu rendern ─────────────────
function createChart(canvasId, type, data, options = {}) {
    if (chartRegistry.has(canvasId)) {
        chartRegistry.get(canvasId).destroy();
        chartRegistry.delete(canvasId);
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.warn(`[Charts] Canvas #${canvasId} nicht gefunden.`);
        return null;
    }

    const instance = new Chart(canvas, {
        type,
        data,
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            ...options,
        },
    });

    chartRegistry.set(canvasId, instance);
    return instance;
}


// ── Alle Charts und Canvas-Elemente entfernen ──────────────
function clearAllCharts() {
    chartRegistry.forEach(chart => chart.destroy());
    chartRegistry.clear();
    document.getElementById('charts-container').innerHTML = '';
}


// ── Canvas-Section dynamisch erzeugen ─────────────────────
function addChartSection(title, canvasId) {
    const container = document.getElementById('charts-container');

    const section = document.createElement('section');
    section.className = 'chart-section';

    const heading = document.createElement('h2');
    heading.textContent = title;

    const canvas = document.createElement('canvas');
    canvas.id = canvasId;

    section.appendChild(heading);
    section.appendChild(canvas);
    container.appendChild(section);

    return canvasId;
}


// ── Farb-Palette ──────────────────────────────────────────
const PALETTE = [
    '#4e79a7', '#f28e2b', '#e15759', '#76b7b2',
    '#59a14f', '#edc948', '#b07aa1', '#ff9da7',
    '#9c755f', '#bab0ac',
];
function paletteColor(index) {
    return PALETTE[index % PALETTE.length];
}


// ── Phasennamen für einen Log auflösen ─────────────────────
// Gibt Labels sortiert nach phase_index zurück.
// Fallback: "Phase N" wenn kein Name vorhanden.
function resolvePhaseLabels(phaseNames, logId) {
    const map = phaseNames[logId] ?? {};
    return Object.entries(map)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([idx, name]) => name || `Phase ${idx}`);
}

// ── Alle phase_indices eines Logs als sortiertes Zahlen-Array ──
function resolvePhaseIndices(phaseNames, logId) {
    return Object.keys(phaseNames[logId] ?? {})
        .map(Number)
        .sort((a, b) => a - b);
}

// ── Datums-Label für einen Log ─────────────────────────────
function logDateLabel(log) {
    return new Date(log.time_start).toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', year: '2-digit',
    });
}


// ════════════════════════════════════════════════════════════
//  DATASET-BUILDER
// ════════════════════════════════════════════════════════════

// ── Pro-Phase-Datasets (ein Dataset pro Spieler, X = Phasen) ──
// Für Charts die einen einzelnen Log zeigen.
// accessor: (playerObj, phaseIndex) => number | null
function buildPerPhaseDatasets(data, logId, accessor) {
    const phaseIndices = resolvePhaseIndices(data.phaseNames, logId);

    const datasets = data.players
        .filter(p => p.logId === logId)
        .map((player, i) => ({
            label:           player.player_name,
            data:            phaseIndices.map(idx => accessor(player, idx) ?? null),
            borderColor:     paletteColor(i),
            backgroundColor: paletteColor(i) + '33',
            tension:         0.3,
            spanGaps:        true,   // innerhalb eines Logs: Lücke überbrücken
        }));

    return datasets;
}


// ── Cross-Log-Datasets (ein Dataset pro Spieler, X = Logs) ──
// Für Trend-Charts über mehrere Logs hinweg.
// accessor: (playerObj) => number | null   (kein phase_index, Aufrufer wählt Phase)
// Spieler fehlt in einem Log → null → Lücke in der Linie (spanGaps: false)
function buildCrossLogDatasets(data, accessor) {
    // Alle Spielernamen über alle Logs sammeln, alphabetisch sortieren
    const allNames = [...new Set(data.players.map(p => p.player_name))].sort();

    const labels = data.logs.map(logDateLabel);

    const datasets = allNames.map((name, i) => ({
        label:           name,
        borderColor:     paletteColor(i),
        backgroundColor: paletteColor(i) + '33',
        tension:         0.3,
        spanGaps:        false,   // fehlender Spieler → Lücke, kein Überbrücken
        data: data.logs.map(log => {
            const player = data.players.find(
                p => p.player_name === name && p.logId === log.id
            );
            if (!player) return null;   // nicht dabei → Lücke
            return accessor(player) ?? null;
        }),
    }));

    return { labels, datasets };
}


// ── Tooltip-Callback für Cross-Log-Charts ─────────────────
// Zeigt "nicht dabei" statt leerem Tooltip bei null-Werten.
function crossLogTooltip(unit = '') {
    return {
        plugins: {
            tooltip: {
                callbacks: {
                    label: ctx =>
                        ctx.raw === null
                            ? `${ctx.dataset.label}: nicht dabei`
                            : `${ctx.dataset.label}: ${ctx.raw.toLocaleString()}${unit ? ' ' + unit : ''}`,
                },
            },
        },
    };
}


// ════════════════════════════════════════════════════════════
//  CHART-RENDER-FUNKTIONEN
//  Jede Gruppe hat:
//    render*Charts(data)      → pro Log einen Chart (X = Phasen)
//    render*TrendChart(data)  → ein Chart über alle Logs (X = Datum)
// ════════════════════════════════════════════════════════════

// ── DPS (gesamt) ──────────────────────────────────────────
function renderDpsCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `dps_chart_${i}`;
        addChartSection(`DPS – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'line', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.dps[idx]?.dps),
        });
    });
}

function renderDpsTrendChart(data) {
    const id = 'dps_trend_chart';
    addChartSection('DPS Trend über Zeit', id);
    const { labels, datasets } = buildCrossLogDatasets(
        data, p => p.dps[0]?.dps ?? null   // Phase 0 = Gesamtphase
    );
    createChart(id, 'line', { labels, datasets }, crossLogTooltip('DPS'));
}


// ── Condition DPS ─────────────────────────────────────────
function renderCondiDpsCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `condi_dps_chart_${i}`;
        addChartSection(`Condition DPS – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'line', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.dps[idx]?.condi_dps),
        });
    });
}

function renderCondiDpsTrendChart(data) {
    const id = 'condi_dps_trend_chart';
    addChartSection('Condition DPS Trend über Zeit', id);
    const { labels, datasets } = buildCrossLogDatasets(
        data, p => p.dps[0]?.condi_dps ?? null
    );
    createChart(id, 'line', { labels, datasets }, crossLogTooltip('DPS'));
}


// ── Power DPS ─────────────────────────────────────────────
function renderPowerDpsCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `power_dps_chart_${i}`;
        addChartSection(`Power DPS – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'line', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.dps[idx]?.power_dps),
        });
    });
}

function renderPowerDpsTrendChart(data) {
    const id = 'power_dps_trend_chart';
    addChartSection('Power DPS Trend über Zeit', id);
    const { labels, datasets } = buildCrossLogDatasets(
        data, p => p.dps[0]?.power_dps ?? null
    );
    createChart(id, 'line', { labels, datasets }, crossLogTooltip('DPS'));
}


// ── Breakbar Damage (CC) ──────────────────────────────────
function renderBreakbarCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `breakbar_chart_${i}`;
        addChartSection(`Breakbar Damage – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'bar', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.dps[idx]?.breakbar_damage),
        });
    });
}

function renderBreakbarTrendChart(data) {
    const id = 'breakbar_trend_chart';
    addChartSection('Breakbar Damage Trend über Zeit', id);
    const { labels, datasets } = buildCrossLogDatasets(
        data, p => p.dps[0]?.breakbar_damage ?? null
    );
    createChart(id, 'line', { labels, datasets }, crossLogTooltip());
}


// ── Damage Taken ──────────────────────────────────────────
function renderDamageTakenCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `dmg_taken_chart_${i}`;
        addChartSection(`Damage Taken – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'line', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.defenses[idx]?.damage_taken),
        });
    });
}

function renderDamageTakenTrendChart(data) {
    const id = 'dmg_taken_trend_chart';
    addChartSection('Damage Taken Trend über Zeit', id);
    const { labels, datasets } = buildCrossLogDatasets(
        data, p => p.defenses[0]?.damage_taken ?? null
    );
    createChart(id, 'line', { labels, datasets }, crossLogTooltip());
}


// ── Received CC ───────────────────────────────────────────
function renderReceivedCcCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `recv_cc_chart_${i}`;
        addChartSection(`Received CC – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'bar', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.defenses[idx]?.received_crowd_control),
        });
    });
}

function renderReceivedCcTrendChart(data) {
    const id = 'recv_cc_trend_chart';
    addChartSection('Received CC Trend über Zeit', id);
    const { labels, datasets } = buildCrossLogDatasets(
        data, p => p.defenses[0]?.received_crowd_control ?? null
    );
    createChart(id, 'line', { labels, datasets }, crossLogTooltip());
}


// ── Received CC Duration ──────────────────────────────────
function renderReceivedCcDurationCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `recv_cc_dur_chart_${i}`;
        addChartSection(`Received CC Duration – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'bar', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.defenses[idx]?.received_crowd_control_duration),
        });
    });
}


// ── Wasted Casts ─────────────────────────────────────────
function renderWastedCastsCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `wasted_chart_${i}`;
        addChartSection(`Wasted Casts – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'bar', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.stats[idx]?.wasted),
        });
    });
}


// ── Saved Casts ───────────────────────────────────────────
function renderSavedCastsCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `saved_chart_${i}`;
        addChartSection(`Saved Casts – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'bar', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.stats[idx]?.saved),
        });
    });
}


// ── Stack Distance ────────────────────────────────────────
function renderStackDistCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `stack_dist_chart_${i}`;
        addChartSection(`Stack Distance – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'line', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.stats[idx]?.stack_dist),
        });
    });
}

function renderStackDistTrendChart(data) {
    const id = 'stack_dist_trend_chart';
    addChartSection('Stack Distance Trend über Zeit', id);
    const { labels, datasets } = buildCrossLogDatasets(
        data, p => p.stats[0]?.stack_dist ?? null
    );
    createChart(id, 'line', { labels, datasets }, crossLogTooltip());
}


// ── Distance to Commander ─────────────────────────────────
function renderDistToComCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `dist_com_chart_${i}`;
        addChartSection(`Distance to Commander – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'line', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.stats[idx]?.dist_to_com),
        });
    });
}


// ── Avg Active Boons ──────────────────────────────────────
function renderAvgActiveBoonsCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `avg_boons_chart_${i}`;
        addChartSection(`Avg Active Boons – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'line', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.stats[idx]?.avg_active_boons),
        });
    });
}


// ── Avg Active Conditions ─────────────────────────────────
function renderAvgActiveConditionsCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `avg_conditions_chart_${i}`;
        addChartSection(`Avg Active Conditions – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'line', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.stats[idx]?.avg_active_conditions),
        });
    });
}


// ── Skill Cast Uptime ─────────────────────────────────────
function renderCastUptimeCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `cast_uptime_chart_${i}`;
        addChartSection(`Skill Cast Uptime – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'line', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.stats[idx]?.skill_cast_uptime),
        });
    });
}


// ── Flanking Rate ─────────────────────────────────────────
function renderFlankingRateCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `flanking_chart_${i}`;
        addChartSection(`Flanking Rate – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'bar', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.stats[idx]?.flanking_rate),
        });
    });
}


// ── Downs ─────────────────────────────────────────────────
function renderDownsCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `downs_chart_${i}`;
        addChartSection(`Downs – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'bar', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.stats[idx]?.downed),
        });
    });
}

function renderDownsTrendChart(data) {
    const id = 'downs_trend_chart';
    addChartSection('Downs Trend über Zeit', id);
    const { labels, datasets } = buildCrossLogDatasets(
        data, p => p.stats[0]?.downed ?? null
    );
    createChart(id, 'line', { labels, datasets }, crossLogTooltip());
}


// ── Deaths ────────────────────────────────────────────────
function renderDeathsCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `deaths_chart_${i}`;
        addChartSection(`Deaths – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'bar', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.stats[idx]?.killed),
        });
    });
}

function renderDeathsTrendChart(data) {
    const id = 'deaths_trend_chart';
    addChartSection('Deaths Trend über Zeit', id);
    const { labels, datasets } = buildCrossLogDatasets(
        data, p => p.stats[0]?.killed ?? null
    );
    createChart(id, 'line', { labels, datasets }, crossLogTooltip());
}


// ── Resurrects ────────────────────────────────────────────
function renderResurrectCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `res_chart_${i}`;
        addChartSection(`Resurrects – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'bar', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.support[idx]?.resurrects),
        });
    });
}

function renderResurrectsTrendChart(data) {
    const id = 'res_trend_chart';
    addChartSection('Resurrects Trend über Zeit', id);
    const { labels, datasets } = buildCrossLogDatasets(
        data, p => p.support[0]?.resurrects ?? null
    );
    createChart(id, 'line', { labels, datasets }, crossLogTooltip());
}


// ── Resurrect Time ────────────────────────────────────────
function renderResurrectTimeCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `res_time_chart_${i}`;
        addChartSection(`Resurrect Time – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'bar', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.support[idx]?.resurrect_time),
        });
    });
}


// ── Condi Cleanses ────────────────────────────────────────
function renderCondiCleansesCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `condi_cleanse_chart_${i}`;
        addChartSection(`Condi Cleanses – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'bar', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.support[idx]?.condi_cleanse),
        });
    });
}


// ── Boon Strips ───────────────────────────────────────────
function renderBoonStripsCharts(data) {
    data.logs.forEach((log, i) => {
        const id = `boon_strips_chart_${i}`;
        addChartSection(`Boon Strips – ${log.fight_name} (${logDateLabel(log)})`, id);
        createChart(id, 'bar', {
            labels:   resolvePhaseLabels(data.phaseNames, log.id),
            datasets: buildPerPhaseDatasets(data, log.id, (p, idx) => p.support[idx]?.boon_strips),
        });
    });
}


// ── Phase Duration ────────────────────────────────────────
// Balken-Chart: X = Phasennamen, ein Dataset pro Log.
// Echte duration_ms kommen aus data.phaseDurations (wird in db.js befüllt).
function renderPhaseDurationChart(data) {
    if (!data.logs.length) return;

    const id = 'phase_duration_chart';
    addChartSection('Phase Duration', id);

    // Alle Phasennamen über alle Logs sammeln (Union), sortiert nach Index
    const allPhaseEntries = new Map();
    data.logs.forEach(log => {
        const map = data.phaseNames[log.id] ?? {};
        Object.entries(map)
            .sort(([a], [b]) => Number(a) - Number(b))
            .forEach(([idx, name]) => {
                if (!allPhaseEntries.has(idx)) {
                    allPhaseEntries.set(idx, name || `Phase ${idx}`);
                }
            });
    });
    const allIndices = [...allPhaseEntries.keys()].map(Number).sort((a, b) => a - b);
    const labels     = allIndices.map(idx => allPhaseEntries.get(String(idx)));

    const datasets = data.logs.map((log, i) => {
        const durations = data.phaseDurations?.[log.id] ?? {};
        return {
            label:           logDateLabel(log),
            data:            allIndices.map(idx => durations[idx] ?? null),
            backgroundColor: paletteColor(i) + '99',
        };
    });

    createChart(id, 'bar', { labels, datasets }, {
        scales: { y: { title: { display: true, text: 'ms' } } },
    });
}


// ── Fight Duration über Zeit ──────────────────────────────
function renderFightDurationChart(data) {
    const id = 'fight_duration_chart';
    addChartSection('Fight Duration über Zeit', id);

    createChart(id, 'line', {
        labels: data.logs.map(logDateLabel),
        datasets: [{
            label:       'Kampfdauer (ms)',
            data:        data.logs.map(l => l.duration_ms),
            borderColor: paletteColor(0),
            backgroundColor: paletteColor(0) + '33',
            tension:     0.3,
        }],
    }, {
        scales: { y: { title: { display: true, text: 'ms' } } },
    });
}


// ── Success Rate ──────────────────────────────────────────
function renderSuccessRateChart(data) {
    const id = 'success_rate_chart';
    addChartSection('Success Rate', id);

    const wins   = data.logs.filter(l => l.success).length;
    const losses = data.logs.length - wins;

    createChart(id, 'doughnut', {
        labels:   ['Success', 'Wipe'],
        datasets: [{
            data:            [wins, losses],
            backgroundColor: ['#59a14f', '#e15759'],
        }],
    });
}


// ════════════════════════════════════════════════════════════
//  MASTER-RENDER  –  alle Charts auf einmal
// ════════════════════════════════════════════════════════════
function renderAllCharts(data) {
    clearAllCharts();

    // ── Übersichts-Charts (Log-übergreifend) ────────────────
    renderSuccessRateChart(data);
    renderFightDurationChart(data);
    renderPhaseDurationChart(data);

    // ── Trend-Charts (ein Datenpunkt pro Log, X = Datum) ────
    renderDpsTrendChart(data);
    renderCondiDpsTrendChart(data);
    renderPowerDpsTrendChart(data);
    renderBreakbarTrendChart(data);
    renderDamageTakenTrendChart(data);
    renderReceivedCcTrendChart(data);
    renderDownsTrendChart(data);
    renderDeathsTrendChart(data);
    renderResurrectsTrendChart(data);
    renderStackDistTrendChart(data);

    // ── Pro-Log-Charts (X = Phasen) ─────────────────────────
    renderDpsCharts(data);
    renderCondiDpsCharts(data);
    renderPowerDpsCharts(data);
    renderBreakbarCharts(data);
    renderDamageTakenCharts(data);
    renderReceivedCcCharts(data);
    renderReceivedCcDurationCharts(data);
    renderWastedCastsCharts(data);
    renderSavedCastsCharts(data);
    renderStackDistCharts(data);
    renderDistToComCharts(data);
    renderAvgActiveBoonsCharts(data);
    renderAvgActiveConditionsCharts(data);
    renderCastUptimeCharts(data);
    renderFlankingRateCharts(data);
    renderDownsCharts(data);
    renderDeathsCharts(data);
    renderResurrectCharts(data);
    renderResurrectTimeCharts(data);
    renderCondiCleansesCharts(data);
    renderBoonStripsCharts(data);
}