import type {News} from '../definitions';
import {getBlogPostURL, NEWS_URL} from '../utils/links';
import {StateManager} from '../utils/state-manager';
import {getDurationInMinutes} from '../utils/time';

import IconManager from './icon-manager';
import {readSyncStorage, readLocalStorage, writeSyncStorage, writeLocalStorage} from './utils/extension-api';
import {logWarn} from './utils/log';

declare const __TEST__: boolean;

interface NewsmakerState extends Record<string, unknown> {
    latest: News[];
    latestTimestamp: number | null;
}

let newsForTesting: News[] | null = [{
    id: 'some',
    date: '10',
    url: '/',
    headline: 'News',
}];

export default class Newsmaker {
    private static readonly UPDATE_INTERVAL = getDurationInMinutes({hours: 4});
    private static readonly ALARM_NAME = 'newsmaker';
    private static readonly LOCAL_STORAGE_KEY = 'Newsmaker-state';

    private static initialized: boolean;
    private static stateManager: StateManager<NewsmakerState>;
    private static latest: News[];
    private static latestTimestamp: number | null;

    private static init() {
        if (Newsmaker.initialized) {
            // This path is never taken since Extension.constructor() ever creates one instance.
            logWarn('Attempting to re-initialize Newsmaker. Doing nothing.');
            return;
        }
        Newsmaker.initialized = true;

        Newsmaker.stateManager = new StateManager<NewsmakerState>(Newsmaker.LOCAL_STORAGE_KEY, this, {latest: [], latestTimestamp: null}, logWarn);
        Newsmaker.latest = [];
        Newsmaker.latestTimestamp = null;
    }

    private static onUpdate() {
        Newsmaker.init();
        const latestNews = Newsmaker.latest.length > 0 && Newsmaker.latest[0];
        if (latestNews && latestNews.badge && !latestNews.read && !latestNews.displayed) {
            IconManager.showBadge(latestNews.badge);
            return;
        }

        IconManager.hideBadge();
    }

    static async getLatest(): Promise<News[]> {
        Newsmaker.init();
        await Newsmaker.stateManager.loadState();
        return Newsmaker.latest;
    }

    private static alarmListener = (alarm: chrome.alarms.Alarm): void => {
        Newsmaker.init();
        if (alarm.name === Newsmaker.ALARM_NAME) {
            Newsmaker.updateNews();
        }
    };

    static subscribe(): void {
        Newsmaker.init();
        if ((Newsmaker.latestTimestamp === null) || (Newsmaker.latestTimestamp + Newsmaker.UPDATE_INTERVAL < Date.now())) {
            Newsmaker.updateNews();
        }
        chrome.alarms.onAlarm.addListener(Newsmaker.alarmListener);
        chrome.alarms.create(Newsmaker.ALARM_NAME, {periodInMinutes: Newsmaker.UPDATE_INTERVAL});
    }

    static unSubscribe(): void {
        // No need to call Newsmaker.init()
        chrome.alarms.onAlarm.removeListener(Newsmaker.alarmListener);
        chrome.alarms.clear(Newsmaker.ALARM_NAME);
    }

    private static async updateNews(): Promise<void> {
        Newsmaker.init();
        const news = await Newsmaker.getNews();
        if (Array.isArray(news)) {
            Newsmaker.latest = news;
            Newsmaker.latestTimestamp = Date.now();
            Newsmaker.onUpdate();
            await Newsmaker.stateManager.saveState();
        }
    }

    private static async getReadNews(): Promise<string[]> {
        Newsmaker.init();
        const [
            sync,
            local,
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
        Newsmaker.init();
        const [
            sync,
            local,
        ] = await Promise.all([
            readSyncStorage({displayedNews: []}),
            readLocalStorage({displayedNews: []}),
        ]);
        return Array.from(new Set([
            ...sync ? sync.displayedNews : [],
            ...local ? local.displayedNews : [],
        ]));
    }

    private static async getNews(): Promise<News[] | null> {
        Newsmaker.init();
        if (__TEST__) {
            return newsForTesting;
        }
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

    static async markAsRead(ids: string[]): Promise<void> {
        Newsmaker.init();
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

    static async markAsDisplayed(ids: string[]): Promise<void> {
        Newsmaker.init();
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

    private static wasRead(id: string, readNews: string[]): boolean {
        return readNews.includes(id);
    }

    private static wasDisplayed(id: string, displayedNews: string[]): boolean {
        return displayedNews.includes(id);
    }
}

export function setNewsForTesting(news: News[]): void {
    if (__TEST__) {
        newsForTesting = news;
    }
}
