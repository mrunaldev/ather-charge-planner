function showTab(tab) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

    document.getElementById(tab).classList.add('active');

    const map = {schedule:0, gain:1, calibrate:2, setup:3};
    document.querySelectorAll('.tab')[map[tab]].classList.add('active');
}

function autoSelectCharger() {
    const model = document.getElementById("model").value;

    if(model.includes("3.7")) {
        document.getElementById("charger").value = "700";
    } else {
        document.getElementById("charger").value = "350";
    }
}

function saveSettings() {
    const settings = {
        model: document.getElementById("model").value,
        mode: document.getElementById("mode").value,
        charger: document.getElementById("charger").value,
        purchaseDate: document.getElementById("purchaseDate").value
    };

    localStorage.setItem("atherSettings", JSON.stringify(settings));
    localStorage.removeItem("calibratedRate");
    document.getElementById("setup").innerHTML += '<div class="success">Settings Saved</div>';
    setTimeout(() => showTab("schedule"), 500);
}

function loadSettings() {
    const saved = localStorage.getItem("atherSettings");

    if(!saved){
        showTab("setup");
        return;
    }

    const s = JSON.parse(saved);

    document.getElementById("model").value = s.model;
    document.getElementById("mode").value = s.mode;
    document.getElementById("charger").value = s.charger;
    document.getElementById("purchaseDate").value = s.purchaseDate;
}

function getRate() {
    // Check if user has calibrated a rate
    const calibrated = localStorage.getItem("calibratedRate");
    if(calibrated) {
        return parseFloat(calibrated);
    }
    // Default rates based on charger type
    return document.getElementById("charger").value == "700" ? 20 : 10;
}

function formatTime(d) {
    return d.toLocaleTimeString([], {
        hour:'2-digit',
        minute:'2-digit',
        hour12:true
    });
}

function isTomorrow(d) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return d.getFullYear() === tomorrow.getFullYear() &&
        d.getMonth() === tomorrow.getMonth() &&
        d.getDate() === tomorrow.getDate();
}

function getInputTime(id, assumeNextDayIfPast = false) {
    const val = document.getElementById(id).value;
    if(!val) return null;
    const [h,m] = val.split(":");
    const d = new Date();
    d.setHours(h,m,0,0);

    if(assumeNextDayIfPast && d <= new Date()) {
        d.setDate(d.getDate() + 1);
    }

    return d;
}

function validatePercentage(val, fieldName = "") {
    const num = parseInt(val);
    if(isNaN(num)) {
        return {valid: false, error: "Invalid number format"};
    }
    if(num < 0) {
        return {valid: false, error: fieldName ? fieldName + " cannot be negative" : "Percentage cannot be negative"};
    }
    if(num > 100) {
        return {valid: false, error: fieldName ? fieldName + " cannot exceed 100%" : "Percentage cannot exceed 100%"};
    }
    return {valid: true, value: num};
}

function calculateSchedule() {
    const resultDiv = document.getElementById("scheduleResult");
    resultDiv.innerHTML = '';

    // Validate inputs
    const currentVal = validatePercentage(document.getElementById("currentCharge").value, "Current charge");
    if(!currentVal.valid) {
        resultDiv.innerHTML = '<div class="error">ERROR: ' + currentVal.error + '</div>';
        return;
    }

    const targetVal = validatePercentage(document.getElementById("targetCharge").value, "Target charge");
    if(!targetVal.valid) {
        resultDiv.innerHTML = '<div class="error">ERROR: ' + targetVal.error + '</div>';
        return;
    }

    if(currentVal.value > targetVal.value) {
        resultDiv.innerHTML = '<div class="error">ERROR: Current charge cannot be higher than target</div>';
        return;
    }

    const targetT = getInputTime("targetTime", true);
    if(!targetT) {
        resultDiv.innerHTML = '<div class="error">ERROR: Please enter a target time</div>';
        return;
    }

    const now = new Date();
    if(targetT <= now) {
        resultDiv.innerHTML = '<div class="error">ERROR: Target time must be in the future</div>';
        return;
    }

    let current = currentVal.value;
    let target = targetVal.value;
    let rate = getRate();
    let modeVal = document.getElementById("mode").value;

    let mins;

    if(modeVal === "Optimized" && target > 80){
        mins = ((80 - current) / rate) * 60;
    } else {
        mins = ((target - current) / rate) * 60;
    }

    const plugInTime = new Date(targetT);
    plugInTime.setMinutes(plugInTime.getMinutes() - mins);

    if(plugInTime <= now) {
        resultDiv.innerHTML = '<div class="error">ERROR: Need to plug in immediately. Target time too soon for requested charge.</div>';
        return;
    }

    let message = "PLUG IN AT <br><br><b>" + formatTime(plugInTime) + "</b>";
    if(isTomorrow(targetT)) {
        message += "<br><small style='color: #888;'>Target time treated as tomorrow.</small>";
    }
    if(modeVal === "Optimized" && target > 80) {
        message += "<br><br><small>Will charge to 80% first, then delay final charge to optimize battery health.</small>";
    }
    if(localStorage.getItem("calibratedRate")) {
        message += "<br><small style='color: #888;'>(Using calibrated rate: " + rate + "%/hour)</small>";
    }

    resultDiv.innerHTML = message;
}

