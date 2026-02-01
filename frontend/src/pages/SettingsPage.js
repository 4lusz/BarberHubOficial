import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { getImageUrl } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { PhoneInput } from '../components/ui/phone-input';
import { 
  Settings, 
  Store, 
  MapPin, 
  Phone, 
  Save, 
  Link as LinkIcon, 
  Copy, 
  Check,
  Palette,
  QrCode,
  Crown,
  AlertTriangle,
  Upload,
  Image,
  Trash2,
  Instagram,
  Facebook,
  MessageCircle,
  X,
  Type
} from 'lucide-react';
import { toast } from 'sonner';

// Simple QR Code component using external service
const QRCodeDisplay = ({ url, size = 200 }) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=09090B&color=F59E0B`;
  
  return (
    <div className="bg-card p-4 rounded-lg border border-border inline-block">
      <img 
        src={qrUrl} 
        alt="QR Code" 
        width={size} 
        height={size}
        className="rounded"
      />
    </div>
  );
};

const FONT_STYLES = [
  { id: 'modern', name: 'Moderna', font: 'Inter, sans-serif' },
  { id: 'classic', name: 'Clássica', font: 'Georgia, serif' },
  { id: 'bold', name: 'Bold', font: 'Arial Black, sans-serif' },
];

// Banner Adjustment Modal
const BannerAdjustModal = ({ isOpen, onClose, imageUrl, currentZoom, currentOffsetY, onSave }) => {
  const [zoom, setZoom] = useState(currentZoom || 100);
  const [offsetY, setOffsetY] = useState(currentOffsetY || 50);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave(zoom, offsetY);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-semibold text-lg">Ajustar Banner</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Preview */}
          <div 
            className="relative w-full h-48 rounded-lg border border-border overflow-hidden bg-secondary"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: `${zoom}%`,
              backgroundPosition: `center ${offsetY}%`,
              backgroundRepeat: 'no-repeat'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30" />
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              Preview do Banner
            </div>
          </div>
          
          {/* Zoom Control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Zoom: {zoom}%</Label>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setZoom(100)}
                >
                  Resetar
                </Button>
              </div>
            </div>
            <input
              type="range"
              min="100"
              max="200"
              value={zoom}
              onChange={(e) => setZoom(parseInt(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-xs text-muted-foreground">
              Aumente o zoom para recortar a imagem
            </p>
          </div>
          
          {/* Position Y Control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Posição Vertical: {offsetY}%</Label>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setOffsetY(0)}
                >
                  Topo
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setOffsetY(50)}
                >
                  Centro
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setOffsetY(100)}
                >
                  Baixo
                </Button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={offsetY}
              onChange={(e) => setOffsetY(parseInt(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-xs text-muted-foreground">
              Ajuste qual parte da imagem aparece no banner
            </p>
          </div>
        </div>
        
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Ajuste'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function SettingsPage() {
  const { barbershop, updateBarbershop } = useAuth();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState({});
  const [activeTab, setActiveTab] = useState('info');
  const [showBannerAdjust, setShowBannerAdjust] = useState(false);
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    primary_color: '#F59E0B',
    background_color: '#09090B',
    font_style: 'modern',
    about_text: '',
    instagram_url: '',
    facebook_url: '',
    whatsapp_number: '',
  });

  useEffect(() => {
    if (barbershop) {
      setFormData({
        name: barbershop.name || '',
        description: barbershop.description || '',
        address: barbershop.address || '',
        phone: barbershop.phone || '',
        primary_color: barbershop.primary_color || '#F59E0B',
        background_color: barbershop.background_color || '#09090B',
        font_style: barbershop.font_style || 'modern',
        about_text: barbershop.about_text || '',
        instagram_url: barbershop.instagram_url || '',
        facebook_url: barbershop.facebook_url || '',
        whatsapp_number: barbershop.whatsapp_number || '',
      });
    }
  }, [barbershop]);

  const publicUrl = barbershop ? `${window.location.origin}/b/${barbershop.slug}` : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await api.put('/barbershops', formData);
      updateBarbershop(response.data);
      toast.success('Configurações salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (type, file) => {
    if (!file) return;
    
    setUploading(prev => ({ ...prev, [type]: true }));
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(`/barbershops/upload/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        // Refresh barbershop data
        const barbershopRes = await api.get('/barbershops/me');
        updateBarbershop(barbershopRes.data);
        toast.success(`${type === 'logo' ? 'Logo' : type === 'banner' ? 'Banner' : 'Imagem'} atualizado!`);
      }
    } catch (error) {
      toast.error('Erro ao fazer upload');
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleDeleteGalleryImage = async (imageUrl) => {
    if (!window.confirm('Remover esta imagem da galeria?')) return;
    
    try {
      await api.delete('/barbershops/gallery', { params: { image_url: imageUrl } });
      const barbershopRes = await api.get('/barbershops/me');
      updateBarbershop(barbershopRes.data);
      toast.success('Imagem removida');
    } catch (error) {
      toast.error('Erro ao remover imagem');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlanStatus = () => {
    if (!barbershop) return null;
    
    const status = barbershop.plan_status;
    const plan = barbershop.plan;
    
    if (status === 'active') {
      return {
        label: plan === 'premium' ? 'Premium Ativo' : 'Comum Ativo',
        color: plan === 'premium' ? 'bg-primary/20 text-primary' : 'bg-green-500/20 text-green-500',
        icon: Crown
      };
    } else if (status === 'expired') {
      return {
        label: 'Plano Expirado',
        color: 'bg-red-500/20 text-red-500',
        icon: AlertTriangle
      };
    }
    return null;
  };

  const planStatus = getPlanStatus();

  const tabs = [
    { id: 'info', label: 'Informações', icon: Store },
    { id: 'visual', label: 'Visual', icon: Palette },
    { id: 'gallery', label: 'Galeria', icon: Image },
    { id: 'social', label: 'Redes Sociais', icon: Instagram },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight">
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Personalize sua página pública de agendamento
        </p>
      </div>

      {/* Plan Status */}
      {planStatus && (
        <Card className={`border-border ${planStatus.color.includes('yellow') ? 'border-yellow-500/50' : ''}`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <planStatus.icon className="w-5 h-5" />
                <div>
                  <Badge className={planStatus.color}>{planStatus.label}</Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    Plano atual: <strong>{barbershop?.plan === 'premium' ? 'Premium' : 'Comum'}</strong>
                  </p>
                </div>
              </div>
              {barbershop?.plan !== 'premium' && (
                <Button 
                  onClick={() => window.location.href = '/assinatura'}
                  className="btn-press"
                  data-testid="upgrade-plan-button"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Fazer Upgrade
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Public Link & QR Code */}
      <Card className="border-border border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" />
            Seu Link de Agendamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Input
              readOnly
              value={publicUrl}
              className="font-mono text-sm"
              data-testid="public-link-input"
            />
            <Button onClick={copyLink} className="btn-press shrink-0" data-testid="copy-link-button">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <QRCodeDisplay url={publicUrl} size={150} />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Escaneie o QR Code para acessar a página de agendamento.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(publicUrl)}&bgcolor=09090B&color=F59E0B`;
                  window.open(qrUrl, '_blank');
                }}
                data-testid="download-qr-button"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Baixar QR Code (HD)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              Informações da Barbearia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Barbearia</Label>
                  <Input
                    id="name"
                    placeholder="Nome da sua barbearia"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="barbershop-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone/WhatsApp</Label>
                  <PhoneInput
                    id="phone"
                    placeholder="(64) 99976-6685"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    onNormalized={(normalized) => setFormData({ ...formData, phone: normalized })}
                    data-testid="barbershop-phone-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição Curta</Label>
                <Input
                  id="description"
                  placeholder="Ex: A melhor barbearia da região"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="barbershop-description-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço Completo</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="address"
                    placeholder="Rua, número, bairro, cidade - CEP"
                    className="pl-10"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    data-testid="barbershop-address-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="about_text">Sobre Nós (Texto completo)</Label>
                <Textarea
                  id="about_text"
                  placeholder="Conte a história da sua barbearia, diferenciais, especialidades..."
                  value={formData.about_text}
                  onChange={(e) => setFormData({ ...formData, about_text: e.target.value })}
                  rows={4}
                  data-testid="barbershop-about-input"
                />
                <p className="text-xs text-muted-foreground">
                  Este texto aparecerá na seção "Sobre" da sua página pública
                </p>
              </div>

              <Button type="submit" disabled={saving} className="btn-press" data-testid="save-info-button">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Informações'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'visual' && (
        <div className="space-y-6">
          {/* Logo & Banner */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Logo e Banner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div>
                <Label className="mb-2 block">Logo da Barbearia</Label>
                <div className="flex items-center gap-4">
                  {barbershop?.logo_url ? (
                    <img 
                      src={getImageUrl(barbershop.logo_url)} 
                      alt="Logo" 
                      className="w-20 h-20 object-cover rounded-lg border border-border"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-secondary rounded-lg flex items-center justify-center border border-dashed border-border">
                      <Store className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUpload('logo', e.target.files[0])}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploading.logo}
                      data-testid="upload-logo-button"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading.logo ? 'Enviando...' : 'Upload Logo'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recomendado: 200x200px, PNG ou JPG
                    </p>
                  </div>
                </div>
              </div>

              {/* Banner */}
              <div>
                <Label className="mb-2 block">Banner / Imagem de Capa</Label>
                {barbershop?.banner_url ? (
                  <div className="space-y-3">
                    {/* Banner Preview with Position */}
                    <div 
                      className="relative w-full h-40 rounded-lg border border-border overflow-hidden"
                      style={{
                        backgroundImage: `url(${getImageUrl(barbershop.banner_url)})`,
                        backgroundSize: 'cover',
                        backgroundPosition: barbershop?.banner_position === 'top' ? 'top' 
                          : barbershop?.banner_position === 'bottom' ? 'bottom' 
                          : 'center'
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
                      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        Preview
                      </div>
                    </div>
                    
                    {/* Position Controls */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Posição:</span>
                      {[
                        { id: 'top', label: 'Topo' },
                        { id: 'center', label: 'Centro' },
                        { id: 'bottom', label: 'Baixo' }
                      ].map(pos => (
                        <Button
                          key={pos.id}
                          type="button"
                          size="sm"
                          variant={barbershop?.banner_position === pos.id || (!barbershop?.banner_position && pos.id === 'center') ? 'default' : 'outline'}
                          onClick={async () => {
                            try {
                              const response = await api.put('/barbershops', { banner_position: pos.id });
                              updateBarbershop(response.data);
                              toast.success('Posição atualizada!');
                            } catch (error) {
                              toast.error('Erro ao atualizar posição');
                            }
                          }}
                          data-testid={`banner-position-${pos.id}`}
                        >
                          {pos.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-40 bg-secondary rounded-lg flex items-center justify-center border border-dashed border-border">
                    <div className="text-center">
                      <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum banner</p>
                    </div>
                  </div>
                )}
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload('banner', e.target.files[0])}
                />
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploading.banner}
                  data-testid="upload-banner-button"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading.banner ? 'Enviando...' : barbershop?.banner_url ? 'Trocar Banner' : 'Upload Banner'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Recomendado: 1200x400px ou maior (PNG, JPG). Ajuste a posição após o upload.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Colors & Font */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Cores e Fonte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Font Style */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    Estilo de Fonte
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {FONT_STYLES.map(style => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, font_style: style.id })}
                        className={`p-4 rounded-lg border text-center transition-all ${
                          formData.font_style === style.id 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        data-testid={`font-${style.id}`}
                      >
                        <span style={{ fontFamily: style.font }} className="text-lg">
                          Aa
                        </span>
                        <p className="text-xs mt-1 text-muted-foreground">{style.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor Principal</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        className="w-12 h-12 rounded cursor-pointer border border-border"
                        data-testid="primary-color-input"
                      />
                      <Input
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        className="font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor de Fundo</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.background_color}
                        onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                        className="w-12 h-12 rounded cursor-pointer border border-border"
                        data-testid="background-color-input"
                      />
                      <Input
                        value={formData.background_color}
                        onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <Label className="mb-2 block">Pré-visualização</Label>
                  <div 
                    className="rounded-lg p-6 border border-border"
                    style={{ backgroundColor: formData.background_color }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      {barbershop?.logo_url && (
                        <img src={getImageUrl(barbershop.logo_url)} alt="Logo" className="w-10 h-10 rounded" />
                      )}
                      <h3 
                        className="font-heading text-xl" 
                        style={{ 
                          color: formData.primary_color,
                          fontFamily: FONT_STYLES.find(f => f.id === formData.font_style)?.font
                        }}
                      >
                        {formData.name || 'Sua Barbearia'}
                      </h3>
                    </div>
                    <button 
                      className="px-4 py-2 rounded-md font-medium text-black"
                      style={{ backgroundColor: formData.primary_color }}
                    >
                      Agendar Horário
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={saving} className="btn-press" data-testid="save-visual-button">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar Visual'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'gallery' && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
              <Image className="w-5 h-5 text-primary" />
              Galeria de Trabalhos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione fotos dos seus melhores trabalhos para atrair mais clientes.
            </p>

            {/* Upload Button */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleUpload('gallery', e.target.files[0])}
            />
            <Button 
              variant="outline" 
              className="mb-6"
              onClick={() => galleryInputRef.current?.click()}
              disabled={uploading.gallery}
              data-testid="upload-gallery-button"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading.gallery ? 'Enviando...' : 'Adicionar Foto'}
            </Button>

            {/* Gallery Grid */}
            {barbershop?.gallery_images?.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {barbershop.gallery_images.map((url, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img 
                      src={getImageUrl(url)} 
                      alt={`Trabalho ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-border"
                    />
                    <button
                      onClick={() => handleDeleteGalleryImage(url)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`delete-gallery-${index}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <Image className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma foto na galeria</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Adicione fotos dos seus cortes e serviços
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'social' && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
              <Instagram className="w-5 h-5 text-primary" />
              Redes Sociais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Adicione seus links de redes sociais para que seus clientes possam te seguir.
              </p>

              <div className="space-y-2">
                <Label htmlFor="instagram_url" className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Instagram
                </Label>
                <Input
                  id="instagram_url"
                  placeholder="https://instagram.com/suabarbearia"
                  value={formData.instagram_url}
                  onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                  data-testid="instagram-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebook_url" className="flex items-center gap-2">
                  <Facebook className="w-4 h-4" />
                  Facebook
                </Label>
                <Input
                  id="facebook_url"
                  placeholder="https://facebook.com/suabarbearia"
                  value={formData.facebook_url}
                  onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                  data-testid="facebook-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_number" className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp para Contato Direto
                </Label>
                <PhoneInput
                  id="whatsapp_number"
                  placeholder="(64) 99976-6685"
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  onNormalized={(normalized) => setFormData({ ...formData, whatsapp_number: normalized })}
                  data-testid="whatsapp-input"
                />
                <p className="text-xs text-muted-foreground">
                  Este botão aparecerá na sua página para contato direto
                </p>
              </div>

              <Button type="submit" disabled={saving} className="btn-press" data-testid="save-social-button">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Redes Sociais'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Account Info */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Informações da Conta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Slug (URL)</span>
              <span className="font-mono">{barbershop?.slug}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">ID da Barbearia</span>
              <span className="font-mono text-xs">{barbershop?.barbershop_id}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Plano</span>
              <span className="capitalize">{barbershop?.plan}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Criada em</span>
              <span>{barbershop?.created_at ? new Date(barbershop.created_at).toLocaleDateString('pt-BR') : '-'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
