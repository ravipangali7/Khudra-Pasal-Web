import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import AppStoreBadges from "./AppStoreBadges";
import { DEFAULT_LOGIN_CATEGORY_CHIPS, LOGIN_BRAND_GRADIENT } from "./constants";

export type CategoryPill = { name: string; icon?: string };

type AuthBrandingPanelLoginProps = {
  categoryPills?: CategoryPill[];
};

export default function AuthBrandingPanelLogin({ categoryPills }: AuthBrandingPanelLoginProps) {
  const pills =
    categoryPills && categoryPills.length > 0
      ? categoryPills
      : DEFAULT_LOGIN_CATEGORY_CHIPS.map((name) => ({ name }));

  return (
    <div
      className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between"
      style={{ background: LOGIN_BRAND_GRADIENT }}
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/20"
            style={{
              width: `${80 + i * 40}px`,
              height: `${80 + i * 40}px`,
              top: `${10 + i * 14}%`,
              left: `${5 + i * 12}%`,
            }}
          />
        ))}
      </div>
      <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 flex-1 py-12">
        <div className="mb-8">
          <Link to="/">
            <img src={logo} alt="Khudra Pasal" className="h-14 w-auto mb-6 brightness-0 invert" />
          </Link>
          <h2 className="text-3xl xl:text-4xl font-bold text-white mb-4 leading-tight">
            Feel free to buy
            <br />
            from here
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-lg">
            Your trusted marketplace for everyday essentials — fresh products, great prices, fast
            delivery.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mb-10 max-w-xl">
          {pills.map((cat) => (
            <span
              key={cat.name}
              className="px-3 py-1.5 bg-black/20 backdrop-blur-sm rounded-full text-white text-sm font-medium border border-white/10"
            >
              {cat.icon ? `${cat.icon} ` : ""}
              {cat.name}
            </span>
          ))}
        </div>
      </div>
      <div className="relative z-10 px-12 xl:px-16 pb-10">
        <AppStoreBadges />
      </div>
    </div>
  );
}