function calculateGain() {
    const resultDiv = document.getElementById("gainResult");
    resultDiv.innerHTML = '';

    const currentVal = validatePercentage(document.getElementById("gainCurrent").value, "Current charge");
    if(!currentVal.valid) {
        resultDiv.innerHTML = '<div class="error">ERROR: ' + currentVal.error + '</div>';
        return;
    }

    const targetT = getInputTime("gainTime", true);
    if(!targetT) {
        resultDiv.innerHTML = '<div class="error">ERROR: Please enter a target time</div>';
        return;
    }

    const now = new Date();
    let mins = (targetT - now) / 60000;

    if(mins <= 0) {
        resultDiv.innerHTML = '<div class="error">ERROR: Target time must be in the future</div>';
        return;
    }

    let gain = (mins / 60) * getRate();
    let estimated = currentVal.value + gain;

    if(estimated > 100) {
        estimated = 100;
    }

    let message = "ESTIMATED BATTERY <br><br><b>" + Math.round(estimated) + "%</b>";
    if(isTomorrow(targetT)) {
        message += "<br><small style='color: #888;'>Forecast time treated as tomorrow.</small>";
    }
    if(localStorage.getItem("calibratedRate")) {
        message += "<br><small style='color: #888;'>(Using calibrated rate: " + getRate() + "%/hour)</small>";
    }

    resultDiv.innerHTML = message;
}

function calculateCalibration() {
    const resultDiv = document.getElementById("calibrateResult");
    resultDiv.innerHTML = '';

    // Validate all inputs
    const t1 = getInputTime("cal1Time");
    const p1 = validatePercentage(document.getElementById("cal1Percent").value, "Sample 1 %");
    const t2 = getInputTime("cal2Time");
    const p2 = validatePercentage(document.getElementById("cal2Percent").value, "Sample 2 %");
    const t3 = getInputTime("cal3Time");
    const p3 = validatePercentage(document.getElementById("cal3Percent").value, "Sample 3 %");

    if(!t1 || !t2 || !t3) {
        resultDiv.innerHTML = '<div class="error">ERROR: Please enter all three times</div>';
        return;
    }

    if(!p1.valid || !p2.valid || !p3.valid) {
        const errors = [p1, p2, p3].filter(p => !p.valid).map(p => p.error);
        resultDiv.innerHTML = '<div class="error">ERROR: ' + errors[0] + '</div>';
        return;
    }

    // Check that samples are in order
    if(t1 > t2 || t2 > t3) {
        resultDiv.innerHTML = '<div class="error">ERROR: Times must be in ascending order (Sample 1 < Sample 2 < Sample 3)</div>';
        return;
    }

    // Check that battery percentages are increasing
    if(p1.value > p2.value || p2.value > p3.value) {
        resultDiv.innerHTML = '<div class="error">ERROR: Battery percentages must be increasing over time</div>';
        return;
    }

    // Calculate charging rates between samples
    const gap1Mins = (t2 - t1) / 60000;
    const gap2Mins = (t3 - t2) / 60000;

    const rate1 = (p2.value - p1.value) / (gap1Mins / 60);
    const rate2 = (p3.value - p2.value) / (gap2Mins / 60);
    const avgRate = (rate1 + rate2) / 2;

    // Determine charging quality
    let quality = "EXCELLENT";
    if(Math.abs(rate1 - rate2) > 5) {
        quality = "GOOD";
    }
    if(Math.abs(rate1 - rate2) > 10) {
        quality = "FAIR";
    }

    // Save calibrated rate
    localStorage.setItem("calibratedRate", avgRate.toFixed(2));

    resultDiv.innerHTML =
        '<div class="metric">' +
            '<div class="metric-label">AVERAGE CHARGING SPEED</div>' +
            '<div class="metric-value">' + avgRate.toFixed(2) + '%/hour</div>' +
        '</div>' +
        '<div class="metric">' +
            '<div class="metric-label">CHARGING QUALITY</div>' +
            '<div class="metric-value">' + quality + '</div>' +
        '</div>' +
        '<div class="metric" style="font-size: 12px; color: #888;">' +
            '<div>Sample 1 to 2: ' + rate1.toFixed(2) + '%/hour</div>' +
            '<div>Sample 2 to 3: ' + rate2.toFixed(2) + '%/hour</div>' +
            '<div style="margin-top: 10px; color: #666;">Your calculations will now use this calibrated rate.</div>' +
        '</div>' +
        '<div class="success" style="margin-top: 16px;">Calibration saved! Future calculations will use this rate.</div>';
}

loadSettings();