import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json({ imageUrl: '', faviconUrl: '' });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        let imageUrl = '';
        let faviconUrl = '';

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'no-cache',
                },
                redirect: 'follow',
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            // Only read first 50KB to find meta tags
            const reader = response.body?.getReader();
            let html = '';
            if (reader) {
                const decoder = new TextDecoder();
                let bytesRead = 0;
                while (bytesRead < 50000) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    html += decoder.decode(value, { stream: true });
                    bytesRead += value.length;
                }
                reader.cancel();
            }

            // Extract og:image
            const ogImageMatch = html.match(
                /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
            ) || html.match(
                /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i
            );

            // 최종 리다이렉트된 URL 사용 (Google News 등 리다이렉트 처리)
            const finalUrl = response.url || url;

            if (ogImageMatch?.[1]) {
                imageUrl = ogImageMatch[1];
                // Handle relative URLs
                if (imageUrl.startsWith('/')) {
                    const urlObj = new URL(finalUrl);
                    imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
                }
            }

            // Extract domain for favicon (최종 URL 기준)
            const urlObj = new URL(finalUrl);
            faviconUrl = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;

        } catch (fetchError) {
            clearTimeout(timeout);
            // Even if page fetch fails, we can still get favicon
            try {
                const urlObj = new URL(url);
                faviconUrl = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
            } catch {
                // Invalid URL
            }
        }

        return NextResponse.json({ imageUrl, faviconUrl });
    } catch (error) {
        console.error('OG Image API Error:', error);
        return NextResponse.json({ imageUrl: '', faviconUrl: '' });
    }
}
