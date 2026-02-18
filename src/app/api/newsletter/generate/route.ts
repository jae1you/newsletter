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

function renderHeroArticle(article: NewsletterArticle): string {
    const sourceDomain = getSourceDomain(article);
    return `
          <tr>
            <td style="padding:30px 40px 0 40px;">
              ${article.imageUrl ? `
              <a href="${e(article.link)}" target="_blank" style="text-decoration:none;">
                <img src="${e(article.imageUrl)}" alt="" width="520" style="width:100%;max-width:520px;height:auto;border-radius:6px;display:block;border:1px solid #eee;" />
              </a>` : ''}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;">
                <tr>
                  <td>
                    <a href="${e(article.link)}" target="_blank" style="text-decoration:none;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;line-height:1.35;display:block;">
                      ${e(article.title)}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:10px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      ${formatBullets(article.summary)}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:10px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        ${article.faviconUrl ? `<td style="padding-right:6px;vertical-align:middle;"><img src="${e(article.faviconUrl)}" width="16" height="16" alt="" style="border-radius:2px;display:block;" /></td>` : ''}
                        <td style="color:#999;font-size:12px;vertical-align:middle;">${e(sourceDomain)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="padding:20px 40px 0 40px;"><div style="border-bottom:1px solid #e8e8e8;"></div></td></tr>`;
}

function renderCompactArticle(article: NewsletterArticle): string {
    const sourceDomain = getSourceDomain(article);
    return `
              <tr>
                <td style="padding:20px 0;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="vertical-align:top;${article.imageUrl ? 'width:65%;' : 'width:100%;'}padding-right:${article.imageUrl ? '16px' : '0'};">
                        <a href="${e(article.link)}" target="_blank" style="text-decoration:none;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;line-height:1.35;display:block;">
                          ${e(article.title)}
                        </a>
                        <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:8px;">
                          ${formatBullets(article.summary)}
                        </table>
                        <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:8px;">
                          <tr>
                            ${article.faviconUrl ? `<td style="padding-right:6px;vertical-align:middle;"><img src="${e(article.faviconUrl)}" width="14" height="14" alt="" style="border-radius:2px;display:block;" /></td>` : ''}
                            <td style="color:#999;font-size:11px;vertical-align:middle;">${e(sourceDomain)}</td>
                          </tr>
                        </table>
                      </td>
                      ${article.imageUrl ? `
                      <td style="vertical-align:top;width:35%;">
                        <a href="${e(article.link)}" target="_blank" style="text-decoration:none;">
                          <img src="${e(article.imageUrl)}" alt="" width="180" style="width:100%;max-width:180px;height:auto;border-radius:4px;display:block;border:1px solid #eee;" />
                        </a>
                      </td>` : ''}
                    </tr>
                  </table>
                </td>
              </tr>
              <tr><td><div style="border-bottom:1px solid #f0f0f0;"></div></td></tr>`;
}

function renderMadeleineItem(item: MadeleineNews): string {
    return `
              <tr>
                <td style="padding:16px 0;">
                  ${item.link
            ? `<a href="${e(item.link)}" target="_blank" style="text-decoration:none;color:#1a1a1a;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:700;display:block;margin-bottom:6px;">${e(item.title)}</a>`
            : `<p style="color:#1a1a1a;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:700;margin:0 0 6px 0;">${e(item.title)}</p>`
        }
                  <p style="color:#4a4a4a;font-size:14px;line-height:1.6;margin:0;">${e(item.content)}</p>
                </td>
              </tr>
              <tr><td><div style="border-bottom:1px solid #f0f0f0;"></div></td></tr>`;
}

function getSourceDomain(article: NewsletterArticle): string {
    if (article.source && article.source !== 'Naver' && article.source !== 'Google News') {
        return article.source;
    }
    try {
        return new URL(article.link).hostname.replace('www.', '');
    } catch {
        return article.source || '';
    }
}

function renderSectionHeader(title: string): string {
    return `
          <tr>
            <td style="padding:30px 40px 0 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-bottom:2px solid #1a1a1a;padding-bottom:8px;">
                    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:13px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:2px;">
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
  <title>Resale Times - ${e(date)}</title>
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
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap');

    /* Reset */
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }

    /* Responsive */
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .fluid-img { width: 100% !important; max-width: 100% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; }
      .stack-column img { width: 100% !important; max-width: 100% !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .mobile-center { text-align: center !important; }
      .mobile-hide { display: none !important; }
      .mobile-font-large { font-size: 28px !important; line-height: 1.2 !important; }
      .mobile-font-medium { font-size: 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f1ec;font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
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
                    <td style="text-align:left;vertical-align:bottom;">
                      <p style="margin:0;font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;">ISSUE ${e(issue)}</p>
                    </td>
                    <td style="text-align:center;">
                      <h1 style="margin:0;font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:36px;font-weight:900;color:#1a1a1a;letter-spacing:-0.5px;line-height:1;" class="mobile-font-large">
                        Resale Times
                      </h1>
                    </td>
                    <td style="text-align:right;vertical-align:bottom;">
                      <p style="margin:0;font-size:11px;color:#888;letter-spacing:1px;">${e(date)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-top:8px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#999;letter-spacing:3px;text-transform:uppercase;">Premium Secondhand Fashion Industry Report</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- International Section -->
      ${international.length > 0 ? `
      ${renderSectionHeader('Global Resale Trends')}
      ${international.length > 0 ? renderHeroArticle(international[0]) : ''}
      ${international.length > 1 ? `
      <tr>
        <td style="padding:10px 40px 0 40px;" class="mobile-padding">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${international.slice(1).map(renderCompactArticle).join('')}
          </table>
        </td>
      </tr>` : ''}` : ''}

      <!-- Domestic Section -->
      ${domestic.length > 0 ? `
      ${renderSectionHeader('Domestic Market Watch')}
      ${domestic.length > 0 ? renderHeroArticle(domestic[0]) : ''}
      ${domestic.length > 1 ? `
      <tr>
        <td style="padding:10px 40px 0 40px;" class="mobile-padding">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${domestic.slice(1).map(renderCompactArticle).join('')}
          </table>
        </td>
      </tr>` : ''}` : ''}

      <!-- Madeleine Memory Section -->
      ${madeleineNews.length > 0 ? `
      ${renderSectionHeader('Madeleine Memory News')}
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
                <p style="margin:0 0 4px 0;font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:16px;font-weight:700;color:#1a1a1a;">Resale Times</p>
                <p style="margin:0 0 2px 0;font-size:11px;color:#999;">by Madeleine Memory</p>
                <p style="margin:8px 0 0 0;font-size:10px;color:#ccc;">AI-powered curation for the resale industry</p>
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
