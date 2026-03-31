import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import logo from "@/assets/logo.png";
import AppStoreBadges from "./AppStoreBadges";
import { SIGNUP_BRAND_GRADIENT } from "./constants";

const FEATURE_LINES = [
  "🚚 Free delivery on first order",
  "💰 Wallet cashback rewards",
  "🎁 Family portal access",
];

export default function AuthBrandingPanelSignup() {
  return (
    <div
      className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between"
      style={{ background: SIGNUP_BRAND_GRADIENT }}
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/20"
            style={{
              width: `${100 + i * 50}px`,
              height: `${100 + i * 50}px`,
              bottom: `${5 + i * 15}%`,
              right: `${5 + i * 10}%`,
            }}
          />
        ))}
      </div>
      <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 flex-1 py-12">
        <Link to="/">
          <img src={logo} alt="Khudra Pasal" className="h-14 w-auto mb-6 brightness-0 invert" />
        </Link>
        <h2 className="text-3xl xl:text-4xl font-bold text-white mb-4 leading-tight">
          Join thousands of
          <br />
          happy shoppers
        </h2>
        <p className="text-white/80 text-lg mb-8 max-w-lg">
          Create your account and start exploring fresh products, exclusive deals, and fast delivery
          across Nepal.
        </p>
        <ul className="space-y-3 mb-10">
          {FEATURE_LINES.map((line) => (
            <li key={line} className="flex items-center gap-2 text-white/90 text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative z-10 px-12 xl:px-16 pb-10">
        <AppStoreBadges />
      </div>
    </div>
  );
}
