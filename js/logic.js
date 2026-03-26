// ============================================================
//  logic.js  –  UI-Logik, Modal, Filter, Orchestrierung
//  Abhängigkeiten: db.js, charts.js (müssen vorher geladen sein)
// ============================================================


// ── Modal: Klick außerhalb schließt es ────────────────────
document.getElementById('modal').addEventListener('click', function (e) {
    if (e.target === this) this.style.display = 'none';
});


// ── Gruppe gewählt → Encounter-Dropdown befüllen ──────────
document.getElementById('group-select').addEventListener('change', async function () {
    const groupName = this.value;
    const encounterSelect = document.getElementById('encounter-select');

    encounterSelect.innerHTML = '<option value="" disabled selected>Wird geladen…</option>';

    const encounters = await fetchEncountersByGroup(groupName);

    if (!encounters?.length) {
        encounterSelect.innerHTML = '<option value="" disabled selected>Keine Daten</option>';
        return;
    }

    encounterSelect.innerHTML = '<option value="" disabled selected>---</option>';
    encounters.forEach(({ fight_name }) => {
        const opt = document.createElement('option');
        opt.value       = fight_name;
        opt.textContent = fight_name;
        encounterSelect.appendChild(opt);
    });
});


// ── Encounter gewählt → Spieler-Checkboxes befüllen ───────
document.getElementById('encounter-select').addEventListener('change', async function () {
    const groupName   = document.getElementById('group-select').value;
    const fightName   = this.value;
    const section     = document.getElementById('player-filter-section');
    const checkboxDiv = document.getElementById('player-checkboxes');

    section.style.display = 'none';
    checkboxDiv.innerHTML  = '';

    const players = await fetchPlayersByGroupAndEncounter(groupName, fightName);
    if (!players?.length) return;

    players.forEach(name => {
        const label = document.createElement('label');
        const cb    = document.createElement('input');
        cb.type           = 'checkbox';
        cb.value          = name;
        cb.dataset.player = name;
        cb.checked        = true;

        label.appendChild(cb);
        label.append(` ${name}`);
        checkboxDiv.appendChild(label);
    });

    section.style.display = 'block';
});


// ── Filter anwenden → Daten laden → Charts rendern ────────
async function filterAnwenden() {
    const groupName = document.getElementById('group-select').value;
    const fightName = document.getElementById('encounter-select').value;

    if (!groupName || !fightName) {
        alert('Bitte Gruppe und Encounter wählen.');
        return;
    }

    // Gewählte Spieler auslesen (leeres Array = alle)
    const checkedBoxes = document.querySelectorAll('#player-checkboxes input[type=checkbox]:checked');
    const playerNames  = Array.from(checkedBoxes).map(cb => cb.value);

    // Modal schließen
    document.getElementById('modal').style.display = 'none';

    // Loading-Indicator
    const loading = document.getElementById('loading');
    loading.style.display = 'block';

    try {
        const data = await fetchRaidData({ groupName, fightName, playerNames });

        if (!data) {
            loading.textContent = 'Keine Daten gefunden.';
            return;
        }

        renderAllCharts(data);
    } catch (err) {
        console.error('[logic] Fehler beim Laden:', err);
        loading.textContent = 'Fehler beim Laden der Daten.';
    } finally {
        loading.style.display = 'none';
    }
}