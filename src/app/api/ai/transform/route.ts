import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const { title, summary, isEnglish, transformPrompt } = await request.json();

        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key') {
            return NextResponse.json({
                title: `[API 키 미설정] ${title}`,
                summary: `OpenAI API 키가 설정되지 않았습니다. .env.local 파일에 키를 입력해주세요.\n기존 요약: ${summary}`
            });
        }

        const basePrompt = transformPrompt && transformPrompt.trim()
            ? transformPrompt.trim()
            : `당신은 패션 중고/리세일 산업을 전문으로 다루는 프리미엄 뉴스레터 "Resale Times"의 수석 에디터입니다.
      Vogue Business, Business of Fashion 수준의 고급스러운 필력을 구사하며,
      교양 있는 독자층이 "이건 꼭 읽어야 해"라고 느낄 수 있는 글을 씁니다.

      작업 내용:
      1. 제목을 패션 전문지 헤드라인처럼 작성할 것.
         - 단순 나열이 아닌, 핵심 인사이트를 담은 날카로운 한 문장
         - 필요시 위트 있는 표현이나 은유를 활용 (과하지 않게)
      2. 본문 요약은 정확히 3개의 bullet point(- 형태)로 작성할 것.
         - 각 bullet은 1~2문장, 핵심 팩트와 시사점 중심
         - 마지막 bullet에는 가능하면 시장 전망이나 임팩트를 담을 것
      3. 문체: 격조 있되 읽기 쉬운 어조. 과도한 감탄사나 이모지 금지.`;

        const prompt = `${basePrompt}

      기사 제목: ${title}
      기사 내용: ${summary}
      ${isEnglish ? '\n      ※ 영어 기사이므로 한국어로 번역하여 작성할 것.' : ''}

      응답은 반드시 JSON 형식으로만:
      {
        "title": "가공된 제목",
        "summary": "- bullet 1\\n- bullet 2\\n- bullet 3"
      }`;

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
