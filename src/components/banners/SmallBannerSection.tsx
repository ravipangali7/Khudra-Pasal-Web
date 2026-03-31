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

const SmallBannerSection = () => {
  const { data: rows = [] } = useQuery({
    queryKey: ['website', 'banners', 'small_strip'],
    queryFn: () => websiteApi.banners('small_strip'),
    staleTime: 45_000,
  });

  const banner = (rows as BannerRow[]).find((row) => row.image_url);
  if (!banner) return null;
  const href = banner.click_url?.trim() || '/products';
  const isInternal = href.startsWith('/') && !href.startsWith('//');

  const body = (
    <div className="relative overflow-hidden rounded-2xl min-h-[110px] md:min-h-[130px]">
      <img src={banner.image_url} alt={banner.title} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/25" />
      <div className="relative z-10 p-4 md:p-6 text-white">
        <h3 className="text-lg md:text-xl font-bold">{banner.title}</h3>
        {banner.subtitle ? <p className="text-sm text-white/90 mt-1">{banner.subtitle}</p> : null}
      </div>
    </div>
  );

  if (isInternal) {
    return <Link to={href}>{body}</Link>;
  }
  return <a href={href}>{body}</a>;
};

export default SmallBannerSection;
