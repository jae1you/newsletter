import { NextResponse } from 'next/server';
import { searchNaverNews, searchAllGoogleNews } from '@/lib/search';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const { naverKeywords, googleKeywords, includeInternational, year, month } = await request.json();

        const startDateObj = new Date(year, month - 1, 1);
        const endDateObj = new Date(year, month, 0, 23, 59, 59);

        const allNews: any[] = [];

        // 네이버 뉴스 검색 (네이버 키워드 기반)
        for (const kw of (naverKeywords || [])) {
            const naverResults = await searchNaverNews(kw, startDateObj, endDateObj);

            naverResults.forEach(item => {
                allNews.push({
                    id: uuidv4(),
                    ...item,
                    date: item.pubDate ? new Date(item.pubDate).toLocaleDateString('ko-KR') : endDateObj.toLocaleDateString('ko-KR'),
                    summary: item.description,
                    imageUrl: item.image || ''
                });
            });
        }

        // Google News 검색 (구글 키워드 기반)
        if (includeInternational && googleKeywords?.length > 0) {
            console.log('[API] Searching Google News...');
            const googleResults = await searchAllGoogleNews(googleKeywords, startDateObj, endDateObj);

            googleResults.forEach(item => {
                allNews.push({
                    id: uuidv4(),
                    ...item,
                    date: item.pubDate ? new Date(item.pubDate).toLocaleDateString('ko-KR') : `${year}. ${month}.`,
                    summary: item.description,
                    imageUrl: item.image || ''
                });
            });
        }

        // 1. 중복 제거 (URL 기준)
        const uniqueNews = Array.from(new Map(allNews.map(item => [item.link, item])).values());

        // 2. 날짜 필터링 강화: 지정 연도와 월을 벗어나는 기사 제외
        const filteredNews = uniqueNews.filter(item => {
            if (!item.pubDate) return true;

            try {
                const d = new Date(item.pubDate);
                if (isNaN(d.getTime())) return true;

                return d.getFullYear() === year && (d.getMonth() + 1) === month;
            } catch {
                return true;
            }
        });

        return NextResponse.json(filteredNews);
    } catch (error) {
        console.error('[Search API Error]', error);
        return NextResponse.json({ error: '수집 중 오류 발생' }, { status: 500 });
    }
}
