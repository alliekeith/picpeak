import React from 'react';
import { Search, Filter, SortAsc, SortDesc } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from "@/components/ui/input";

interface PhotoFiltersProps {
  categories: Array<{ id: number | string; name: string; slug: string }>;
  selectedCategory: number | string | null | undefined;
  searchTerm: string;
  sortBy: 'date' | 'name' | 'size' | 'rating';
  sortOrder: 'asc' | 'desc';
  onCategoryChange: (categoryId: number | string | null | undefined) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: 'date' | 'name' | 'size' | 'rating', order: 'asc' | 'desc') => void;
  mediaType?: 'all' | 'photo' | 'video';
  onMediaTypeChange?: (mediaType: 'all' | 'photo' | 'video') => void;
  showMediaFilter?: boolean;
}

export const PhotoFilters: React.FC<PhotoFiltersProps> = ({
  categories,
  selectedCategory,
  searchTerm,
  sortBy,
  sortOrder,
  onCategoryChange,
  onSearchChange,
  onSortChange,
  mediaType = 'all',
  onMediaTypeChange,
  showMediaFilter = false
}) => {
  const { t } = useTranslation();
  const handleSortToggle = () => {
    onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">{<Search className="w-5 h-5 text-muted-foreground" />}</div><Input
                              type="text"
                              placeholder={t('gallery.searchByFilename', 'Search by filename...')}
                              value={searchTerm}
                              onChange={(e) => onSearchChange(e.target.value)} className="pl-10"
                            /></div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <select
            value={selectedCategory === null ? '' : selectedCategory || ''}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') return onCategoryChange(null);
              const numeric = Number(raw);
              onCategoryChange(Number.isNaN(numeric) ? raw : numeric);
            }}
            className="px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-brand-500 focus:border-primary"
          >
            <option value="">{t('gallery.allCategories', 'All Categories')}</option>
            {/* The literal the backend understands, not 0 (#1211). It skips
                '0' outright — `category_id !== '0'` — so this filter used to
                apply no condition at all and quietly returned the whole event.
                The onChange below passes non-numeric values through unchanged,
                so the string arrives intact. */}
            <option value="uncategorized">{t('gallery.uncategorized', 'Uncategorized')}</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {showMediaFilter && onMediaTypeChange && (
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <select
              value={mediaType}
              onChange={(e) => onMediaTypeChange(e.target.value as 'all' | 'photo' | 'video')}
              className="px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-brand-500 focus:border-primary"
            >
              <option value="all">{t('gallery.allMedia', 'All media')}</option>
              <option value="photo">{t('gallery.photosOnly', 'Photos only')}</option>
              <option value="video">{t('gallery.videosOnly', 'Videos only')}</option>
            </select>
          </div>
        )}

        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as 'date' | 'name' | 'size' | 'rating', sortOrder)}
            className="px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-brand-500 focus:border-primary"
          >
            <option value="date">{t('gallery.sortByDate', 'Sort by Date')}</option>
            <option value="name">{t('gallery.sortByName', 'Sort by Name')}</option>
            <option value="size">{t('gallery.sortBySize', 'Sort by Size')}</option>
            <option value="rating">{t('gallery.sortByRating', 'Sort by Rating')}</option>
          </select>
          
          <button
            onClick={handleSortToggle}
            className="p-2 border border-border rounded-lg hover:bg-accent transition-colors"
            aria-label={sortOrder === 'asc' ? t('gallery.sortDescending', 'Sort descending') : t('gallery.sortAscending', 'Sort ascending')}
          >
            {sortOrder === 'asc' ? (
              <SortAsc className="w-5 h-5 text-muted-foreground" />
            ) : (
              <SortDesc className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
