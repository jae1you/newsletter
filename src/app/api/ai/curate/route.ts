import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface ArticleInput {
    id: string;
    title: string;
    summary: string;
    source: string;
    date: string;
}

export async function POST(request: Request) {
    try {
        const { articles, systemPrompt } = await request.json() as { articles: ArticleInput[]; systemPrompt?: string };

        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key') {
            // Fallback: return first 3 of each category
            const domestic = articles.filter(a => a.source === 'Naver').slice(0, 3).map(a => a.id);
            const international = articles.filter(a => a.source !== 'Naver').slice(0, 3).map(a => a.id);
            return NextResponse.json({ domestic, international, reasoning: 'API 키 미설정으로 상위 3개씩 자동 선택' });
        }

        const validIds = new Set(articles.map(a => a.id));

        const domesticArticles = articles.filter(a => a.source === 'Naver');
        const internationalArticles = articles.filter(a => a.source !== 'Naver');

        const baseSystemPrompt = systemPrompt && systemPrompt.trim()
            ? systemPrompt.trim()
            : `당신은 패션 중고/리세일 산업 전문 뉴스레터 큐레이터입니다.

아래 기사 목록에서 뉴스레터에 실을 기사를 선별해 주세요.

선별 기준:
- 패션 중고/리세일/빈티지 산업과의 관련성
- 뉴스 가치 (신규성, 영향력)
- 주제 다양성 (같은 내용 반복 방지)
- 독자 관심도`;

        const prompt = `${baseSystemPrompt}

## 국내 기사 목록
${domesticArticles.map(a => `[${a.id}] ${a.title} - ${a.summary.slice(0, 100)}`).join('\n')}

## 해외 기사 목록
${internationalArticles.map(a => `[${a.id}] ${a.title} - ${a.summary.slice(0, 100)}`).join('\n')}

## 요청사항
- 국내 기사에서 3~5개 선별
- 해외 기사에서 3~5개 선별
- 기사가 부족하면 있는 만큼만 선별

응답은 반드시 JSON 형식으로:
{
  "domestic": ["id1", "id2", "id3"],
  "international": ["id4", "id5", "id6"],
  "reasoning": "선별 이유 간략 설명"
}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a professional newsletter curator. Respond only in JSON format." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');

        // Validate returned IDs against actual article IDs (defend against hallucination)
        const domesticIds = (result.domestic || []).filter((id: string) => validIds.has(id));
        const internationalIds = (result.international || []).filter((id: string) => validIds.has(id));

        return NextResponse.json({
            domestic: domesticIds,
            international: internationalIds,
            reasoning: result.reasoning || ''
        });
    } catch (error) {
        console.error('AI Curate API Error:', error);
        return NextResponse.json({ error: 'AI 큐레이션 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
