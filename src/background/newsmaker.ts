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

    private async getNews() {
        try {
            const response = await fetch(`https://darkreader.github.io/blog/posts.json`, {cache: 'no-cache'});
            const $news: Array<{id: string; date: string; headline: string; important?: boolean}> = await response.json();
            const readNews = await this.getReadNews();
            const news: News[] = $news.map(({id, date, headline, important}) => {
                const url = getBlogPostURL(id);
                const read = this.isRead(id, readNews);
                return {id, date, headline, url, important, read};
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
            this.latest = this.latest.map(({id, date, url, headline, important}) => {
                const read = this.isRead(id, results);
                return {id, date, url, headline, important, read};
            });
            this.onUpdate(this.latest);
            const obj = {readNews: results};
            await writeLocalStorage(obj);
            await writeSyncStorage(obj);
            await this.stateManager.saveState();
        }
    }

    isRead(id: string, readNews: string[]) {
        return readNews.includes(id);
    }
}
