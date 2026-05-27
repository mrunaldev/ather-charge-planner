ObjC.import('Foundation');

const rootPath = "/Users/mrunal/Documents/MyWork/mrunaldevcontainer/mrunalworkspace/mrunaldevrepo/ather-charge-planner";

function readFile(path) {
    const text = $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null);
    if (!text) {
        throw new Error("Unable to read " + path);
    }
    return ObjC.unwrap(text);
}

const elements = {};

function element(id) {
    if (!elements[id]) {
        elements[id] = {
            id: id,
            value: "",
            innerHTML: "",
            classList: {
                add: function () {},
                remove: function () {}
            }
        };
    }

    return elements[id];
}

const store = {};

const localStorage = {
    getItem: function (key) {
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem: function (key, value) {
        store[key] = String(value);
    },
    removeItem: function (key) {
        delete store[key];
    },
    clear: function () {
        Object.keys(store).forEach(function (key) {
            delete store[key];
        });
    }
};

const document = {
    getElementById: element,
    querySelectorAll: function (selector) {
        if (selector === ".section" || selector === ".tab") {
            return [
                element(selector + "0"),
                element(selector + "1"),
                element(selector + "2"),
                element(selector + "3")
            ];
        }

        return [];
    }
};

function setTimeout(fn) {
    fn();
}

eval(readFile(rootPath + "/assets/js/app.js"));

function reset() {
    Object.keys(elements).forEach(function (key) {
        elements[key].value = "";
        elements[key].innerHTML = "";
    });

    localStorage.clear();
    element("model").value = "450 2.9";
    element("mode").value = "Regular";
    element("charger").value = "350";
}

function assertContains(name, actual, expected) {
    if (actual.indexOf(expected) === -1) {
        throw new Error(name + " expected to contain " + expected + " but got: " + actual);
    }
}

function assertEqual(name, actual, expected) {
    if (actual !== expected) {
        throw new Error(name + " expected " + expected + " but got " + actual);
    }
}

function passedTimeValue() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - 1);
    return String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
}

const results = [];

function test(name, fn) {
    try {
        reset();
        fn();
        results.push("PASS " + name);
    } catch (err) {
        results.push("FAIL " + name + ": " + err.message);
    }
}

test("setup auto-selects 700W for 3.7 models", function () {
    element("model").value = "450 3.7";
    element("charger").value = "350";
    autoSelectCharger();
    assertEqual("charger", element("charger").value, "700");
});

test("setup auto-selects 350W for 2.9 models", function () {
    element("model").value = "Rizta 2.9";
    element("charger").value = "700";
    autoSelectCharger();
    assertEqual("charger", element("charger").value, "350");
});

test("settings save to localStorage and clear calibration", function () {
    localStorage.setItem("calibratedRate", "12.5");
    element("model").value = "Rizta 3.7";
    element("mode").value = "Optimized";
    element("charger").value = "700";
    element("purchaseDate").value = "2026-05-28";
    saveSettings();

    const saved = JSON.parse(localStorage.getItem("atherSettings"));
    assertEqual("saved model", saved.model, "Rizta 3.7");
    assertEqual("saved mode", saved.mode, "Optimized");
    assertEqual("saved charger", saved.charger, "700");
    assertEqual("saved purchaseDate", saved.purchaseDate, "2026-05-28");
    assertEqual("calibration cleared", localStorage.getItem("calibratedRate"), null);
});

test("default rate is 10 percent per hour for 350W", function () {
    element("charger").value = "350";
    assertEqual("rate", getRate(), 10);
});

test("default rate is 20 percent per hour for 700W", function () {
    element("charger").value = "700";
    assertEqual("rate", getRate(), 20);
});

test("calibrated rate overrides charger default", function () {
    element("charger").value = "700";
    localStorage.setItem("calibratedRate", "13.75");
    assertEqual("rate", getRate(), 13.75);
});

test("schedule rejects invalid current charge", function () {
    element("currentCharge").value = "";
    element("targetCharge").value = "100";
    element("targetTime").value = "23:59";
    calculateSchedule();
    assertContains("schedule error", element("scheduleResult").innerHTML, "Invalid number format");
});

test("schedule rejects current charge above target", function () {
    element("currentCharge").value = "90";
    element("targetCharge").value = "80";
    element("targetTime").value = "23:59";
    calculateSchedule();
    assertContains("schedule error", element("scheduleResult").innerHTML, "Current charge cannot be higher than target");
});

test("schedule treats passed clock time as tomorrow", function () {
    element("currentCharge").value = "99";
    element("targetCharge").value = "100";
    element("targetTime").value = passedTimeValue();
    element("charger").value = "700";
    calculateSchedule();
    assertContains("schedule output", element("scheduleResult").innerHTML, "PLUG IN AT");
    assertContains("schedule tomorrow note", element("scheduleResult").innerHTML, "Target time treated as tomorrow.");
});

test("optimized schedule charges to 80 first", function () {
    element("currentCharge").value = "20";
    element("targetCharge").value = "100";
    element("targetTime").value = "11:00";
    element("mode").value = "Optimized";
    calculateSchedule();
    assertContains("optimized note", element("scheduleResult").innerHTML, "Will charge to 80% first");
});

test("forecast rejects invalid current charge", function () {
    element("gainCurrent").value = "120";
    element("gainTime").value = "11:00";
    calculateGain();
    assertContains("forecast error", element("gainResult").innerHTML, "cannot exceed 100%");
});

test("forecast treats passed clock time as tomorrow", function () {
    element("gainCurrent").value = "20";
    element("gainTime").value = passedTimeValue();
    calculateGain();
    assertContains("forecast output", element("gainResult").innerHTML, "ESTIMATED BATTERY");
    assertContains("forecast tomorrow note", element("gainResult").innerHTML, "Forecast time treated as tomorrow.");
});

test("forecast caps estimated charge at 100 percent", function () {
    element("gainCurrent").value = "99";
    element("gainTime").value = "11:00";
    element("charger").value = "700";
    calculateGain();
    assertContains("forecast cap", element("gainResult").innerHTML, "<b>100%</b>");
});

test("calibration rejects missing times", function () {
    element("cal1Percent").value = "20";
    element("cal2Percent").value = "30";
    element("cal3Percent").value = "40";
    calculateCalibration();
    assertContains("calibration error", element("calibrateResult").innerHTML, "Please enter all three times");
});

test("calibration rejects descending percentages", function () {
    element("cal1Time").value = "10:00";
    element("cal2Time").value = "11:00";
    element("cal3Time").value = "12:00";
    element("cal1Percent").value = "30";
    element("cal2Percent").value = "25";
    element("cal3Percent").value = "40";
    calculateCalibration();
    assertContains("calibration error", element("calibrateResult").innerHTML, "Battery percentages must be increasing");
});

test("calibration saves average rate", function () {
    element("cal1Time").value = "10:00";
    element("cal2Time").value = "11:00";
    element("cal3Time").value = "12:00";
    element("cal1Percent").value = "20";
    element("cal2Percent").value = "30";
    element("cal3Percent").value = "40";
    calculateCalibration();
    assertEqual("calibrated rate", localStorage.getItem("calibratedRate"), "10.00");
    assertContains("calibration result", element("calibrateResult").innerHTML, "AVERAGE CHARGING SPEED");
});

const failures = results.filter(function (line) {
    return line.indexOf("FAIL ") === 0;
});

console.log(results.join("\n"));

if (failures.length) {
    throw new Error(failures.length + " test(s) failed");
}
