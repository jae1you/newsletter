'use client';

import { useState, useMemo } from 'react';
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
}

export default function Home() {
  const [keywords, setKeywords] = useState<string[]>([
    '중고의류', '빈티지 패션', '리세일 시장', 'Resale as a Service',
    '마들렌메모리', '차란', '리클', 'Trove Resale', 'Reflaunt', 'Archive Resale'
  ]);
  const [newKeyword, setNewKeyword] = useState<string>('');
  const [dateRange, setDateRange] = useState({ year: 0, month: 0 });
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTransformingTotal, setIsTransformingTotal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'naver' | 'google'>('naver');
  const [googleStatus, setGoogleStatus] = useState<'idle' | 'success' | 'error' | 'no-key'>('idle');

  const filteredNews = useMemo(() => {
    const naver = newsList.filter(n => n.source === 'Naver');
    const google = newsList.filter(n => n.source !== 'Naver'); // Google 및 기타 매체
    return { naver, google };
  }, [newsList]);

  const addKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newKeyword.trim()) {
      if (!keywords.includes(newKeyword.trim())) {
        setKeywords([...keywords, newKeyword.trim()]);
      }
      setNewKeyword('');
    }
  };

  const removeKeyword = (tag: string) => {
    setKeywords(keywords.filter(k => k !== tag));
  };

  const handleFetchNews = async () => {
    if (dateRange.year === 0 || dateRange.month === 0) {
      alert('뉴스 수집을 위해 연도와 월을 반드시 선택해 주세요.');
      return;
    }

    setIsLoading(true);
    setGoogleStatus('idle');
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, ...dateRange })
      });

      if (!response.ok) throw new Error('Search failed');

      const newData: NewsItem[] = await response.json();

      if (Array.isArray(newData)) {
        setNewsList(prev => {
          const existingLinks = new Set(prev.map(n => n.link));
          const uniqueNewItems = newData.filter(n => !existingLinks.has(n.link));
          return [...prev, ...uniqueNewItems];
        });

        // 결과 중 구글 뉴스(또는 해외 미디어)가 하나라도 있으면 성공으로 간주
        const hasGoogle = newData.some(n => n.source !== 'Naver');
        setGoogleStatus(hasGoogle ? 'success' : 'error');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setGoogleStatus('error');
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

  const currentList = activeTab === 'naver' ? filteredNews.naver : filteredNews.google;

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto bg-white text-foreground">
      <header className="mb-12 flex flex-col items-center">
        <div className="bg-accent/5 px-4 py-1.5 rounded-full text-accent text-xs font-bold mb-4 tracking-widest uppercase">
          Newsletter AI Assistant
        </div>
        <h1 className="text-4xl font-extrabold mb-2 tracking-tight">Monthly Newsletter</h1>
        <p className="text-text-muted text-lg font-medium">프리미엄 중고의류 뉴스레터 자동 생성기</p>
      </header>

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
              키워드 관리
            </h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {keywords.map(tag => (
                <span
                  key={tag}
                  className="bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all hover:bg-gray-200"
                >
                  {tag}
                  <button onClick={() => removeKeyword(tag)} className="text-gray-400 hover:text-red-500 font-bold">×</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="새 키워드 추가..."
              className="input-field text-sm"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={addKeyword}
            />
          </section>

          <button
            onClick={handleFetchNews}
            disabled={isLoading || isTransformingTotal}
            className="btn-primary w-full py-4 text-base font-bold flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>수집 중...</>
            ) : '실시간 뉴스 수집하기'}
          </button>
        </aside>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-1">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('naver')}
                className={`tab-btn relative ${activeTab === 'naver' ? 'active' : ''}`}
              >
                네이버 뉴스
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'naver' ? 'bg-accent/10' : 'bg-gray-100'}`}>
                  {filteredNews.naver.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('google')}
                className={`tab-btn relative ${activeTab === 'google' ? 'active' : ''}`}
              >
                구글 뉴스
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'google' ? 'bg-accent/10' : 'bg-gray-100'}`}>
                  {filteredNews.google.length}
                </span>
              </button>
            </div>

            {selectedIds.length > 0 && (
              <button
                onClick={handleTransform}
                disabled={isTransformingTotal}
                className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-accent/20 flex items-center gap-2 hover:scale-105 transition-transform"
              >
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
                    <NewsCard
                      item={{
                        ...item,
                        title: item.transformedTitle || item.title,
                        summary: item.transformedSummary || item.summary
                      }}
                      isSelected={selectedIds.includes(item.id)}
                      onToggle={toggleSelection}
                    />
                    {item.transformedTitle && (
                      <div className="absolute top-2 left-2 bg-accent text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm z-20">AI ENHANCED</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="premium-card bg-gray-50/50 border-dashed border-2 flex flex-col items-center justify-center py-20 text-center">
                {activeTab === 'google' && googleStatus === 'error' ? (
                  <div className="animate-in slide-in-from-bottom-2 duration-500">
                    <div className="text-5xl mb-6">⚠️</div>
                    <h3 className="text-lg font-bold mb-2 text-red-600">구글 API 설정 확인이 필요합니다</h3>
                    <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
                      현재 입력하신 구글 API Key가 유효하지 않거나 권한이 부족합니다. 구글 클라우드 콘솔에서 키가 활성화되었는지 다시 확인해 주세요.
                    </p>
                    <div className="flex flex-col gap-2">
                      <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-xs text-accent hover:underline font-bold">구글 클라우드 콘솔 바로가기 →</a>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-5xl mb-6">🔍</div>
                    <h3 className="text-lg font-bold mb-1">{activeTab === 'naver' ? '네이버' : '구글'}에서 수집된 뉴스가 없습니다</h3>
                    <p className="text-xs text-text-muted">연도/월을 선택하고 수집 버튼을 눌러주세요.</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
