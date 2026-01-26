import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Settings, Store, MapPin, Phone, Save, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { barbershop, updateBarbershop } = useAuth();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: barbershop?.name || '',
    description: barbershop?.description || '',
    address: barbershop?.address || '',
    phone: barbershop?.phone || '',
  });

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

      {/* Public Link */}
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
          <div className="flex items-center gap-2">
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
