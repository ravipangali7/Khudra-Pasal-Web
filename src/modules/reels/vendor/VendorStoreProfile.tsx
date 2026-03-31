import React, { useState } from 'react';
import { Camera, MapPin, Star, Users, Package, Edit, CheckCircle, Image, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StoreProfileData {
  storeName: string;
  description: string;
  bio: string;
  location: string;
  phone: string;
  email: string;
  website: string;
  coverImage: string;
  profileImage: string;
  followers: number;
  totalProducts: number;
  rating: number;
  totalReviews: number;
  verified: boolean;
  category: string;
  established: string;
}

const VendorStoreProfile: React.FC = () => {
  const [editing, setEditing] = useState(false);
  const [editingCover, setEditingCover] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profile, setProfile] = useState<StoreProfileData>({
    storeName: 'Organic Nepal',
    description: 'Premium organic products sourced directly from Nepali farmers. We bring the best of Nepal to your doorstep with love and authenticity.',
    bio: '🌿 Certified organic | 🇳🇵 Proudly Nepali | 📦 Free delivery above Rs. 2000 | 🌱 Sustainable packaging',
    location: 'Thamel, Kathmandu',
    phone: '9841234567',
    email: 'store@organicnepal.com',
    website: 'www.organicnepal.com',
    coverImage: '',
    profileImage: '',
    followers: 12400,
    totalProducts: 125,
    rating: 4.8,
    totalReviews: 1247,
    verified: true,
    category: 'Organic & Natural',
    established: '2020',
  });

  const handleCoverUpload = () => {
    // Simulate upload
    setProfile(p => ({ ...p, coverImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&h=400&fit=crop' }));
    setEditingCover(false);
  };

  const handleProfileUpload = () => {
    setProfile(p => ({ ...p, profileImage: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop' }));
    setEditingProfile(false);
  };

  return (
    <div className="space-y-6">
      {/* Facebook-style Cover + Profile */}
      <Card className="overflow-hidden">
        {/* Cover Image */}
        <div className="relative h-40 md:h-56 group">
          {profile.coverImage ? (
            <img src={profile.coverImage} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/30 via-accent/10 to-secondary/20 flex items-center justify-center">
              <span className="text-4xl opacity-20">🏪</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          <div className="absolute bottom-3 right-3 flex gap-2">
            <Button size="sm" variant="secondary" className="bg-background/80 backdrop-blur-sm" onClick={() => setEditingCover(!editingCover)}>
              <Camera className="w-3.5 h-3.5 mr-1.5" /> Edit Cover
            </Button>
          </div>
          {editingCover && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-card rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
                <h3 className="font-bold">Update Cover Image</h3>
                <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click or drag to upload</p>
                  <p className="text-xs text-muted-foreground">Recommended: 1200×400px</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={handleCoverUpload}>Upload</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingCover(false)}>Cancel</Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Row */}
        <div className="px-4 md:px-6 pb-5">
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12 md:-mt-14">
            {/* Profile Picture */}
            <div className="relative group/avatar">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-xl border-4 border-background bg-muted flex items-center justify-center overflow-hidden shadow-lg">
                {profile.profileImage ? (
                  <img src={profile.profileImage} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">🏬</span>
                )}
              </div>
              <button 
                onClick={() => setEditingProfile(!editingProfile)}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              {editingProfile && (
                <div className="absolute top-full left-0 mt-2 z-10 bg-card rounded-lg border p-4 w-56 space-y-3 shadow-lg">
                  <p className="text-sm font-medium">Update Profile Photo</p>
                  <Input type="file" accept="image/*" className="text-xs" />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 text-xs" onClick={handleProfileUpload}>Upload</Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setEditingProfile(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Name & Meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-bold truncate">{profile.storeName}</h2>
                {profile.verified && (
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{profile.location}</span>
                <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-500" />{profile.rating} ({profile.totalReviews})</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{(profile.followers / 1000).toFixed(1)}k followers</span>
                <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" />{profile.totalProducts} products</span>
              </div>
              {/* Bio */}
              <p className="text-sm mt-2 leading-relaxed">{profile.bio}</p>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{profile.description}</p>
            </div>

            {/* Edit Button */}
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="self-start md:self-end">
              <Edit className="w-4 h-4 mr-1.5" />
              {editing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Followers', value: `${(profile.followers / 1000).toFixed(1)}k`, icon: Users },
          { label: 'Products', value: profile.totalProducts, icon: Package },
          { label: 'Rating', value: profile.rating, icon: Star },
          { label: 'Reviews', value: profile.totalReviews.toLocaleString(), icon: Star },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <stat.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Form */}
      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Store Profile</CardTitle>
            <CardDescription>Update your store information visible to customers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Store Name</Label>
                <Input value={profile.storeName} onChange={e => setProfile(p => ({ ...p, storeName: e.target.value }))} />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={profile.location} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={profile.website} onChange={e => setProfile(p => ({ ...p, website: e.target.value }))} />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={profile.category} onChange={e => setProfile(p => ({ ...p, category: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Bio (shown below name)</Label>
              <Input value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Short tagline or bio..." />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={profile.description} onChange={e => setProfile(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setEditing(false)}>Save Changes</Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VendorStoreProfile;
