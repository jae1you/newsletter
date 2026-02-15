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
 * 구글 커스텀 서치 API 연동 - 해외 핵심 미디어 50선 타겟팅
 */
export async function searchGoogleNews(query: string, startDate: Date, endDate: Date): Promise<NewsResult[]> {
    const apiKey = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CX;

    if (!apiKey || !cx) {
        console.warn('[Google] API keys not found');
        return [];
    }

    try {
        // 검색 쿼리 최적화
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=10`;

        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Google] API Error ${response.status}: ${errorText}`);
            return [];
        }

        const data = await response.json();

        return (data.items || []).map((item: any) => {
            let imageUrl = '';
            const pagemap = item.pagemap || {};

            // 1. 이미지 추출 우선순위 고도화 (주요 미디어 특성 반영)
            if (pagemap.cse_image?.[0]?.src) {
                imageUrl = pagemap.cse_image[0].src;
            } else if (pagemap.metatags?.[0]?.['og:image']) {
                imageUrl = pagemap.metatags[0]['og:image'];
            } else if (pagemap.metatags?.[0]?.['twitter:image']) {
                imageUrl = pagemap.metatags[0]['twitter:image'];
            } else if (pagemap.metatags?.[0]?.['twitter:image:src']) {
                imageUrl = pagemap.metatags[0]['twitter:image:src'];
            } else if (pagemap.cse_thumbnail?.[0]?.src) {
                imageUrl = pagemap.cse_thumbnail[0].src;
            }

            // 2. 날짜 추출 로직 (메타데이터 활용)
            let pubDate = '';
            const metatags = pagemap.metatags?.[0] || {};
            pubDate = metatags['article:published_time'] ||
                metatags['og:updated_time'] ||
                metatags['pubdate'] ||
                metatags['date'] ||
                '';

            // 3. 출처(매체명) 정제
            let sourceName = 'Google News';
            if (metatags['og:site_name']) {
                sourceName = metatags['og:site_name'];
            } else if (item.displayLink) {
                sourceName = item.displayLink.replace('www.', '');
            }

            return {
                title: item.title,
                link: item.link,
                description: item.snippet || '',
                image: imageUrl,
                pubDate: pubDate,
                source: sourceName
            };
        });
    } catch (error) {
        console.error('[Google] Fetch Error:', error);
        return [];
    }
}
