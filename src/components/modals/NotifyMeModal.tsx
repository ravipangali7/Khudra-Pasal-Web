import { useState } from 'react';
import { X, Bell, CheckCircle, Shield } from 'lucide-react';
import { Product } from '@/types';
import { cn } from '@/lib/utils';

interface NotifyMeModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

const NotifyMeModal = ({ product, isOpen, onClose }: NotifyMeModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[0-9]{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
      newErrors.mobile = 'Please enter a valid 10-digit mobile number';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitted(true);
      // Reset after 3 seconds
      setTimeout(() => {
        onClose();
        setIsSubmitted(false);
        setFormData({ name: '', mobile: '', email: '' });
      }, 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          className="w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-category-cafe to-category-beauty p-6 text-white">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-heading">Notify Me</h2>
                <p className="text-sm opacity-90">Get alerted when back in stock</p>
              </div>
            </div>
          </div>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Product Info */}
              <div className="flex gap-3 p-3 bg-muted/50 rounded-xl">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover opacity-60"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Product</p>
                  <h4 className="font-medium text-sm line-clamp-2">{product.name}</h4>
                  <p className="text-xs text-destructive mt-1 font-medium">Currently Sold Out</p>
                </div>
              </div>

              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Your Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-category-cafe transition-all",
                    errors.name ? "border-destructive" : "border-border"
                  )}
                  placeholder="Enter your full name"
                />
                {errors.name && (
                  <p className="text-xs text-destructive mt-1.5">{errors.name}</p>
                )}
              </div>

              {/* Mobile Field */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Mobile Number <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    +977
                  </span>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={e => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                    className={cn(
                      "w-full pl-16 pr-4 py-3 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-category-cafe transition-all",
                      errors.mobile ? "border-destructive" : "border-border"
                    )}
                    placeholder="9800000000"
                    maxLength={10}
                  />
                </div>
                {errors.mobile && (
                  <p className="text-xs text-destructive mt-1.5">{errors.mobile}</p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-category-cafe transition-all",
                    errors.email ? "border-destructive" : "border-border"
                  )}
                  placeholder="email@example.com"
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1.5">{errors.email}</p>
                )}
              </div>

              {/* Trust Indicator */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-4 h-4 text-category-fresh" />
                <span>Your information is secure and will only be used for stock alerts</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-category-cafe to-category-beauty text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Notify Me When Available
              </button>
            </form>
          ) : (
            /* Success State */
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-category-fresh/10 flex items-center justify-center animate-scale-in">
                <CheckCircle className="w-10 h-10 text-category-fresh" />
              </div>
              <h3 className="text-xl font-bold mb-2">You're on the list!</h3>
              <p className="text-muted-foreground text-sm">
                We'll notify you at <span className="font-medium text-foreground">{formData.mobile}</span> when this item is back in stock.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotifyMeModal;
