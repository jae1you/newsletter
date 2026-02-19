'use client';

interface NewsItem {
    id: string;
    title: string;
    link: string;
    summary: string;
    imageUrl?: string;
    ogImageUrl?: string;
    source: string;
    date: string;
    transformedTitle?: string;
    transformedSummary?: string;
    isTransforming?: boolean;
}

interface NewsCardProps {
    item: NewsItem;
    isSelected: boolean;
    onToggle: (id: string) => void;
}

export default function NewsCard({ item, isSelected, onToggle }: NewsCardProps) {
    const displayImage = item.ogImageUrl || item.imageUrl;

    return (
        <div className={`premium-card relative flex flex-col md:flex-row gap-6 mb-4 transition-all ${isSelected ? 'border-accent ring-2 ring-accent/10 bg-accent/[0.02]' : 'bg-white'}`}>
            {/* 체크박스: 카드 전체 오른쪽 상단 */}
            <div className="absolute top-3 right-3 z-10">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(item.id)}
                    className="w-5 h-5 accent-accent cursor-pointer shadow-sm"
                />
            </div>

            <div className="flex-shrink-0 w-full md:w-44 h-28 bg-gray-50 rounded-lg overflow-hidden border border-border">
                {displayImage ? (
                    <img src={displayImage} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-text-muted text-[10px] p-2 text-center bg-gray-100">
                        <span className="text-xl mb-1">🖼️</span>
                        이미지 없음
                    </div>
                )}
            </div>

            <div className="flex-grow flex flex-col pr-8">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] text-text-muted">{item.date}</span>
                </div>
                <h3 className="text-base font-bold mb-1.5 line-clamp-2 leading-snug text-foreground">
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-accent hover:underline decoration-accent/30 underline-offset-4 transition-all">
                        {item.title}
                    </a>
                </h3>
                <p className="text-sm text-text-muted line-clamp-3 leading-normal mb-3 flex-grow">
                    {item.summary}
                </p>
                <div className="flex justify-end">
                    <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-accent border border-accent/40 px-5 py-2 rounded-full hover:bg-accent hover:text-white transition-all"
                    >
                        기사읽기 →
                    </a>
                </div>
            </div>
        </div>
    );
}
