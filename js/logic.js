const dropdown = document.querySelector('select');

dropdown.addEventListener('change', function() {
    console.log(dropdown.value);
});


function filterAnwenden() {
    const filter = {
        option1: document.getElementById('filter1').checked,
        option2: document.getElementById('filter2').checked,
        auswahl: document.getElementById('filter3').value,
    };

    console.log(filter);
    // { option1: true, option2: false, auswahl: "a" }

    // Modal schließen
    document.getElementById('modal').style.display = 'none';

    // Hier mit den Filterwerten weiterarbeiten...
}
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.style.display = 'none';
    }
});

var DPS_Chart = new Chart("DPS_Chart", {
  type: "line",
  data: {},
  options: {}
});

var ConditionDamage_Chart = new Chart("ConditionDamage_Chart", {
  type: "line",
  data: {},
  options: {}
});

var PowerDamage_Chart = new Chart("PowerDamage_Chart", {
  type: "line",
  data: {},
  options: {}
});

var CC_Chart = new Chart("CC_Chart", {
  type: "line",
  data: {},
  options: {}
});

var TakenDamage_Chart = new Chart("TakenDamage_Chart", {
  type: "line",
  data: {},
  options: {}
});

var NumberBoonStrips_Chart = new Chart("NumberBoonStrips_Chart", {
  type: "line",
  data: {},
  options: {}
});

var resivedCC_Chart = new Chart("recivedCC_Chart", {
  type: "line",
  data: {},
  options: {}
});

var resivedDurationCC_Chart = new Chart("recivedDurationCC_Chart", {
  type: "line",
  data: {},
  options: {}
});

var resivedCC_Chart = new Chart("recivedCC_Chart", {
  type: "line",
  data: {},
  options: {}
});

var safes_Chart = new Chart("safes_Chart", {
  type: "line",
  data: {},
  options: {}
});

var savedTime_Chart = new Chart("savedTimeCC_Chart", {
  type: "line",
  data: {},
  options: {}
});

var wasts_Chart = new Chart("wastsCC_Chart", {
  type: "line",
  data: {},
  options: {}
});

var wastedTime_Chart = new Chart("wastedTime_Chart", {
  type: "line",
  data: {},
  options: {}
});

var stackDist_Chart = new Chart("stackDist_Chart", {
  type: "line",
  data: {},
  options: {}
});

var commDist_Chart = new Chart("commDist_Chart", {
  type: "line",
  data: {},
  options: {}
});

var avgActiveBoons_Chart = new Chart("avgActiveBoons_Chart", {
  type: "line",
  data: {},
  options: {}
});

var avgActiveConditions_Chart = new Chart("avgActiveConditions_Chart", {
  type: "line",
  data: {},
  options: {}
});

var castTime_Chart = new Chart("castTime_Chart", {
  type: "line",
  data: {},
  options: {}
});

var flankingRate_Chart = new Chart("flankingRate_Chart", {
  type: "line",
  data: {},
  options: {}
});

var downs_Chart = new Chart("downs_Chart", {
  type: "line",
  data: {},
  options: {}
});

var death_Chart = new Chart("death_Chart", {
  type: "line",
  data: {},
  options: {}
});

var ressurectsBoons_Chart = new Chart("ressurects_Chart", {
  type: "line",
  data: {},
  options: {}
});

var resTime_Chart = new Chart("resTime_Chart", {
  type: "line",
  data: {},
  options: {}
});

var condiCleanses_Chart = new Chart("CondiCleanses_Chart", {
  type: "line",
  data: {},
  options: {}
});

var boonStrips_Chart = new Chart("boonStrips_Chart", {
  type: "line",
  data: {},
  options: {}
});

var phaseDuration_Chart = new Chart("PhaseDuration_Chart", {
  type: "line",
  data: {},
  options: {}
});

var avgActiveBoons_Chart = new Chart("recivedCC_Chart", {
  type: "line",
  data: {},
  options: {}
});


