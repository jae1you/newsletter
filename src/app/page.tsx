'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import NewsCard from '@/components/NewsCard';

interface NewsItem {
  id: string;
  title: string;
  link: string;
  summary: string;
  imageUrl?: string;
  source: string;
  date: string;
  transformedTitle?: string;
  transformedSummary?: string;
  isTransforming?: boolean;
  ogImageUrl?: string;
  faviconUrl?: string;
}

interface MadeleineNewsItem {
  title: string;
  content: string;
  link: string;
}

interface EditableArticle {
  id: string;
  title: string;
  summary: string;
  link: string;
  source: string;
  imageUrl: string;
  faviconUrl: string;
}

type Step = 'collect' | 'curate' | 'newsletter';
type EditorView = 'edit' | 'preview';

export default function Home() {
  const [naverKeywords, setNaverKeywords] = useState<string[]>([
    '중고패션', '중고패션시장', '마들렌메모리', '중고의류시장', '패션리세일'
  ]);
  const [newNaverKeyword, setNewNaverKeyword] = useState<string>('');
  const [googleKeywords, setGoogleKeywords] = useState<string[]>([
    'Resale as a Service', 'secondhand fashion', 'fashion resale market'
  ]);
  const [newGoogleKeyword, setNewGoogleKeyword] = useState<string>('');
  const [includeInternational, setIncludeInternational] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState({ year: 0, month: 0 });
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTransformingTotal, setIsTransformingTotal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'naver' | 'international'>('naver');
  const [rssStatus, setRssStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Curation states
  const [currentStep, setCurrentStep] = useState<Step>('collect');
  const [isCurating, setIsCurating] = useState(false);
  const [curatedDomestic, setCuratedDomestic] = useState<string[]>([]);
  const [curatedInternational, setCuratedInternational] = useState<string[]>([]);
  const [curationReasoning, setCurationReasoning] = useState('');
  const [madeleineNews, setMadeleineNews] = useState<MadeleineNewsItem[]>([
    { title: '', content: '', link: '' }
  ]);

  // Newsletter editor states
  const [editorView, setEditorView] = useState<EditorView>('edit');
  const [editDomestic, setEditDomestic] = useState<EditableArticle[]>([]);
  const [editInternational, setEditInternational] = useState<EditableArticle[]>([]);
  const [editMadeleine, setEditMadeleine] = useState<MadeleineNewsItem[]>([]);
  const [issueNumber, setIssueNumber] = useState('#01');
  const [newsletterHtml, setNewsletterHtml] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);

  const filteredNews = useMemo(() => {
    const naver = newsList.filter(n => n.source === 'Naver');
    const international = newsList.filter(n => n.source !== 'Naver');
    return { naver, international };
  }, [newsList]);

  const addNaverKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newNaverKeyword.trim()) {
      if (!naverKeywords.includes(newNaverKeyword.trim())) {
        setNaverKeywords([...naverKeywords, newNaverKeyword.trim()]);
      }
      setNewNaverKeyword('');
    }
  };

  const removeNaverKeyword = (tag: string) => {
    setNaverKeywords(naverKeywords.filter(k => k !== tag));
  };

  const addGoogleKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newGoogleKeyword.trim()) {
      if (!googleKeywords.includes(newGoogleKeyword.trim())) {
        setGoogleKeywords([...googleKeywords, newGoogleKeyword.trim()]);
      }
      setNewGoogleKeyword('');
    }
  };

  const removeGoogleKeyword = (tag: string) => {
    setGoogleKeywords(googleKeywords.filter(k => k !== tag));
  };

  const handleFetchNews = async () => {
    if (dateRange.year === 0 || dateRange.month === 0) {
      alert('뉴스 수집을 위해 연도와 월을 반드시 선택해 주세요.');
      return;
    }

    setIsLoading(true);
    setRssStatus('idle');
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naverKeywords, googleKeywords, includeInternational, ...dateRange })
      });

      if (!response.ok) throw new Error('Search failed');

      const newData: NewsItem[] = await response.json();

      if (Array.isArray(newData)) {
        setNewsList(prev => {
          const existingLinks = new Set(prev.map(n => n.link));
          const uniqueNewItems = newData.filter(n => !existingLinks.has(n.link));
          return [...prev, ...uniqueNewItems];
        });

        const hasInternational = newData.some(n => n.source !== 'Naver');
        setRssStatus(includeInternational ? (hasInternational ? 'success' : 'error') : 'idle');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setRssStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleTransform = async () => {
    if (selectedIds.length === 0) return;
    setIsTransformingTotal(true);

    const updatedNews = [...newsList];

    for (const id of selectedIds) {
      const index = updatedNews.findIndex(n => n.id === id);
      if (index === -1) continue;

      updatedNews[index] = { ...updatedNews[index], isTransforming: true };
      setNewsList([...updatedNews]);

      try {
        const item = updatedNews[index];
        const isEnglish = /[a-zA-Z]/.test(item.title);

        const response = await fetch('/api/ai/transform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: item.title, summary: item.summary, isEnglish })
        });
        const result = await response.json();

        let finalImageUrl = item.imageUrl;
        if (!finalImageUrl) {
          const imgResponse = await fetch('/api/ai/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: item.title })
          });
          const imgResult = await imgResponse.json();
          finalImageUrl = imgResult.imageUrl;
        }

        updatedNews[index] = {
          ...item,
          transformedTitle: result.title,
          transformedSummary: result.summary,
          imageUrl: finalImageUrl,
          isTransforming: false
        };
        setNewsList([...updatedNews]);
      } catch (error) {
        console.error('Transform error:', error);
        updatedNews[index].isTransforming = false;
        setNewsList([...updatedNews]);
      }
    }

    setIsTransformingTotal(false);
  };

  // Fetch OG image and favicon for a URL
  const fetchOgImage = useCallback(async (url: string): Promise<{ imageUrl: string; faviconUrl: string }> => {
    try {
      const resp = await fetch('/api/og-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      return await resp.json();
    } catch {
      return { imageUrl: '', faviconUrl: '' };
    }
  }, []);

  // AI Auto-Curation
  const handleCurate = async () => {
    if (newsList.length === 0) {
      alert('먼저 뉴스를 수집해 주세요.');
      return;
    }
    setIsCurating(true);
    try {
      const articles = newsList.map(n => ({
        id: n.id,
        title: n.title,
        summary: n.summary,
        source: n.source,
        date: n.date
      }));

      const response = await fetch('/api/ai/curate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles })
      });

      if (!response.ok) throw new Error('Curation failed');
      const result = await response.json();

      setCuratedDomestic(result.domestic || []);
      setCuratedInternational(result.international || []);
      setCurationReasoning(result.reasoning || '');

      const allCurated = [...(result.domestic || []), ...(result.international || [])];
      setSelectedIds(allCurated);

      // Auto-transform + fetch OG images for curated articles
      const updatedNews = [...newsList];
      for (const id of allCurated) {
        const index = updatedNews.findIndex(n => n.id === id);
        if (index === -1) continue;

        const item = updatedNews[index];

        // Skip if already transformed
        if (!item.transformedTitle) {
          updatedNews[index] = { ...updatedNews[index], isTransforming: true };
          setNewsList([...updatedNews]);

          try {
            const isEnglish = /[a-zA-Z]/.test(item.title);
            const resp = await fetch('/api/ai/transform', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: item.title, summary: item.summary, isEnglish })
            });
            const transformResult = await resp.json();

            updatedNews[index] = {
              ...updatedNews[index],
              transformedTitle: transformResult.title,
              transformedSummary: transformResult.summary,
              isTransforming: false
            };
          } catch {
            updatedNews[index] = { ...updatedNews[index], isTransforming: false };
          }
        }

        // Fetch OG image if not already set
        if (!item.ogImageUrl) {
          try {
            const ogData = await fetchOgImage(item.link);
            updatedNews[index] = {
              ...updatedNews[index],
              ogImageUrl: ogData.imageUrl,
              faviconUrl: ogData.faviconUrl
            };
          } catch {
            // ignore
          }
        }

        setNewsList([...updatedNews]);
      }

      setCurrentStep('curate');
    } catch (error) {
      console.error('Curation error:', error);
      alert('AI 큐레이션 중 오류가 발생했습니다.');
    } finally {
      setIsCurating(false);
    }
  };

  const toggleCuratedArticle = (id: string, section: 'domestic' | 'international') => {
    if (section === 'domestic') {
      setCuratedDomestic(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    } else {
      setCuratedInternational(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    }
  };

  const addMadeleineItem = () => {
    setMadeleineNews([...madeleineNews, { title: '', content: '', link: '' }]);
  };

  const removeMadeleineItem = (index: number) => {
    setMadeleineNews(madeleineNews.filter((_, i) => i !== index));
  };

  const updateMadeleineItem = (index: number, field: keyof MadeleineNewsItem, value: string) => {
    const updated = [...madeleineNews];
    updated[index] = { ...updated[index], [field]: value };
    setMadeleineNews(updated);
  };

  // Prepare editor data and go to Step 3
  const handleGoToEditor = () => {
    const toEditable = (ids: string[]): EditableArticle[] =>
      ids.map(id => {
        const n = newsList.find(a => a.id === id);
        if (!n) return null;
        return {
          id: n.id,
          title: n.transformedTitle || n.title,
          summary: n.transformedSummary || n.summary,
          link: n.link,
          source: n.source,
          imageUrl: n.ogImageUrl || n.imageUrl || '',
          faviconUrl: n.faviconUrl || '',
        };
      }).filter(Boolean) as EditableArticle[];

    setEditDomestic(toEditable(curatedDomestic));
    setEditInternational(toEditable(curatedInternational));
    setEditMadeleine(madeleineNews.filter(m => m.title.trim()));
    setEditorView('edit');
    setCurrentStep('newsletter');
  };

  // Editor CRUD helpers
  const updateEditArticle = (section: 'domestic' | 'international', index: number, field: keyof EditableArticle, value: string) => {
    const setter = section === 'domestic' ? setEditDomestic : setEditInternational;
    setter(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeEditArticle = (section: 'domestic' | 'international', index: number) => {
    const setter = section === 'domestic' ? setEditDomestic : setEditInternational;
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const moveEditArticle = (section: 'domestic' | 'international', index: number, direction: -1 | 1) => {
    const setter = section === 'domestic' ? setEditDomestic : setEditInternational;
    setter(prev => {
      const copy = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= copy.length) return copy;
      [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
      return copy;
    });
  };

  const addEditMadeleineItem = () => {
    setEditMadeleine([...editMadeleine, { title: '', content: '', link: '' }]);
  };

  const removeEditMadeleineItem = (index: number) => {
    setEditMadeleine(editMadeleine.filter((_, i) => i !== index));
  };

  const updateEditMadeleineItem = (index: number, field: keyof MadeleineNewsItem, value: string) => {
    const updated = [...editMadeleine];
    updated[index] = { ...updated[index], [field]: value };
    setEditMadeleine(updated);
  };

  // Generate newsletter HTML from editor data
  const handleGenerateNewsletter = async () => {
    setIsGenerating(true);
    try {
      const dateStr = dateRange.year && dateRange.month
        ? `${dateRange.year}년 ${dateRange.month}월`
        : new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

      const response = await fetch('/api/newsletter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          issueNumber,
          domestic: editDomestic,
          international: editInternational,
          madeleineNews: editMadeleine.filter(m => m.title.trim())
        })
      });

      if (!response.ok) throw new Error('Generation failed');
      const result = await response.json();
      setNewsletterHtml(result.html);
      setEditorView('preview');
    } catch (error) {
      console.error('Generate error:', error);
      alert('뉴스레터 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(newsletterHtml);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = newsletterHtml;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([newsletterHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = dateRange.year && dateRange.month
      ? `${dateRange.year}-${String(dateRange.month).padStart(2, '0')}`
      : 'newsletter';
    a.href = url;
    a.download = `resale-times-${dateStr}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentList = activeTab === 'naver' ? filteredNews.naver : filteredNews.international;
  const getArticleById = (id: string) => newsList.find(n => n.id === id);

  // Render an article editor card
  const renderEditCard = (article: EditableArticle, index: number, section: 'domestic' | 'international', total: number) => (
    <div key={article.id} className="border border-border rounded-lg p-4 mb-3 relative group">
      <div className="absolute top-2 right-2 flex gap-1">
        <button
          onClick={() => moveEditArticle(section, index, -1)}
          disabled={index === 0}
          className="w-7 h-7 rounded border border-border text-xs text-gray-400 hover:text-accent hover:border-accent disabled:opacity-30 transition-colors"
          title="위로"
        >
          ↑
        </button>
        <button
          onClick={() => moveEditArticle(section, index, 1)}
          disabled={index === total - 1}
          className="w-7 h-7 rounded border border-border text-xs text-gray-400 hover:text-accent hover:border-accent disabled:opacity-30 transition-colors"
          title="아래로"
        >
          ↓
        </button>
        <button
          onClick={() => removeEditArticle(section, index)}
          className="w-7 h-7 rounded border border-border text-xs text-gray-400 hover:text-red-500 hover:border-red-500 transition-colors"
          title="삭제"
        >
          ×
        </button>
      </div>

      <div className="flex gap-4 pr-24">
        {article.imageUrl ? (
          <div className="flex-shrink-0 w-24 h-24 rounded overflow-hidden border border-border bg-gray-50">
            <img src={article.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="flex-shrink-0 w-24 h-24 rounded border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
            No Image
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-2">
          <input
            type="text"
            value={article.title}
            onChange={(ev) => updateEditArticle(section, index, 'title', ev.target.value)}
            className="input-field text-sm font-bold"
            placeholder="제목"
          />
          <textarea
            value={article.summary}
            onChange={(ev) => updateEditArticle(section, index, 'summary', ev.target.value)}
            className="input-field text-sm min-h-[60px] resize-y"
            placeholder="요약 (- bullet point 형태)"
          />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          type="text"
          value={article.imageUrl}
          onChange={(ev) => updateEditArticle(section, index, 'imageUrl', ev.target.value)}
          className="input-field text-xs"
          placeholder="이미지 URL"
        />
        <input
          type="text"
          value={article.link}
          onChange={(ev) => updateEditArticle(section, index, 'link', ev.target.value)}
          className="input-field text-xs"
          placeholder="원문 링크"
        />
      </div>
    </div>
  );

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto bg-white text-foreground">
      <header className="mb-12 flex flex-col items-center">
        <div className="bg-accent/5 px-4 py-1.5 rounded-full text-accent text-xs font-bold mb-4 tracking-widest uppercase">
          Newsletter AI Assistant
        </div>
        <h1 className="text-4xl font-extrabold mb-2 tracking-tight">Resale Times</h1>
        <p className="text-text-muted text-lg font-medium">프리미엄 중고의류 뉴스레터 자동 생성기</p>
      </header>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-4 mb-10">
        {[
          { key: 'collect' as Step, label: '1. 뉴스 수집', icon: '🔍' },
          { key: 'curate' as Step, label: '2. AI 큐레이션', icon: '🤖' },
          { key: 'newsletter' as Step, label: '3. 뉴스레터', icon: '📧' },
        ].map((step, i) => (
          <div key={step.key} className="flex items-center gap-4">
            {i > 0 && <div className={`w-12 h-0.5 ${currentStep === step.key || (i === 1 && currentStep === 'newsletter') ? 'bg-accent' : 'bg-gray-200'}`}></div>}
            <button
              onClick={() => {
                if (step.key === 'collect') setCurrentStep('collect');
                else if (step.key === 'curate' && (curatedDomestic.length > 0 || curatedInternational.length > 0)) setCurrentStep('curate');
                else if (step.key === 'newsletter' && (editDomestic.length > 0 || editInternational.length > 0)) setCurrentStep('newsletter');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                currentStep === step.key
                  ? 'bg-accent text-white shadow-lg shadow-accent/20'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <span>{step.icon}</span>
              {step.label}
            </button>
          </div>
        ))}
      </div>

      {/* Step 1: Collect */}
      {currentStep === 'collect' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <aside className="lg:col-span-1 space-y-6">
            <section className="premium-card">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                기간 설정
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="input-field text-sm font-medium"
                  value={dateRange.year}
                  onChange={(e) => setDateRange({ ...dateRange, year: parseInt(e.target.value) })}
                >
                  <option value="0">연도 선택</option>
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select
                  className="input-field text-sm font-medium"
                  value={dateRange.month}
                  onChange={(e) => setDateRange({ ...dateRange, month: parseInt(e.target.value) })}
                >
                  <option value="0">월 선택</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{m}월</option>
                  ))}
                </select>
              </div>
            </section>

            <section className="premium-card">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                네이버 키워드
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {naverKeywords.map(tag => (
                  <span key={tag} className="bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all hover:bg-green-100">
                    {tag}
                    <button onClick={() => removeNaverKeyword(tag)} className="text-green-400 hover:text-red-500 font-bold">×</button>
                  </span>
                ))}
              </div>
              <input type="text" placeholder="네이버 검색 키워드 추가..." className="input-field text-sm" value={newNaverKeyword} onChange={(e) => setNewNaverKeyword(e.target.value)} onKeyDown={addNaverKeyword} />
            </section>

            <section className="premium-card">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                Google News 키워드
              </h2>
              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <div className="relative">
                  <input type="checkbox" checked={includeInternational} onChange={(e) => setIncludeInternational(e.target.checked)} className="sr-only peer" />
                  <div className="w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-accent transition-colors"></div>
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-5 transition-transform"></div>
                </div>
                <span className="text-sm font-medium">해외 뉴스 수집</span>
              </label>
              {includeInternational && (
                <>
                  <div className="flex flex-wrap gap-2 mb-4 mt-3">
                    {googleKeywords.map(tag => (
                      <span key={tag} className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all hover:bg-blue-100">
                        {tag}
                        <button onClick={() => removeGoogleKeyword(tag)} className="text-blue-400 hover:text-red-500 font-bold">×</button>
                      </span>
                    ))}
                  </div>
                  <input type="text" placeholder="Google 검색 키워드 추가 (영문 권장)..." className="input-field text-sm" value={newGoogleKeyword} onChange={(e) => setNewGoogleKeyword(e.target.value)} onKeyDown={addGoogleKeyword} />
                </>
              )}
              {rssStatus === 'success' && <p className="text-xs text-green-600 font-medium mt-2">해외 뉴스 {filteredNews.international.length}건 수집 완료</p>}
              {rssStatus === 'error' && <p className="text-xs text-red-500 font-medium mt-2">Google News 수집에 실패했습니다. 다시 시도해주세요.</p>}
            </section>

            <button onClick={handleFetchNews} disabled={isLoading || isTransformingTotal} className="btn-primary w-full py-4 text-base font-bold flex items-center justify-center gap-3">
              {isLoading ? (<><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>수집 중...</>) : '실시간 뉴스 수집하기'}
            </button>

            {newsList.length > 0 && (
              <button onClick={handleCurate} disabled={isCurating || isTransformingTotal} className="w-full py-4 text-base font-bold flex items-center justify-center gap-3 rounded-lg border-2 border-accent text-accent hover:bg-accent hover:text-white transition-all">
                {isCurating ? (<><span className="w-4 h-4 border-2 border-accent/20 border-t-accent rounded-full animate-spin"></span>AI 큐레이션 중...</>) : (<>🤖 AI 자동 큐레이션</>)}
              </button>
            )}
          </aside>

          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-1">
              <div className="flex gap-2">
                <button onClick={() => setActiveTab('naver')} className={`tab-btn relative ${activeTab === 'naver' ? 'active' : ''}`}>
                  네이버 뉴스 <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'naver' ? 'bg-accent/10' : 'bg-gray-100'}`}>{filteredNews.naver.length}</span>
                </button>
                <button onClick={() => setActiveTab('international')} className={`tab-btn relative ${activeTab === 'international' ? 'active' : ''}`}>
                  해외 뉴스 <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'international' ? 'bg-accent/10' : 'bg-gray-100'}`}>{filteredNews.international.length}</span>
                </button>
              </div>
              {selectedIds.length > 0 && (
                <button onClick={handleTransform} disabled={isTransformingTotal} className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-accent/20 flex items-center gap-2 hover:scale-105 transition-transform">
                  {isTransformingTotal ? 'AI 처리 중...' : `${selectedIds.length}개 AI 변환`}
                </button>
              )}
            </div>

            <div className="min-h-[500px]">
              {currentList.length > 0 ? (
                <div className="space-y-4 animate-in fade-in duration-500">
                  {currentList.map(item => (
                    <div key={item.id} className="relative group">
                      {item.isTransforming && (
                        <div className="absolute inset-0 bg-white/60 z-10 rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                          <div className="text-accent flex items-center gap-2 font-bold animate-pulse text-sm">AI 분석 중...</div>
                        </div>
                      )}
                      <NewsCard item={{ ...item, title: item.transformedTitle || item.title, summary: item.transformedSummary || item.summary }} isSelected={selectedIds.includes(item.id)} onToggle={toggleSelection} />
                      {item.transformedTitle && <div className="absolute top-2 left-2 bg-accent text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm z-20">AI ENHANCED</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="premium-card bg-gray-50/50 border-dashed border-2 flex flex-col items-center justify-center py-20 text-center">
                  {activeTab === 'international' && !includeInternational ? (
                    <div className="animate-in slide-in-from-bottom-2 duration-500">
                      <div className="text-5xl mb-6">🌐</div>
                      <h3 className="text-lg font-bold mb-2 text-blue-600">해외 뉴스 수집이 꺼져 있습니다</h3>
                      <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">왼쪽의 &quot;해외 뉴스 (RSS)&quot; 섹션에서 토글을 켜고 수집 버튼을 눌러주세요.</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-5xl mb-6">🔍</div>
                      <h3 className="text-lg font-bold mb-1">{activeTab === 'naver' ? '네이버' : '해외 미디어'}에서 수집된 뉴스가 없습니다</h3>
                      <p className="text-xs text-text-muted">연도/월을 선택하고 수집 버튼을 눌러주세요.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Curate */}
      {currentStep === 'curate' && (
        <div className="space-y-8">
          {curationReasoning && (
            <div className="premium-card bg-blue-50/50 border-blue-200">
              <p className="text-sm text-blue-800 font-medium">
                <span className="font-bold">AI 선별 근거:</span> {curationReasoning}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-xl">🌏</span>
                해외 기사 ({curatedInternational.length}개 선별)
              </h2>
              <div className="space-y-3">
                {curatedInternational.map(id => {
                  const article = getArticleById(id);
                  if (!article) return null;
                  return (
                    <div key={id} className="premium-card flex items-start gap-3 py-3 px-4">
                      <input type="checkbox" checked={true} onChange={() => toggleCuratedArticle(id, 'international')} className="w-4 h-4 accent-accent mt-1 cursor-pointer" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold truncate">{article.transformedTitle || article.title}</h4>
                        <p className="text-xs text-text-muted mt-1 line-clamp-2">{article.transformedSummary || article.summary}</p>
                      </div>
                      {article.ogImageUrl && <img src={article.ogImageUrl} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0" />}
                    </div>
                  );
                })}
                {filteredNews.international.filter(n => !curatedInternational.includes(n.id)).slice(0, 5).map(article => (
                  <div key={article.id} className="premium-card flex items-start gap-3 py-3 px-4 opacity-50 hover:opacity-100 transition-opacity">
                    <input type="checkbox" checked={false} onChange={() => toggleCuratedArticle(article.id, 'international')} className="w-4 h-4 accent-accent mt-1 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold truncate">{article.transformedTitle || article.title}</h4>
                      <p className="text-xs text-text-muted mt-1 line-clamp-2">{article.transformedSummary || article.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-xl">🇰🇷</span>
                국내 기사 ({curatedDomestic.length}개 선별)
              </h2>
              <div className="space-y-3">
                {curatedDomestic.map(id => {
                  const article = getArticleById(id);
                  if (!article) return null;
                  return (
                    <div key={id} className="premium-card flex items-start gap-3 py-3 px-4">
                      <input type="checkbox" checked={true} onChange={() => toggleCuratedArticle(id, 'domestic')} className="w-4 h-4 accent-accent mt-1 cursor-pointer" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold truncate">{article.transformedTitle || article.title}</h4>
                        <p className="text-xs text-text-muted mt-1 line-clamp-2">{article.transformedSummary || article.summary}</p>
                      </div>
                      {article.ogImageUrl && <img src={article.ogImageUrl} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0" />}
                    </div>
                  );
                })}
                {filteredNews.naver.filter(n => !curatedDomestic.includes(n.id)).slice(0, 5).map(article => (
                  <div key={article.id} className="premium-card flex items-start gap-3 py-3 px-4 opacity-50 hover:opacity-100 transition-opacity">
                    <input type="checkbox" checked={false} onChange={() => toggleCuratedArticle(article.id, 'domestic')} className="w-4 h-4 accent-accent mt-1 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold truncate">{article.transformedTitle || article.title}</h4>
                      <p className="text-xs text-text-muted mt-1 line-clamp-2">{article.transformedSummary || article.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Madeleine Memory News */}
          <div className="premium-card">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-xl">💬</span>
              마들렌메모리 뉴스
            </h2>
            <p className="text-sm text-text-muted mb-4">뉴스레터에 포함할 자체 소식을 직접 입력해 주세요.</p>
            {madeleineNews.map((item, index) => (
              <div key={index} className="border border-border rounded-lg p-4 mb-3 relative">
                {madeleineNews.length > 1 && (
                  <button onClick={() => removeMadeleineItem(index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-lg font-bold">×</button>
                )}
                <input type="text" placeholder="제목" className="input-field text-sm mb-2 font-bold" value={item.title} onChange={(e) => updateMadeleineItem(index, 'title', e.target.value)} />
                <textarea placeholder="내용" className="input-field text-sm mb-2 min-h-[60px] resize-y" value={item.content} onChange={(e) => updateMadeleineItem(index, 'content', e.target.value)} />
                <input type="text" placeholder="링크 (선택사항)" className="input-field text-sm" value={item.link} onChange={(e) => updateMadeleineItem(index, 'link', e.target.value)} />
              </div>
            ))}
            <button onClick={addMadeleineItem} className="text-sm text-accent font-bold hover:underline">+ 항목 추가</button>
          </div>

          <div className="flex justify-center gap-4">
            <button onClick={() => setCurrentStep('collect')} className="px-6 py-3 rounded-lg text-sm font-bold border border-border text-text-muted hover:bg-gray-50 transition-colors">뒤로 가기</button>
            <button
              onClick={handleGoToEditor}
              disabled={curatedDomestic.length === 0 && curatedInternational.length === 0}
              className="btn-primary px-8 py-3 text-base font-bold flex items-center gap-2"
            >
              📧 뉴스레터 편집하기
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Newsletter Editor & Preview */}
      {currentStep === 'newsletter' && (
        <div className="space-y-6">
          {/* Editor / Preview Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setEditorView('edit')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${editorView === 'edit' ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                편집
              </button>
              <button
                onClick={() => { if (newsletterHtml) setEditorView('preview'); else handleGenerateNewsletter(); }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${editorView === 'preview' ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                미리보기
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCurrentStep('curate')} className="px-4 py-2 rounded-lg text-sm font-bold border border-border text-text-muted hover:bg-gray-50 transition-colors">뒤로 가기</button>
              {editorView === 'edit' ? (
                <button
                  onClick={handleGenerateNewsletter}
                  disabled={isGenerating}
                  className="btn-primary px-4 py-2 text-sm font-bold flex items-center gap-2"
                >
                  {isGenerating ? (<><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>생성 중...</>) : 'HTML 생성 & 미리보기'}
                </button>
              ) : (
                <>
                  <button onClick={handleCopyHtml} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${copySuccess ? 'bg-green-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                    {copySuccess ? 'HTML 복사 완료!' : '📋 HTML 복사'}
                  </button>
                  <button onClick={handleDownloadHtml} className="btn-primary px-4 py-2 text-sm font-bold flex items-center gap-2">
                    ⬇ HTML 다운로드
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Editor View */}
          {editorView === 'edit' && (
            <div className="space-y-8">
              {/* Issue number */}
              <div className="premium-card">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-bold whitespace-nowrap">Issue 번호</label>
                  <input type="text" value={issueNumber} onChange={(e) => setIssueNumber(e.target.value)} className="input-field text-sm w-32" placeholder="#01" />
                </div>
              </div>

              {/* International articles editor */}
              {editInternational.length > 0 && (
                <div>
                  <h3 className="text-base font-bold mb-3 flex items-center gap-2 tracking-wide uppercase">
                    Global Resale Trends
                    <span className="text-xs font-normal text-text-muted normal-case tracking-normal">({editInternational.length})</span>
                  </h3>
                  {editInternational.map((article, i) => renderEditCard(article, i, 'international', editInternational.length))}
                </div>
              )}

              {/* Domestic articles editor */}
              {editDomestic.length > 0 && (
                <div>
                  <h3 className="text-base font-bold mb-3 flex items-center gap-2 tracking-wide uppercase">
                    Domestic Market Watch
                    <span className="text-xs font-normal text-text-muted normal-case tracking-normal">({editDomestic.length})</span>
                  </h3>
                  {editDomestic.map((article, i) => renderEditCard(article, i, 'domestic', editDomestic.length))}
                </div>
              )}

              {/* Madeleine editor */}
              <div>
                <h3 className="text-base font-bold mb-3 flex items-center gap-2 tracking-wide uppercase">
                  Madeleine Memory News
                  <span className="text-xs font-normal text-text-muted normal-case tracking-normal">({editMadeleine.length})</span>
                </h3>
                {editMadeleine.map((item, index) => (
                  <div key={index} className="border border-border rounded-lg p-4 mb-3 relative">
                    <button onClick={() => removeEditMadeleineItem(index)} className="absolute top-2 right-2 w-7 h-7 rounded border border-border text-xs text-gray-400 hover:text-red-500 hover:border-red-500 transition-colors">×</button>
                    <input type="text" placeholder="제목" className="input-field text-sm mb-2 font-bold" value={item.title} onChange={(e) => updateEditMadeleineItem(index, 'title', e.target.value)} />
                    <textarea placeholder="내용" className="input-field text-sm mb-2 min-h-[50px] resize-y" value={item.content} onChange={(e) => updateEditMadeleineItem(index, 'content', e.target.value)} />
                    <input type="text" placeholder="링크 (선택사항)" className="input-field text-xs" value={item.link} onChange={(e) => updateEditMadeleineItem(index, 'link', e.target.value)} />
                  </div>
                ))}
                <button onClick={addEditMadeleineItem} className="text-sm text-accent font-bold hover:underline">+ 항목 추가</button>
              </div>
            </div>
          )}

          {/* Preview View */}
          {editorView === 'preview' && (
            <div className="newsletter-preview-container">
              <iframe
                ref={previewRef}
                srcDoc={newsletterHtml}
                className="newsletter-preview-iframe"
                title="Newsletter Preview"
              />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
