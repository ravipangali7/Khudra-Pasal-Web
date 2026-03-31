import { useState } from 'react';
import { MapPin, Phone, User, FileText, Map, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeliveryFormProps {
  onSubmit: (data: DeliveryData) => void;
}

export interface DeliveryData {
  fullName: string;
  mobileNumber: string;
  secondaryContact: string;
  areaLocation: string;
  landmark: string;
  notes: string;
  googleMapLink: string;
  useAutoLocation: boolean;
}

const DeliveryForm = ({ onSubmit }: DeliveryFormProps) => {
  const [useAutoLocation, setUseAutoLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [formData, setFormData] = useState<DeliveryData>({
    fullName: '',
    mobileNumber: '',
    secondaryContact: '',
    areaLocation: '',
    landmark: '',
    notes: '',
    googleMapLink: '',
    useAutoLocation: false,
  });
  const [errors, setErrors] = useState<Partial<DeliveryData>>({});

  const handleAutoLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const mapLink = `https://maps.google.com/?q=${latitude},${longitude}`;
          setFormData(prev => ({
            ...prev,
            googleMapLink: mapLink,
            useAutoLocation: true,
          }));
          setUseAutoLocation(true);
          setIsLocating(false);
        },
        (error) => {
          console.error('Location error:', error);
          setIsLocating(false);
          alert('Unable to get your location. Please enter manually.');
        }
      );
    } else {
      setIsLocating(false);
      alert('Geolocation is not supported by your browser.');
    }
  };

  const validate = () => {
    const newErrors: Partial<DeliveryData> = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.mobileNumber.trim()) newErrors.mobileNumber = 'Mobile number is required';
    else if (!/^9[0-9]{9}$/.test(formData.mobileNumber)) newErrors.mobileNumber = 'Enter valid 10-digit mobile number';
    if (!formData.areaLocation.trim()) newErrors.areaLocation = 'Area/Location is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const inputClasses = (fieldName: keyof DeliveryData) => cn(
    "w-full px-4 py-3 pl-12 bg-muted/50 border rounded-xl text-foreground placeholder:text-muted-foreground outline-none transition-colors",
    errors[fieldName] ? "border-destructive" : "border-border focus:border-primary"
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Auto Location Button */}
      <div className="bg-category-fresh/10 rounded-xl p-4 border border-category-fresh/20">
        <button
          type="button"
          onClick={handleAutoLocation}
          disabled={isLocating}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-category-fresh text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Navigation className={cn("w-5 h-5", isLocating && "animate-spin")} />
          {isLocating ? 'Getting Location...' : useAutoLocation ? 'Location Detected ✓' : 'Use My Current Location'}
        </button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          We'll use your location for faster delivery
        </p>
      </div>

      <div className="relative flex items-center">
        <div className="flex-1 border-t border-border"></div>
        <span className="px-4 text-sm text-muted-foreground">or enter manually</span>
        <div className="flex-1 border-t border-border"></div>
      </div>

      {/* Full Name */}
      <div className="relative">
        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Full Name *"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          className={inputClasses('fullName')}
        />
        {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
      </div>

      {/* Mobile Number */}
      <div className="relative">
        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="tel"
          placeholder="Mobile Number (98XXXXXXXX) *"
          value={formData.mobileNumber}
          onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
          className={inputClasses('mobileNumber')}
        />
        {errors.mobileNumber && <p className="text-xs text-destructive mt-1">{errors.mobileNumber}</p>}
      </div>

      {/* Secondary Contact */}
      <div className="relative">
        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="tel"
          placeholder="Secondary Contact Number (optional)"
          value={formData.secondaryContact}
          onChange={(e) => setFormData({ ...formData, secondaryContact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
          className="w-full px-4 py-3 pl-12 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Area / Location */}
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Area / Location Name *"
          value={formData.areaLocation}
          onChange={(e) => setFormData({ ...formData, areaLocation: e.target.value })}
          className={inputClasses('areaLocation')}
        />
        {errors.areaLocation && <p className="text-xs text-destructive mt-1">{errors.areaLocation}</p>}
      </div>

      {/* Nearby Landmark */}
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Nearby Landmark (optional)"
          value={formData.landmark}
          onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
          className="w-full px-4 py-3 pl-12 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Google Map Link */}
      <div className="relative">
        <Map className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="url"
          placeholder="Google Map Link (optional)"
          value={formData.googleMapLink}
          onChange={(e) => setFormData({ ...formData, googleMapLink: e.target.value })}
          className="w-full px-4 py-3 pl-12 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Delivery Notes */}
      <div className="relative">
        <FileText className="absolute left-4 top-4 w-5 h-5 text-muted-foreground" />
        <textarea
          placeholder="Additional Delivery Notes (optional)"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 pl-12 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
      >
        Confirm Delivery Address
      </button>
    </form>
  );
};

export default DeliveryForm;
