import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { websiteApi } from '@/lib/api';

type BannerRow = {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  click_url: string;
};

const FooterPromoGrid = () => {
  const { data: rows = [] } = useQuery({
    queryKey: ['website', 'banners', 'footer_promo'],
    queryFn: () => websiteApi.banners('footer_promo'),
    staleTime: 45_000,
  });

  const banners = (rows as BannerRow[]).filter((row) => row.image_url).slice(0, 4);
  if (!banners.length) return null;

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {banners.map((banner) => {
        const href = banner.click_url?.trim() || '/products';
        const isInternal = href.startsWith('/') && !href.startsWith('//');
        const card = (
          <div className="relative rounded-xl overflow-hidden min-h-[90px] md:min-h-[100px]">
            <img src={banner.image_url} alt={banner.title} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10 p-3 text-white">
              <h4 className="text-sm md:text-base font-semibold line-clamp-2">{banner.title}</h4>
            </div>
          </div>
        );
        return isInternal ? (
          <Link key={banner.id} to={href}>
            {card}
          </Link>
        ) : (
          <a key={banner.id} href={href}>
            {card}
          </a>
        );
      })}
    </section>
  );
};

export default FooterPromoGrid;
