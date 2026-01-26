import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
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
  AlertTriangle
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

export default function SettingsPage() {
  const { barbershop, updateBarbershop } = useAuth();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: barbershop?.name || '',
    description: barbershop?.description || '',
    address: barbershop?.address || '',
    phone: barbershop?.phone || '',
    primary_color: barbershop?.primary_color || '#F59E0B',
    background_color: barbershop?.background_color || '#09090B',
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
    
    if (status === 'trial') {
      const expiresAt = barbershop.plan_expires_at ? new Date(barbershop.plan_expires_at) : null;
      const daysLeft = expiresAt ? Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24)) : 0;
      return {
        label: `Período de Teste - ${daysLeft} dias restantes`,
        color: 'bg-yellow-500/20 text-yellow-500',
        icon: AlertTriangle
      };
    } else if (status === 'active') {
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight">
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure as informações da sua barbearia
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
          <p className="text-sm text-muted-foreground mb-4">
            Compartilhe este link com seus clientes para receberem agendamentos online.
          </p>
          <div className="flex items-center gap-2 mb-6">
            <Input
              readOnly
              value={publicUrl}
              className="font-mono text-sm"
              data-testid="public-link-input"
            />
            <Button onClick={copyLink} className="btn-press shrink-0" data-testid="copy-link-button">
              {copied ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>

          {/* QR Code */}
          <div className="border-t border-border pt-6">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-primary" />
              <h3 className="font-medium">QR Code</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Imprima e cole no espelho da barbearia para seus clientes acessarem facilmente.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <QRCodeDisplay url={publicUrl} size={180} />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Escaneie o QR Code com a câmera do celular para acessar a página de agendamento.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(publicUrl)}&bgcolor=09090B&color=F59E0B`;
                    window.open(qrUrl, '_blank');
                  }}
                  data-testid="download-qr-button"
                >
                  Baixar QR Code (HD)
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Barbershop Info */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            Informações da Barbearia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Barbearia</Label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="Nome da sua barbearia"
                  className="pl-10"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="barbershop-name-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Conte um pouco sobre sua barbearia..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                data-testid="barbershop-description-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="address"
                  placeholder="Rua, número, bairro, cidade"
                  className="pl-10"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  data-testid="barbershop-address-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone/WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  className="pl-10"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  data-testid="barbershop-phone-input"
                />
              </div>
            </div>

            <Button type="submit" disabled={saving} className="btn-press" data-testid="save-settings-button">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Custom Colors */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Cores Personalizadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Personalize as cores da sua página pública de agendamento.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Cor Principal (Botões e Destaques)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="primary_color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-12 h-12 rounded cursor-pointer border border-border"
                    data-testid="primary-color-input"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    placeholder="#F59E0B"
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="background_color">Cor de Fundo</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="background_color"
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="w-12 h-12 rounded cursor-pointer border border-border"
                    data-testid="background-color-input"
                  />
                  <Input
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    placeholder="#09090B"
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-6">
              <Label className="mb-2 block">Pré-visualização</Label>
              <div 
                className="rounded-lg p-6 border border-border"
                style={{ backgroundColor: formData.background_color }}
              >
                <h3 className="font-heading text-xl mb-4" style={{ color: formData.primary_color }}>
                  {formData.name || 'Sua Barbearia'}
                </h3>
                <button 
                  className="px-4 py-2 rounded-md font-medium text-black"
                  style={{ backgroundColor: formData.primary_color }}
                >
                  Agendar Horário
                </button>
              </div>
            </div>

            <Button type="submit" disabled={saving} className="btn-press" data-testid="save-colors-button">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Cores'}
            </Button>
          </form>
        </CardContent>
      </Card>

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
