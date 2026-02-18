export interface NewsResult {
    title: string;
    link: string;
    description: string;
    pubDate?: string;
    image?: string;
    source: string;
}

/**
 * 네이버 검색 API 연동
 */
export async function searchNaverNews(query: string, startDate: Date, endDate: Date): Promise<NewsResult[]> {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.warn('[Naver] API keys not found');
        return [];
    }

    try {
        const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=20&sort=sim`;

        const response = await fetch(url, {
            headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret
            }
        });

        if (!response.ok) {
            console.error(`[Naver] API Error ${response.status}`);
            return [];
        }

        const data = await response.json();

        return (data.items || []).map((item: any) => ({
            title: item.title.replace(/<[^>]*>?/gm, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
            link: item.link,
            description: item.description.replace(/<[^>]*>?/gm, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
            pubDate: item.pubDate,
            source: 'Naver'
        }));
    } catch (error) {
        console.error('[Naver] Fetch Error:', error);
        return [];
    }
}

/**
 * Google News RSS 검색
 * Google News의 RSS 피드를 활용하여 키워드별 뉴스 검색
 * https://news.google.com/rss/search?q=키워드
 */
export async function searchGoogleNews(query: string, startDate: Date, endDate: Date): Promise<NewsResult[]> {
    try {
        const Parser = (await import('rss-parser')).default;
        const parser = new Parser({ timeout: 10000 });

        // 날짜 범위를 Google 검색 형식으로 변환 (after:YYYY-MM-DD before:YYYY-MM-DD)
        const after = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
        const before = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

        const searchQuery = `${query} after:${after} before:${before}`;
        const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en&gl=US&ceid=US:en`;

        console.log(`[Google News] Searching: ${searchQuery}`);

        const feed = await parser.parseURL(feedUrl);

        return (feed.items || []).map((item: any) => {
            // Google News RSS에서 source 추출 (제목에 " - Source" 형태로 포함)
            let title = item.title || '';
            let sourceName = 'Google News';

            const sourceMatch = title.match(/\s-\s([^-]+)$/);
            if (sourceMatch) {
                sourceName = sourceMatch[1].trim();
                title = title.replace(/\s-\s[^-]+$/, '').trim();
            }

            return {
                title,
                link: item.link || '',
                description: item.contentSnippet || item.content || '',
                pubDate: item.pubDate || item.isoDate || '',
                source: sourceName
            };
        });
    } catch (error) {
        console.error(`[Google News] Error searching "${query}":`, error);
        return [];
    }
}

/**
 * 모든 키워드에 대해 Google News 검색 수행
 */
export async function searchAllGoogleNews(keywords: string[], startDate: Date, endDate: Date): Promise<NewsResult[]> {
    console.log(`[Google News] Searching ${keywords.length} keywords...`);

    const results = await Promise.all(
        keywords.map(kw => searchGoogleNews(kw, startDate, endDate))
    );

    const allNews = results.flat();
    console.log(`[Google News] Collected ${allNews.length} articles total`);

    return allNews;
}
