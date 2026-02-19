import { NextResponse } from 'next/server';

interface NewsletterArticle {
  title: string;
  summary: string;
  link: string;
  source: string;
  imageUrl?: string;
  faviconUrl?: string;
}

interface MadeleineNews {
  title: string;
  content: string;
  link: string;
  imageUrl?: string;
}

interface GenerateRequest {
  date: string;
  issueNumber: string;
  domestic: NewsletterArticle[];
  international: NewsletterArticle[];
  madeleineNews: MadeleineNews[];
}

function e(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBullets(summary: string): string {
  const lines = summary.split('\n').filter(line => line.trim());
  const bullets = lines.map(line => line.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  if (bullets.length === 0) return `<p style="margin:0;color:#4a4a4a;font-size:14px;line-height:1.7;">${e(summary)}</p>`;
  return bullets.slice(0, 3).map(b =>
    `<tr><td style="padding:0 0 6px 0;vertical-align:top;width:16px;color:#999;font-size:13px;">&#8226;</td><td style="padding:0 0 6px 8px;color:#4a4a4a;font-size:14px;line-height:1.6;">${e(b)}</td></tr>`
  ).join('');
}

// 모든 기사를 동일한 레이아웃으로 렌더링: 전체 너비 이미지 + 제목 + 내용 + 더보기 버튼
function renderArticle(article: NewsletterArticle): string {
  return `
          <tr>
            <td style="padding:24px 40px 0 40px;">
              ${article.imageUrl ? `
              <a href="${e(article.link)}" target="_blank" style="text-decoration:none;display:block;margin-bottom:14px;">
                <img src="${e(article.imageUrl)}" alt="" width="520" style="width:100%;max-width:520px;aspect-ratio:6/4;height:auto;object-fit:cover;border-radius:6px;display:block;border:1px solid #eee;" />
              </a>` : ''}
              <a href="${e(article.link)}" target="_blank" style="text-decoration:none;color:#1a1a1a;font-family:Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', system-ui, Roboto, sans-serif;font-size:20px;font-weight:700;line-height:1.35;display:block;margin-bottom:10px;">
                ${e(article.title)}
              </a>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:14px;font-family:Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', system-ui, Roboto, sans-serif;">
                ${formatBullets(article.summary)}
              </table>
              <div style="text-align:right;">
                <a href="${e(article.link)}" target="_blank" style="display:inline-block;padding:8px 18px;background-color:#1a1a1a;color:#ffffff;font-family:Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', system-ui, Roboto, sans-serif;font-size:12px;font-weight:700;letter-spacing:0.5px;text-decoration:none;border-radius:4px;">
                  기사읽기 →
                </a>
              </div>
            </td>
          </tr>
          <tr><td style="padding:20px 40px 0 40px;"><div style="border-bottom:1px solid #e8e8e8;"></div></td></tr>`;
}

function renderMadeleineItem(item: MadeleineNews): string {
  return `
              <tr>
                <td style="padding:16px 0;">
                  ${item.imageUrl ? `
                  <a href="${item.link ? e(item.link) : '#'}" target="_blank" style="text-decoration:none;display:block;margin-bottom:12px;">
                    <img src="${e(item.imageUrl)}" alt="" width="520" style="width:100%;max-width:520px;height:220px;object-fit:cover;border-radius:6px;display:block;border:1px solid #eee;" />
                  </a>` : ''}
                  ${item.link
      ? `<a href="${e(item.link)}" target="_blank" style="text-decoration:none;color:#1a1a1a;font-family:Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', system-ui, Roboto, sans-serif;font-size:16px;font-weight:700;display:block;margin-bottom:6px;">${e(item.title)}</a>`
      : `<p style="color:#1a1a1a;font-family:Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', system-ui, Roboto, sans-serif;font-size:16px;font-weight:700;margin:0 0 6px 0;">${e(item.title)}</p>`
    }
                  <p style="color:#4a4a4a;font-family:Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', system-ui, Roboto, sans-serif;font-size:14px;line-height:1.6;margin:0 0 10px 0;">${e(item.content)}</p>
                  ${item.link ? `
                  <div style="text-align:right;">
                    <a href="${e(item.link)}" target="_blank" style="display:inline-block;padding:7px 16px;background-color:#1a1a1a;color:#ffffff;font-family:Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', system-ui, Roboto, sans-serif;font-size:12px;font-weight:700;letter-spacing:0.5px;text-decoration:none;border-radius:4px;">
                      더보기 →
                    </a>
                  </div>` : ''}
                </td>
              </tr>
              <tr><td><div style="border-bottom:1px solid #f0f0f0;"></div></td></tr>`;
}

function renderSectionHeader(title: string): string {
  return `
          <tr>
            <td style="padding:30px 40px 0 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-bottom:2px solid #1a1a1a;padding-bottom:8px;">
                    <p style="margin:0;font-family:Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', system-ui, Roboto, sans-serif;font-size:13px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:2px;">
                      ${title}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

export async function POST(request: Request) {
  try {
    const { date, issueNumber, domestic, international, madeleineNews } = await request.json() as GenerateRequest;

    const issue = issueNumber || '#01';

    const html = `<!DOCTYPE html>
<html lang="ko" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>The Resale Times - ${e(date)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

    /* Reset */
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', system-ui, Roboto, sans-serif; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }

    /* Responsive */
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 102% !important; }
      .fluid-img { width: 100% !important; max-width: 100% !important; height: auto !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .mobile-center { text-align: center !important; }
      .mobile-hide { display: none !important; }
      .mobile-font-large { font-size: 28px !important; line-height: 1.2 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f1ec;font-family:Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', system-ui, Roboto, sans-serif;">
  <center style="width:100%;background-color:#f4f1ec;">
    <!--[if mso]><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center"><tr><td><![endif]-->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="margin:0 auto;max-width:600px;background-color:#ffffff;">

      <!-- Header -->
      <tr>
        <td style="padding:32px 40px 24px 40px;background-color:#ffffff;" class="mobile-padding">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="border-bottom:3px double #1a1a1a;padding-bottom:16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="60" style="text-align:left;vertical-align:bottom;">
                    </td>
                    <td style="text-align:center;">
                      <h1 style="margin:0;font-family:Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', system-ui, Roboto, sans-serif;font-size:36px;font-weight:900;color:#1a1a1a;letter-spacing:-1px;line-height:1.2;white-space:nowrap;" class="mobile-font-large">
                        The Resale Times
                      </h1>
                    </td>
                    <td width="60" style="text-align:right;vertical-align:bottom;">
                      <p style="margin:0;font-size:11px;color:#888;letter-spacing:0.5px;white-space:nowrap;">${e(date)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-top:8px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#999;letter-spacing:3px;text-transform:uppercase;">Premium Resale Fashion Industry Report</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- International Section -->
      ${international.length > 0 ? `
      ${renderSectionHeader('Global Resale Trends')}
      ${international.map(renderArticle).join('')}` : ''}

      <!-- Domestic Section -->
      ${domestic.length > 0 ? `
      ${renderSectionHeader('Domestic Market Watch')}
      ${domestic.map(renderArticle).join('')}` : ''}

      <!-- RELAY Section -->
      ${madeleineNews.length > 0 ? `
      ${renderSectionHeader('RELAY News')}
      <tr>
        <td style="padding:10px 40px 0 40px;" class="mobile-padding">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${madeleineNews.map(renderMadeleineItem).join('')}
          </table>
        </td>
      </tr>` : ''}

      <!-- Footer -->
      <tr>
        <td style="padding:30px 40px 40px 40px;" class="mobile-padding">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="border-top:2px solid #1a1a1a;padding-top:16px;text-align:center;">
                <p style="margin:0 0 4px 0;font-family:Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', system-ui, Roboto, sans-serif;font-size:16px;font-weight:700;color:#1a1a1a;">The Resale Times</p>
                <p style="margin:0;font-size:11px;color:#999;font-family:Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', system-ui, Roboto, sans-serif;">by <a href="https://the-relay.com" target="_blank" style="color:#999;text-decoration:underline;">RELAY</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </center>
</body>
</html>`;

    return NextResponse.json({ html });
  } catch (error) {
    console.error('Newsletter Generate API Error:', error);
    return NextResponse.json({ error: '뉴스레터 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
