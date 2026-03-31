import { Star, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  name: string;
  avatar?: string;
  rating: number;
  comment: string;
  date: string;
  productName?: string;
}

interface CustomerReviewsProps {
  reviews: Review[];
  title?: string;
}

const CustomerReviews = ({ reviews, title = "Customer Reviews" }: CustomerReviewsProps) => {
  if (reviews.length === 0) return null;

  return (
    <section>
      <h3 className="text-lg font-bold text-foreground mb-4">{title}</h3>
      
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {review.avatar ? (
                  <img src={review.avatar} alt={review.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-semibold text-primary">{review.name[0]}</span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-foreground">{review.name}</p>
                  <p className="text-xs text-muted-foreground">{review.date}</p>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "w-3 h-3",
                        i < review.rating ? "fill-current text-yellow-500" : "text-muted"
                      )}
                    />
                  ))}
                </div>

                {/* Comment */}
                <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>

                {/* Product Name */}
                {review.productName && (
                  <p className="text-xs text-primary mt-2">Purchased: {review.productName}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CustomerReviews;
