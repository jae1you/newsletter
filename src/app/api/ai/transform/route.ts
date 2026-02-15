import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const { title, summary, isEnglish } = await request.json();

        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key') {
            return NextResponse.json({
                title: `[API 키 미설정] ${title}`,
                summary: `OpenAI API 키가 설정되지 않았습니다. .env.local 파일에 키를 입력해주세요.\n기존 요약: ${summary}`
            });
        }

        const prompt = `
      당신은 전문 뉴스레터 편집자입니다. 다음 뉴스 기사의 제목과 내용을 분석하여 뉴스레터 구독자들이 흥미를 느낄 수 있도록 가공해주세요.
      
      기사 제목: ${title}
      기사 내용: ${summary}
      
      작업 내용:
      1. ${isEnglish ? '영어 제목을 한국어로 번역하고,' : ''} 독자가 클릭하고 싶게 만드는 매력적인 마케팅형 한국어 제목으로 수정할 것.
      2. 본문 내용을 핵심만 추려 5줄 이내의 개조식(- 형태)으로 요약할 것.
      3. 친절하고 전문적인 어조를 유지할 것.
      
      응답은 반드시 JSON 형식으로만 아래와 같이 말할 것:
      {
        "title": "가공된 제목",
        "summary": "가공된 요약 내용"
      }
    `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a professional newsletter editor who provides responses in JSON format." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');

        return NextResponse.json({
            title: result.title || title,
            summary: result.summary || summary
        });
    } catch (error) {
        console.error('AI Transform API Error:', error);
        return NextResponse.json({ error: 'AI 변환 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
