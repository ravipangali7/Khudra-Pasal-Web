import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { extractResults, portalApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { mapApiReelToUi } from '@/modules/reels/api/reelMappers';

const PAGE_SIZE = 24;

type Props = {
  className?: string;
};

export default function PortalSavedReelsCard({ className }: Props) {
  const navigate = useNavigate();
  const { data: favouriteReelsResp } = useQuery({
    queryKey: ['portal', 'reels-favourites'],
    queryFn: () => portalApi.favouriteReels({ page_size: PAGE_SIZE }),
  });

  const favouriteReels = extractResults(favouriteReelsResp).map(mapApiReelToUi);

  return (
    <Card className={cn('border-primary/10 shadow-sm', className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Saved reels</h3>
          <span className="text-xs tabular-nums text-muted-foreground">{favouriteReels.length} saved</span>
        </div>
        {favouriteReels.length === 0 ? (
          <p className="text-sm text-muted-foreground">No favourite reels yet.</p>
        ) : (
          <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-gutter:stable]">
            <div className="flex snap-x snap-mandatory gap-3">
              {favouriteReels.map((reel) => (
                <button
                  key={reel.id}
                  type="button"
                  onClick={() => navigate(`/reels?reel=${reel.id}`)}
                  className="w-[6.5rem] shrink-0 snap-start text-left sm:w-28"
                >
                  <div className="overflow-hidden rounded-xl border border-border bg-muted/20 transition-colors hover:border-primary/40">
                    <div className="aspect-[9/16] w-full">
                      <img
                        src={reel.thumbnail || reel.product.image}
                        alt={reel.product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-2">
                      <p className="line-clamp-2 text-[11px] font-medium leading-tight">{reel.product.name}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {reel.views.toLocaleString()} views
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
