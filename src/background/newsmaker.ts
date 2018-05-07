import {News} from '../definitions';

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
        if (news) {
            this.latest = news;
            this.onUpdate(this.latest);
        }
    }

    async getNews() {
        try {
            const response = await fetch(`https://raw.githubusercontent.com/darkreader/darkreader.org/master/src/blog/posts.json?nocache=${Date.now()}`, {cache: 'no-cache'});
            const $news = await response.json();
            return new Promise<News[]>((resolve) => {
                chrome.storage.sync.get({readNews: []}, ({readNews}) => {
                    const news = $news.map(({id, date, headline}) => {
                        const url = `http://darkreader.org/blog/${id}/`;
                        const read = this.isRead(id, readNews);
                        return {id, date, headline, url, read};
                    });
                    resolve(news);
                });
            });
        } catch (err) {
            console.error(err);
            return null;
        }
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
