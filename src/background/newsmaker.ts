import {News} from '../definitions';

const NEWS = [
    {date: '2018-04-27', headline: 'Nasdaq market paralyzed by Dark Reader donation popup', id: 'news-section', url: '#'},
    {date: '2018-04-23', headline: 'Introducing Dynamic Theme mode', id: 'dynamic-theme', url: 'http://darkreader.org/blog/dynamic-theme/'},
];

export default class Newsmaker {
    static UPDATE_INTERVAL = 3 * 60 * 60 * 1000;

    latest: News[];
    onUpdate: (news: News[]) => void;

    constructor(onUpdate: (news: News[]) => void) {
        this.latest = [];
        this.onUpdate = onUpdate;
        this.updateNews();
        setInterval(() => this.updateNews(), Newsmaker.UPDATE_INTERVAL);
    }

    async updateNews() {
        const news = await this.getNews();
        this.latest = news;
        this.onUpdate(this.latest);
    }

    getNews() {
        return new Promise<News[]>((resolve) => {
            chrome.storage.sync.get({readNews: []}, ({readNews}) => {
                const news = NEWS;
                const results = news.map(({id, date, headline, url}) => {
                    const read = this.isRead(id, readNews);
                    return {id, date, headline, url, read};
                });
                resolve(results);
            });
        });
    }

    markAsRead(...ids: string[]) {
        return new Promise((resolve) => {
            chrome.storage.sync.get({readNews: []}, ({readNews}) => {
                const results = readNews.slice();
                let changed = false;
                ids.forEach((id) => {
                    if (readNews.indexOf(id) < 0) {
                        results.push(id);
                        changed = true;
                    }
                });
                if (changed) {
                    this.latest = this.latest.map(({id, date, url, headline}) => {
                        const read = this.isRead(id, results);
                        return {id, date, url, headline, read};
                    });
                    this.onUpdate(this.latest);
                    chrome.storage.sync.set({readNews: results}, () => resolve());
                } else {
                    resolve();
                }
            });
        });
    }

    isRead(id: string, readNews: string[]) {
        return readNews.indexOf(id) >= 0 || (id === 'dynamic-theme' && Boolean(localStorage.getItem('darkreader-4-release-notes-shown')));
    }
}
