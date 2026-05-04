import type {News} from '../definitions';

export default class Newsmaker {
    static async getLatest(): Promise<News[]> {
        return [];
    }
    static subscribe(): void {
    }
    static unSubscribe(): void {
    }
    static async markAsRead(_ids: string[]): Promise<void> {
        return;
    }
    static async markAsDisplayed(_ids: string[]): Promise<void> {
        return;
    }
}

export function setNewsForTesting(_news: News[]): void {
}
