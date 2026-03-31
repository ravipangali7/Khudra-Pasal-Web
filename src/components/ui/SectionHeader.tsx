import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveThemeClass } from '@/lib/categoryTheme';

interface SectionHeaderProps {
  title: string;
  categoryTheme?: string;
  /** Preferred: navigate to a listing route (avoids no-op buttons). */
  seeAllTo?: string;
  onSeeAll?: () => void;
  showSeeAll?: boolean;
}

const SectionHeader = ({
  title,
  categoryTheme = 'all',
  seeAllTo,
  onSeeAll,
  showSeeAll = true,
}: SectionHeaderProps) => {
  const theme = resolveThemeClass(categoryTheme);
  const hasAction = Boolean(seeAllTo || onSeeAll);

  return (
    <div className={`section-header theme-${theme}`}>
      <h2 className="section-title">{title}</h2>
      {showSeeAll && hasAction && (
        seeAllTo ? (
          <Link to={seeAllTo} className="see-all-link">
            View all
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <button type="button" onClick={onSeeAll} className="see-all-link">
            View all
            <ChevronRight className="w-4 h-4" />
          </button>
        )
      )}
    </div>
  );
};

export default SectionHeader;
