import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { formatCurrency, formatDate, getDayName } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Calendar } from '../components/ui/calendar';
import {
  Scissors,
  Clock,
  MapPin,
  Phone,
  User,
  ChevronLeft,
  ChevronRight,
  Check,
  Calendar as CalendarIcon,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, isBefore, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const steps = ['service', 'professional', 'datetime', 'info', 'confirm'];

export default function PublicBookingPage() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [step, setStep] = useState('service');
  const [booking, setBooking] = useState({
    service: null,
    professional: null,
    date: null,
    time: null,
    clientName: '',
    clientPhone: '',
    clientEmail: '',
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [vipInfo, setVipInfo] = useState({ is_vip: false, discount_percentage: 0 });
  const [checkingVip, setCheckingVip] = useState(false);

  // Get custom colors from barbershop
  const primaryColor = data?.barbershop?.primary_color || '#F59E0B';
  const bgColor = data?.barbershop?.background_color || '#09090B';

  useEffect(() => {
    fetchBarbershop();
  }, [slug]);

  useEffect(() => {
    if (booking.service && booking.date && data) {
      fetchAvailability();
    }
  }, [booking.service, booking.date, booking.professional]);

  // Apply custom colors
  useEffect(() => {
    if (data?.barbershop) {
      document.documentElement.style.setProperty('--booking-primary', primaryColor);
      document.documentElement.style.setProperty('--booking-bg', bgColor);
    }
    return () => {
      document.documentElement.style.removeProperty('--booking-primary');
      document.documentElement.style.removeProperty('--booking-bg');
    };
  }, [data, primaryColor, bgColor]);

  const fetchBarbershop = async () => {
    try {
      const response = await api.get(`/barbershops/public/${slug}`);
      setData(response.data);
    } catch (error) {
      toast.error('Barbearia não encontrada');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    if (!booking.service || !booking.date) return;
    
    setLoadingSlots(true);
    try {
      const dateStr = format(booking.date, 'yyyy-MM-dd');
      let url = `/appointments/availability/${data.barbershop.barbershop_id}?date=${dateStr}&service_id=${booking.service.service_id}`;
      if (booking.professional) {
        url += `&professional_id=${booking.professional.professional_id}`;
      }
      const response = await api.get(url);
      setAvailableSlots(response.data.available_slots || []);
    } catch (error) {
      toast.error('Erro ao buscar horários');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleServiceSelect = (service) => {
    setBooking({ ...booking, service, time: null });
    // Skip professional step if no professionals
    if (data.professionals.length === 0) {
      setStep('datetime');
    } else {
      setStep('professional');
    }
  };

  const handleProfessionalSelect = (professional) => {
    setBooking({ ...booking, professional, time: null });
    setStep('datetime');
  };

  const handleDateSelect = (date) => {
    setBooking({ ...booking, date, time: null });
  };

  const handleTimeSelect = (time) => {
    setBooking({ ...booking, time });
    setStep('info');
  };

  // Check VIP status when phone changes
  const checkVipStatus = async (phone) => {
    if (!phone || phone.length < 10 || !data?.barbershop) return;
    
    setCheckingVip(true);
    try {
      const response = await api.get(`/vip-clients/check/${encodeURIComponent(phone)}?barbershop_id=${data.barbershop.barbershop_id}`);
      setVipInfo(response.data);
      if (response.data.is_vip && response.data.client_name) {
        setBooking(prev => ({ ...prev, clientName: response.data.client_name }));
      }
    } catch (error) {
      setVipInfo({ is_vip: false, discount_percentage: 0 });
    } finally {
      setCheckingVip(false);
    }
  };

  const handlePhoneChange = (e) => {
    const phone = e.target.value;
    setBooking({ ...booking, clientPhone: phone });
    
    // Check VIP after user stops typing (debounce)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      const timeoutId = setTimeout(() => checkVipStatus(cleanPhone), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  // Calculate final price with VIP discount
  const calculateFinalPrice = () => {
    if (!booking.service) return 0;
    const originalPrice = booking.service.price;
    if (vipInfo.is_vip && vipInfo.discount_percentage > 0) {
      return originalPrice * (1 - vipInfo.discount_percentage / 100);
    }
    return originalPrice;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await api.post('/appointments', {
        barbershop_id: data.barbershop.barbershop_id,
        service_id: booking.service.service_id,
        professional_id: booking.professional?.professional_id || null,
        date: format(booking.date, 'yyyy-MM-dd'),
        time: booking.time,
        client_name: booking.clientName,
        client_phone: booking.clientPhone,
        client_email: booking.clientEmail || null,
      });
      setSuccessData(response.data);
      setSuccess(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao realizar agendamento');
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      // Skip professional step if no professionals
      if (steps[currentIndex - 1] === 'professional' && data.professionals.length === 0) {
        setStep('service');
      } else {
        setStep(steps[currentIndex - 1]);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border text-center">
          <CardContent className="py-12">
            <Scissors className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">Barbearia não encontrada</p>
            <p className="text-muted-foreground mt-2">
              O link pode estar incorreto ou a barbearia não existe mais.
            </p>
            <Link to="/" className="mt-6 inline-block">
              <Button variant="outline">Voltar ao início</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    const finalPrice = successData?.final_price || calculateFinalPrice();
    const originalPrice = successData?.original_price || booking.service?.price || 0;
    const discountApplied = successData?.discount_percentage || (vipInfo.is_vip ? vipInfo.discount_percentage : 0);
    const isVip = successData?.is_vip || vipInfo.is_vip;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border text-center border-green-500/30 bg-green-500/5">
          <CardContent className="py-12">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="font-heading text-2xl uppercase mb-2">Agendamento Confirmado!</h2>
            <p className="text-muted-foreground mb-6">
              Seu horário foi reservado com sucesso. Você receberá uma confirmação por WhatsApp.
            </p>
            <div className="bg-secondary/50 rounded-lg p-4 text-left space-y-2 mb-6">
              <p><strong>Serviço:</strong> {booking.service.name}</p>
              <p><strong>Data:</strong> {format(booking.date, "dd 'de' MMMM", { locale: ptBR })}</p>
              <p><strong>Horário:</strong> {booking.time}</p>
              {booking.professional && (
                <p><strong>Profissional:</strong> {booking.professional.name}</p>
              )}
              {isVip && discountApplied > 0 ? (
                <>
                  <div className="pt-2 border-t border-gray-600">
                    <p className="text-yellow-500 font-semibold flex items-center gap-1">
                      <span>🌟</span> Cliente VIP!
                    </p>
                    <p className="text-gray-400 line-through text-sm">
                      Valor original: {formatCurrency(originalPrice)}
                    </p>
                    <p className="text-green-400 font-semibold">
                      Com desconto de {discountApplied}%: {formatCurrency(finalPrice)}
                    </p>
                  </div>
                </>
              ) : (
                <p><strong>Valor:</strong> {formatCurrency(originalPrice)}</p>
              )}
            </div>
            <Button 
              onClick={() => {
                setSuccess(false);
                setSuccessData(null);
                setVipInfo({ is_vip: false, discount_percentage: 0 });
                setStep('service');
                setBooking({
                  service: null,
                  professional: null,
                  date: null,
                  time: null,
                  clientName: '',
                  clientPhone: '',
                  clientEmail: '',
                });
              }}
              variant="outline"
              data-testid="new-booking-button"
            >
              Fazer outro agendamento
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { barbershop, services, professionals, business_hours } = data;

  // Custom styles based on barbershop colors
  const customStyles = {
    '--custom-primary': primaryColor,
    '--custom-bg': bgColor,
  };

  return (
    <div 
      className="min-h-screen" 
      style={{ 
        backgroundColor: bgColor,
        ...customStyles 
      }}
    >
      {/* Header */}
      <header 
        className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-md"
        style={{ backgroundColor: `${bgColor}dd` }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <Scissors className="w-5 h-5" style={{ color: primaryColor }} />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl uppercase text-white">{barbershop.name}</h1>
              {barbershop.address && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {barbershop.address}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['service', 'datetime', 'info'].map((s, i) => (
            <div
              key={s}
              className="w-3 h-3 rounded-full transition-colors"
              style={{
                backgroundColor: steps.indexOf(step) >= steps.indexOf(s === 'datetime' ? 'professional' : s)
                  ? primaryColor
                  : '#374151'
              }}
            />
          ))}
        </div>

        {/* Back Button */}
        {step !== 'service' && (
          <Button
            variant="ghost"
            onClick={goBack}
            className="mb-4 text-white hover:bg-white/10"
            data-testid="back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        )}

        {/* Step: Service Selection */}
        {step === 'service' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="font-heading text-2xl uppercase text-white">Escolha o Serviço</h2>
            {services.length === 0 ? (
              <Card className="border-gray-700 bg-gray-800/50">
                <CardContent className="py-8 text-center text-gray-400">
                  Nenhum serviço disponível no momento.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {services.map((service) => (
                  <Card
                    key={service.service_id}
                    className="border-gray-700 bg-gray-800/50 hover:border-opacity-50 cursor-pointer transition-all"
                    style={{ '--hover-border': primaryColor }}
                    onClick={() => handleServiceSelect(service)}
                    data-testid={`service-option-${service.service_id}`}
                  >
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-lg text-white">{service.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {service.duration} min
                          </span>
                        </div>
                      </div>
                      <span className="text-xl font-bold" style={{ color: primaryColor }}>
                        {formatCurrency(service.price)}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Professional Selection */}
        {step === 'professional' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="font-heading text-2xl uppercase text-white">Escolha o Profissional</h2>
            <div className="grid gap-3">
              <Card
                className="border-gray-700 bg-gray-800/50 hover:border-opacity-50 cursor-pointer transition-all"
                onClick={() => handleProfessionalSelect(null)}
                data-testid="professional-any"
              >
                <CardContent className="py-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Sem preferência</h3>
                    <p className="text-sm text-gray-400">Qualquer profissional disponível</p>
                  </div>
                </CardContent>
              </Card>
              {professionals.map((prof) => (
                <Card
                  key={prof.professional_id}
                  className="border-gray-700 bg-gray-800/50 hover:border-opacity-50 cursor-pointer transition-all"
                  onClick={() => handleProfessionalSelect(prof)}
                  data-testid={`professional-option-${prof.professional_id}`}
                >
                  <CardContent className="py-4 flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}20` }}
                    >
                      <span className="font-bold text-lg" style={{ color: primaryColor }}>
                        {prof.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{prof.name}</h3>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step: Date & Time Selection */}
        {step === 'datetime' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="font-heading text-2xl uppercase text-white">Escolha a Data e Horário</h2>
            
            <Card className="border-gray-700 bg-gray-800/50">
              <CardContent className="py-4">
                <Calendar
                  mode="single"
                  selected={booking.date}
                  onSelect={handleDateSelect}
                  locale={ptBR}
                  disabled={(date) => isBefore(date, startOfToday())}
                  className="mx-auto"
                />
              </CardContent>
            </Card>

            {booking.date && (
              <div className="space-y-3">
                <h3 className="font-medium text-white">
                  Horários disponíveis em {format(booking.date, "dd 'de' MMMM", { locale: ptBR })}
                </h3>
                
                {loadingSlots ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="skeleton h-10 rounded" />
                    ))}
                  </div>
                ) : availableSlots.length === 0 ? (
                  <Card className="border-gray-700 bg-gray-800/30">
                    <CardContent className="py-6 text-center text-gray-400">
                      Nenhum horário disponível nesta data. Escolha outra data.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant="outline"
                        onClick={() => handleTimeSelect(slot.time)}
                        className="btn-press border-gray-700 text-white hover:text-white"
                        style={booking.time === slot.time ? { 
                          backgroundColor: primaryColor, 
                          borderColor: primaryColor 
                        } : {
                          backgroundColor: 'transparent'
                        }}
                        data-testid={`time-slot-${slot.time}`}
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Client Info */}
        {step === 'info' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="font-heading text-2xl uppercase text-white">Seus Dados</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="text-white">Nome completo *</Label>
                <Input
                  id="clientName"
                  placeholder="Seu nome"
                  value={booking.clientName}
                  onChange={(e) => setBooking({ ...booking, clientName: e.target.value })}
                  required
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="client-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientPhone" className="text-white">WhatsApp *</Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={booking.clientPhone}
                  onChange={(e) => setBooking({ ...booking, clientPhone: e.target.value })}
                  required
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="client-phone-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientEmail" className="text-white">Email (opcional)</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="seu@email.com"
                  value={booking.clientEmail}
                  onChange={(e) => setBooking({ ...booking, clientEmail: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="client-email-input"
                />
                <p className="text-xs text-gray-400">
                  Receba confirmação e lembretes por email
                </p>
              </div>

              {/* Summary */}
              <Card className="border-gray-700 bg-gray-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-white">Resumo do Agendamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Serviço</span>
                    <span className="text-white">{booking.service?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Data</span>
                    <span className="text-white">{booking.date && format(booking.date, "dd/MM/yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Horário</span>
                    <span className="text-white">{booking.time}</span>
                  </div>
                  {booking.professional && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Profissional</span>
                      <span className="text-white">{booking.professional.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-700 font-medium">
                    <span className="text-white">Total</span>
                    <span style={{ color: primaryColor }}>{formatCurrency(booking.service?.price || 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Button
                type="submit"
                className="w-full btn-press text-lg h-12 text-white"
                style={{ backgroundColor: primaryColor }}
                disabled={submitting}
                data-testid="confirm-booking-button"
              >
                {submitting ? 'Confirmando...' : 'Confirmar Agendamento'}
              </Button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
