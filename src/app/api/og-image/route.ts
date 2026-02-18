import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json({ imageUrl: '', faviconUrl: '' });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        let imageUrl = '';
        let faviconUrl = '';

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; NewsletterBot/1.0)',
                    'Accept': 'text/html',
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

            if (ogImageMatch?.[1]) {
                imageUrl = ogImageMatch[1];
                // Handle relative URLs
                if (imageUrl.startsWith('/')) {
                    const urlObj = new URL(url);
                    imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
                }
            }

            // Extract domain for favicon
            const urlObj = new URL(url);
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
