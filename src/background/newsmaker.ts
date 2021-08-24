import {getBlogPostURL} from '../utils/links';
import {getDurationInMinutes} from '../utils/time';
import type {News} from '../definitions';
import {readSyncStorage, readLocalStorage, writeSyncStorage, writeLocalStorage} from './utils/extension-api';
import {StateManager} from './utils/state-manager';

export default class Newsmaker {
    static UPDATE_INTERVAL = getDurationInMinutes({hours: 4});
    static ALARM_NAME = 'newsmaker';
    static LOCAL_STORAGE_KEY = 'Newsmaker-state';

    private stateManager: StateManager;
    private latest: News[];
    async getLatest(): Promise<News[]> {
        await this.stateManager.loadState();
        return this.latest;
    }
    onUpdate: (news: News[]) => void;

    constructor(onUpdate: (news: News[]) => void) {
        this.stateManager = new StateManager(Newsmaker.LOCAL_STORAGE_KEY, this, {latest: []});
        this.latest = [];
        this.onUpdate = onUpdate;
    }

    subscribe() {
        this.updateNews();
        chrome.alarms.onAlarm.addListener(async (alarm) => {
            if (alarm.name === Newsmaker.ALARM_NAME) {
                await this.updateNews();
            }
        });
        chrome.alarms.create(Newsmaker.ALARM_NAME, {periodInMinutes: Newsmaker.UPDATE_INTERVAL});
    }

    private async updateNews() {
        const news = await this.getNews();
        if (Array.isArray(news)) {
            this.latest = news;
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
            const response = await fetch(`https://darkreader.github.io/blog/posts.json?date=${(new Date()).toISOString().substring(0, 10)}`, {cache: 'no-cache'});
            const $news: Array<{id: string; date: string; headline: string; important?}> = await response.json();
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
