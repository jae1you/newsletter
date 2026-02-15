import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const { prompt } = await request.json();

        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key') {
            return NextResponse.json({
                imageUrl: `https://images.unsplash.com/photo-1521335629791-ce4aec67dd16?auto=format&fit=crop&q=80&w=800`
            });
        }

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: `A high-quality, professional editorial photo representing the news topic: ${prompt}. Minimalist, fashion-oriented style.`,
            n: 1,
            size: "1024x1024",
        });

        const imageUrl = response.data?.[0]?.url;

        if (!imageUrl) {
            throw new Error('이미지 생성 결과가 없습니다.');
        }

        return NextResponse.json({
            imageUrl: imageUrl
        });
    } catch (error) {
        console.error('AI Image Gen API Error:', error);
        return NextResponse.json({ error: '이미지 생성 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
