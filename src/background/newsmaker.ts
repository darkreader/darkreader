import {getBlogPostURL} from '../utils/links';
import {getDurationInMinutes} from '../utils/time';
import type {News} from '../definitions';
import {readSyncStorage, readLocalStorage, writeSyncStorage, writeLocalStorage} from './utils/extension-api';
import {StateManager} from './utils/state-manager';

interface NewsmakerState {
    latest: News[];
    latestTimestamp: number;
}

export default class Newsmaker {
    private static UPDATE_INTERVAL = getDurationInMinutes({hours: 4});
    private static ALARM_NAME = 'newsmaker';
    private static LOCAL_STORAGE_KEY = 'Newsmaker-state';

    private stateManager: StateManager<NewsmakerState>;
    private latest: News[];
    private latestTimestamp: number;
    onUpdate: (news: News[]) => void;

    constructor(onUpdate: (news: News[]) => void) {
        this.stateManager = new StateManager<NewsmakerState>(Newsmaker.LOCAL_STORAGE_KEY, this, {latest: [], latestTimestamp: null});
        this.latest = [];
        this.latestTimestamp = null;
        this.onUpdate = onUpdate;
    }

    async getLatest(): Promise<News[]> {
        await this.stateManager.loadState();
        return this.latest;
    }

    private alarmListener = (alarm: chrome.alarms.Alarm): void => {
        if (alarm.name === Newsmaker.ALARM_NAME) {
            this.updateNews();
        }
    };

    subscribe() {
        if ((this.latestTimestamp === null) || (this.latestTimestamp + Newsmaker.UPDATE_INTERVAL < Date.now())) {
            this.updateNews();
        }
        chrome.alarms.onAlarm.addListener((alarm) => this.alarmListener(alarm));
        chrome.alarms.create(Newsmaker.ALARM_NAME, {periodInMinutes: Newsmaker.UPDATE_INTERVAL});
    }

    unSubscribe() {
        chrome.alarms.onAlarm.removeListener(this.alarmListener);
        chrome.alarms.clear(Newsmaker.ALARM_NAME);
    }

    private async updateNews() {
        const news = await this.getNews();
        if (Array.isArray(news)) {
            this.latest = news;
            this.latestTimestamp = Date.now();
            this.onUpdate(this.latest);
            await this.stateManager.saveState();
        }
    }

    private async getReadNews(): Promise<string[]> {
        const sync = await readSyncStorage({readNews: []});
        const local = await readLocalStorage({readNews: []});
        return Array.from(new Set([
            ...sync ? sync.readNews : [],
            ...local ? local.readNews : [],
        ]));
    }

    private async getDisplayedNews(): Promise<string[]> {
        const sync = await readSyncStorage({displayedNews: []});
        const local = await readLocalStorage({displayedNews: []});
        return Array.from(new Set([
            ...sync ? sync.displayedNews : [],
            ...local ? local.displayedNews : [],
        ]));
    }

    private async getNews() {
        try {
            const response = await fetch(`https://darkreader.github.io/blog/posts.json`, {cache: 'no-cache'});
            const $news: Array<Omit<News, 'read' | 'url'> & {date: string}> = await response.json();
            const readNews = await this.getReadNews();
            const displayedNews = await this.getDisplayedNews();
            const news: News[] = $news.map((n) => {
                const url = getBlogPostURL(n.id);
                const read = this.wasRead(n.id, readNews);
                const displayed = this.wasDisplayed(n.id, displayedNews);
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

    async markAsRead(...ids: string[]) {
        const readNews = await this.getReadNews();
        const results = readNews.slice();
        let changed = false;
        ids.forEach((id) => {
            if (readNews.indexOf(id) < 0) {
                results.push(id);
                changed = true;
            }
        });
        if (changed) {
            this.latest = this.latest.map((n) => {
                const read = this.wasRead(n.id, results);
                return {...n, read};
            });
            this.onUpdate(this.latest);
            const obj = {readNews: results};
            await writeLocalStorage(obj);
            await writeSyncStorage(obj);
            await this.stateManager.saveState();
        }
    }

    async markAsDisplayed(...ids: string[]) {
        const displayedNews = await this.getDisplayedNews();
        const results = displayedNews.slice();
        let changed = false;
        ids.forEach((id) => {
            if (displayedNews.indexOf(id) < 0) {
                results.push(id);
                changed = true;
            }
        });
        if (changed) {
            this.latest = this.latest.map((n) => {
                const displayed = this.wasDisplayed(n.id, results);
                return {...n, displayed};
            });
            this.onUpdate(this.latest);
            const obj = {displayedNews: results};
            await writeLocalStorage(obj);
            await writeSyncStorage(obj);
            await this.stateManager.saveState();
        }
    }

    wasRead(id: string, readNews: string[]) {
        return readNews.includes(id);
    }

    wasDisplayed(id: string, displayedNews: string[]) {
        return displayedNews.includes(id);
    }
}
