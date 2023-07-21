describe('News', () => {
    const newsSelector = 'div.news.news--expanded';

    it('should display news', async () => {
        await backgroundUtils.setNews([{
            id: 'some',
            date: '10',
            url: '/',
            headline: 'Test news',
        }]);

        popupUtils.exists(newsSelector);
    });
});
