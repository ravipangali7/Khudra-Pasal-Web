import DiscountDealsBanner from '@/components/banners/DiscountDealsBanner';

interface DiscountPromoCardProps {
  discountedCount: number;
}

const DiscountPromoCard = ({ discountedCount }: DiscountPromoCardProps) => {
  return <DiscountDealsBanner dealCount={discountedCount} to="/products/discounted" />;
};

export default DiscountPromoCard;
