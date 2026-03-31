import { Mail, Phone, MapPin, Facebook, Instagram, Twitter, Youtube, CreditCard, Truck, Shield, HeadphonesIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { websiteApi } from '@/lib/api';
import logo from '@/assets/logo.png';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { data: storeInfo } = useQuery({
    queryKey: ['website', 'store-info'],
    queryFn: () => websiteApi.storeInfo(),
    staleTime: 60_000,
  });
  const { data: categories } = useQuery({
    queryKey: ['footer-categories'],
    queryFn: () => websiteApi.categories(),
  });
  const displayCategories =
    categories?.map((cat) => ({
      id: cat.slug,
      name: cat.name,
      icon: cat.icon || '📦',
    })) || [];

  const features = [
    { icon: Truck, wrap: 'bg-storefront-green/15 text-storefront-green', title: 'Free Delivery', desc: 'Orders above Rs. 500' },
    { icon: CreditCard, wrap: 'bg-storefront-orange/15 text-storefront-orange', title: 'Secure Payment', desc: '100% Protected' },
    { icon: Shield, wrap: 'bg-sky-500/15 text-sky-600', title: 'Quality Assured', desc: 'Genuine Products' },
    { icon: HeadphonesIcon, wrap: 'bg-primary/15 text-primary', title: '24/7 Support', desc: 'Dedicated Help' },
  ];

  return (
    <footer className="border-t border-border/80 bg-background text-foreground">
      <div className="bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${f.wrap}`}
                >
                  <f.icon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{f.title}</h4>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 bg-muted/30">
        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5 lg:gap-10">
            <div className="lg:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <img src={storeInfo?.site_logo_url || logo} alt={storeInfo?.site_name || 'KhudraPasal'} className="h-10 w-auto object-contain" />
                <span className="font-heading text-xl font-bold text-foreground">{storeInfo?.site_name || 'KhudraPasal'}</span>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                {storeInfo?.site_description ||
                  'Your trusted online marketplace for everyday essentials. Fresh products, great prices, and fast delivery across Nepal.'}
              </p>
              <p className="mb-3 text-sm font-medium text-foreground">Feel free to buy from here</p>
              <div className="mb-6 flex items-center gap-3">
                {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm ring-1 ring-border/60 transition-all hover:bg-primary hover:text-primary-foreground"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                  alt="Google Play"
                  className="h-10 cursor-pointer transition-opacity hover:opacity-90"
                />
                <img
                  src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                  alt="App Store"
                  className="h-10 cursor-pointer transition-opacity hover:opacity-90"
                />
              </div>
            </div>

            <div>
              <h3 className="mb-4 font-bold text-foreground">Quick Links</h3>
              <ul className="space-y-3">
                {['About Us', 'Contact Us', 'FAQs', 'Terms & Conditions', 'Privacy Policy', 'Refund Policy'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 font-bold text-foreground">Categories</h3>
              <ul className="space-y-3">
                {displayCategories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      to={`/category/${cat.id}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      <span>{cat.icon}</span> {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 font-bold text-foreground">Contact Us</h3>
              <div className="space-y-4">
                <a
                  href={`mailto:${storeInfo?.site_email || 'khudrapasal@gmail.com'}`}
                  className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <span>{storeInfo?.site_email || 'khudrapasal@gmail.com'}</span>
                </a>
                <a
                  href={`tel:${(storeInfo?.phone || '9858047858').replace(/\s+/g, '')}`}
                  className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Phone className="h-5 w-5" />
                  </div>
                  <span>{storeInfo?.phone || '+977 9858047858'}</span>
                </a>
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <span>{storeInfo?.address || 'Kathmandu, Nepal'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 bg-muted/50">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground">
                © {currentYear}{' '}
                <span className="font-semibold text-foreground">{storeInfo?.site_name || 'khudrapasal.com'}</span>.{' '}
                {storeInfo?.footer_text || 'All rights reserved.'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Developed by{' '}
                <a
                  href="https://saastechnepal.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-storefront-green hover:underline"
                >
                  saastechnepal.com
                </a>
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-muted-foreground">We accept:</span>
              {['eSewa', 'Khalti', 'IME Pay', 'COD'].map((method) => (
                <span key={method} className="rounded-md bg-card px-2 py-1 text-xs font-medium text-muted-foreground shadow-sm ring-1 ring-border/60">
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
