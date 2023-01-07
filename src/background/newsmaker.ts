import {getBlogPostURL, NEWS_URL} from '../utils/links';
import {getDurationInMinutes} from '../utils/time';
import type {News} from '../definitions';
import {readSyncStorage, readLocalStorage, writeSyncStorage, writeLocalStorage} from './utils/extension-api';
import {StateManager} from '../utils/state-manager';
import {logWarn} from './utils/log';
import IconManager from './icon-manager';

interface NewsmakerState extends Record<string, unknown> {
    latest: News[];
    latestTimestamp: number | null;
}

export default class Newsmaker {
    private static readonly UPDATE_INTERVAL = getDurationInMinutes({hours: 4});
    private static readonly ALARM_NAME = 'newsmaker';
    private static readonly LOCAL_STORAGE_KEY = 'Newsmaker-state';

    private static initialized: boolean;
    private static stateManager: StateManager<NewsmakerState>;
    private static latest: News[];
    private static latestTimestamp: number | null;

    constructor() {
        if (Newsmaker.initialized) {
            // This path is never taken since Extension.constructor() ever creates one instance.
            logWarn('Attempting to re-initialize Newsmaker. Doing nothing.');
            return;
        }
        Newsmaker.stateManager = new StateManager<NewsmakerState>(Newsmaker.LOCAL_STORAGE_KEY, this, {latest: [], latestTimestamp: null}, logWarn);
        Newsmaker.latest = [];
        Newsmaker.latestTimestamp = null;
    }

    private static onUpdate() {
        const latestNews = Newsmaker.latest.length > 0 && Newsmaker.latest[0];
        if (latestNews && latestNews.badge && !latestNews.read && !latestNews.displayed) {
            IconManager.showBadge(latestNews.badge);
            return;
        }

        IconManager.hideBadge();
    }

    static async getLatest(): Promise<News[]> {
        await Newsmaker.stateManager.loadState();
        return Newsmaker.latest;
    }

    private static alarmListener = (alarm: chrome.alarms.Alarm): void => {
        if (alarm.name === Newsmaker.ALARM_NAME) {
            Newsmaker.updateNews();
        }
    };

    static subscribe() {
        if ((Newsmaker.latestTimestamp === null) || (Newsmaker.latestTimestamp + Newsmaker.UPDATE_INTERVAL < Date.now())) {
            Newsmaker.updateNews();
        }
        chrome.alarms.onAlarm.addListener(Newsmaker.alarmListener);
        chrome.alarms.create(Newsmaker.ALARM_NAME, {periodInMinutes: Newsmaker.UPDATE_INTERVAL});
    }

    static unSubscribe() {
        chrome.alarms.onAlarm.removeListener(Newsmaker.alarmListener);
        chrome.alarms.clear(Newsmaker.ALARM_NAME);
    }

    private static async updateNews() {
        const news = await Newsmaker.getNews();
        if (Array.isArray(news)) {
            Newsmaker.latest = news;
            Newsmaker.latestTimestamp = Date.now();
            Newsmaker.onUpdate();
            await Newsmaker.stateManager.saveState();
        }
    }

    private static async getReadNews(): Promise<string[]> {
        const [
            sync,
            local
        ] = await Promise.all([
            readSyncStorage({readNews: []}),
            readLocalStorage({readNews: []}),
        ]);
        return Array.from(new Set([
            ...sync ? sync.readNews : [],
            ...local ? local.readNews : [],
        ]));
    }

    private static async getDisplayedNews(): Promise<string[]> {
        const [
            sync,
            local
        ] = await Promise.all([
            readSyncStorage({displayedNews: []}),
            readLocalStorage({displayedNews: []}),
        ]);
        return Array.from(new Set([
            ...sync ? sync.displayedNews : [],
            ...local ? local.displayedNews : [],
        ]));
    }

    private static async getNews() {
        try {
            const response = await fetch(NEWS_URL, {cache: 'no-cache'});
            const $news: Array<Omit<News, 'read' | 'url'> & {date: string}> = await response.json();
            const readNews = await Newsmaker.getReadNews();
            const displayedNews = await Newsmaker.getDisplayedNews();
            const news: News[] = $news.map((n) => {
                const url = getBlogPostURL(n.id);
                const read = Newsmaker.wasRead(n.id, readNews);
                const displayed = Newsmaker.wasDisplayed(n.id, displayedNews);
                return {...n, url, read, displayed};
            });
            for (let i = 0; i < news.length; i++) {
                const date = new Date(news[i].date);
                if (isNaN(date.getTime())) {
                    throw new Error(`Unable to parse date ${date}`);
                }
            }
            return news;
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    static async markAsRead(...ids: string[]) {
        const readNews = await Newsmaker.getReadNews();
        const results = readNews.slice();
        let changed = false;
        ids.forEach((id) => {
            if (readNews.indexOf(id) < 0) {
                results.push(id);
                changed = true;
            }
        });
        if (changed) {
            Newsmaker.latest = Newsmaker.latest.map((n) => {
                const read = Newsmaker.wasRead(n.id, results);
                return {...n, read};
            });
            Newsmaker.onUpdate();
            const obj = {readNews: results};
            await Promise.all([
                writeLocalStorage(obj),
                writeSyncStorage(obj),
                Newsmaker.stateManager.saveState(),
            ]);
        }
    }

    static async markAsDisplayed(...ids: string[]) {
        const displayedNews = await Newsmaker.getDisplayedNews();
        const results = displayedNews.slice();
        let changed = false;
        ids.forEach((id) => {
            if (displayedNews.indexOf(id) < 0) {
                results.push(id);
                changed = true;
            }
        });
        if (changed) {
            Newsmaker.latest = Newsmaker.latest.map((n) => {
                const displayed = Newsmaker.wasDisplayed(n.id, results);
                return {...n, displayed};
            });
            Newsmaker.onUpdate();
            const obj = {displayedNews: results};
            await Promise.all([
                writeLocalStorage(obj),
                writeSyncStorage(obj),
                Newsmaker.stateManager.saveState(),
            ]);
        }
    }

    static wasRead(id: string, readNews: string[]) {
        return readNews.includes(id);
    }

    static wasDisplayed(id: string, displayedNews: string[]) {
        return displayedNews.includes(id);
    }
}
