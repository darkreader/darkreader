let timer: number | null;
function alarmFixer() {
    clearTimeout(timer!);
    timer = setTimeout(alarmFixer, 10000);
    chrome.alarms.getAll((alarms) => {
        const cutoff = Date.now() + 1000;
        if (alarms.some((alarm) => alarm.scheduledTime <= cutoff)) {
            chrome.alarms.create('alarm-fixer', {when: 0});
        }
    });
}

export function scheduleChromiumAlarmFixer(): void {
    if (timer) {
        return;
    }
    alarmFixer();
}
