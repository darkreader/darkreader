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

    }
    static async markAsDisplayed(_ids: string[]): Promise<void> {

    }
}

export function setNewsForTesting(_news: News[]): void {
}
