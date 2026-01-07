import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MapPin, Star, ExternalLink, Phone } from "lucide-react";

interface POI {
  id: string;
  name: string;
  name_en: string;
  category: string;
  description: string | null;
  description_en: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  is_active: boolean;
  display_order: number;
}

const CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant', labelEn: 'Restaurant', color: 'bg-orange-500' },
  { value: 'cafe', label: 'Cafenea', labelEn: 'Cafe', color: 'bg-amber-600' },
  { value: 'shopping', label: 'Shopping', labelEn: 'Shopping', color: 'bg-pink-500' },
  { value: 'attraction', label: 'Atracție', labelEn: 'Attraction', color: 'bg-purple-500' },
  { value: 'transport', label: 'Transport', labelEn: 'Transport', color: 'bg-blue-500' },
  { value: 'health', label: 'Sănătate', labelEn: 'Health', color: 'bg-red-500' },
  { value: 'entertainment', label: 'Divertisment', labelEn: 'Entertainment', color: 'bg-green-500' },
];

const POIManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPOI, setEditingPOI] = useState<POI | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    category: 'restaurant',
    description: '',
    description_en: '',
    latitude: '',
    longitude: '',
    address: '',
    phone: '',
    website: '',
    rating: '',
    is_active: true,
    display_order: 0,
  });

  const { data: pois, isLoading } = useQuery({
    queryKey: ['admin-pois'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_of_interest')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as POI[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<POI, 'id'>) => {
      const { error } = await supabase.from('points_of_interest').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pois'] });
      queryClient.invalidateQueries({ queryKey: ['pois'] });
      toast.success('Punct de interes adăugat cu succes!');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Eroare la adăugare: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<POI> }) => {
      const { error } = await supabase.from('points_of_interest').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pois'] });
      queryClient.invalidateQueries({ queryKey: ['pois'] });
      toast.success('Punct de interes actualizat!');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Eroare la actualizare: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('points_of_interest').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pois'] });
      queryClient.invalidateQueries({ queryKey: ['pois'] });
      toast.success('Punct de interes șters!');
    },
    onError: (error) => {
      toast.error('Eroare la ștergere: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      name_en: '',
      category: 'restaurant',
      description: '',
      description_en: '',
      latitude: '',
      longitude: '',
      address: '',
      phone: '',
      website: '',
      rating: '',
      is_active: true,
      display_order: 0,
    });
    setEditingPOI(null);
  };

  const handleEdit = (poi: POI) => {
    setEditingPOI(poi);
    setFormData({
      name: poi.name,
      name_en: poi.name_en,
      category: poi.category,
      description: poi.description || '',
      description_en: poi.description_en || '',
      latitude: String(poi.latitude),
      longitude: String(poi.longitude),
      address: poi.address || '',
      phone: poi.phone || '',
      website: poi.website || '',
      rating: poi.rating ? String(poi.rating) : '',
      is_active: poi.is_active,
      display_order: poi.display_order,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: formData.name,
      name_en: formData.name_en,
      category: formData.category,
      description: formData.description || null,
      description_en: formData.description_en || null,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      address: formData.address || null,
      phone: formData.phone || null,
      website: formData.website || null,
      rating: formData.rating ? parseFloat(formData.rating) : null,
      is_active: formData.is_active,
      display_order: formData.display_order,
    };

    if (editingPOI) {
      updateMutation.mutate({ id: editingPOI.id, data });
    } else {
      createMutation.mutate(data as Omit<POI, 'id'>);
    }
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[0];
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Se încarcă...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Puncte de Interes</h2>
          <p className="text-muted-foreground">Gestionează locațiile afișate pe hartă</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Adaugă POI
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPOI ? 'Editează Punct de Interes' : 'Adaugă Punct de Interes'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nume (RO)</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_en">Nume (EN)</Label>
                  <Input
                    id="name_en"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descriere (RO)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description_en">Descriere (EN)</Label>
                  <Textarea
                    id="description_en"
                    value={formData.description_en}
                    onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitudine</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="44.4268"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitudine</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="26.1025"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresă</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rating">Rating (0-5)</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display_order">Ordine afișare</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Activ</Label>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Anulează
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingPOI ? 'Salvează' : 'Adaugă'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista Punctelor de Interes ({pois?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nume</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Adresă</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pois?.map((poi) => {
                  const categoryInfo = getCategoryInfo(poi.category);
                  return (
                    <TableRow key={poi.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <div>
                            <div className="font-medium">{poi.name}</div>
                            <div className="text-xs text-muted-foreground">{poi.name_en}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${categoryInfo.color} text-white`}>
                          {categoryInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {poi.address || '-'}
                      </TableCell>
                      <TableCell>
                        {poi.rating ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                            {poi.rating}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={poi.is_active ? "default" : "secondary"}>
                          {poi.is_active ? 'Activ' : 'Inactiv'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {poi.website && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(poi.website!, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                          {poi.phone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(`tel:${poi.phone}`, '_blank')}
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(poi)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Ești sigur că vrei să ștergi acest punct de interes?')) {
                                deleteMutation.mutate(poi.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default POIManager;
