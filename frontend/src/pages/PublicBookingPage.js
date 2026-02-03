import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getImageUrl } from '../lib/api';
import { formatCurrency, formatDate, getDayName } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Calendar } from '../components/ui/calendar';
import { PhoneInput } from '../components/ui/phone-input';
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
  Instagram,
  Facebook,
  MessageCircle,
  ExternalLink,
  Image,
  Info,
  X,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, isBefore, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const steps = ['service', 'professional', 'datetime', 'info', 'confirm'];

const FONT_STYLES = {
  modern: 'Inter, sans-serif',
  classic: 'Georgia, serif',
  bold: 'Arial Black, sans-serif',
};

// Gallery Modal Component
function GalleryModal({ images, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full"
      >
        <X className="w-6 h-6" />
      </button>
      
      <button 
        onClick={() => setCurrentIndex(i => i > 0 ? i - 1 : images.length - 1)}
        className="absolute left-4 p-2 text-white hover:bg-white/10 rounded-full"
      >
        <ChevronLeft className="w-8 h-8" />
      </button>
      
      <img 
        src={images[currentIndex]} 
        alt={`Trabalho ${currentIndex + 1}`}
        className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg"
      />
      
      <button 
        onClick={() => setCurrentIndex(i => i < images.length - 1 ? i + 1 : 0)}
        className="absolute right-4 p-2 text-white hover:bg-white/10 rounded-full"
      >
        <ChevronRight className="w-8 h-8" />
      </button>
      
      <div className="absolute bottom-4 text-white text-sm">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}

export default function PublicBookingPage() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [step, setStep] = useState('service');
  const [showGallery, setShowGallery] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [booking, setBooking] = useState({
    services: [],  // Changed from service to services array
    professional: null,
    date: null,
    time: null,
    clientName: '',
    clientPhone: '',
    clientPhoneNormalized: '',
    clientEmail: '',
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [vipInfo, setVipInfo] = useState({ is_vip: false, discount_percentage: 0 });
  const [checkingVip, setCheckingVip] = useState(false);

  // Get custom styles from barbershop
  const primaryColor = data?.barbershop?.primary_color || '#F59E0B';
  const bgColor = data?.barbershop?.background_color || '#09090B';
  const fontStyle = FONT_STYLES[data?.barbershop?.font_style] || FONT_STYLES.modern;

  // Calculate totals from selected services
  const totalPrice = booking.services.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = booking.services.reduce((sum, s) => sum + s.duration, 0);

  useEffect(() => {
    fetchBarbershop();
  }, [slug]);

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

  useEffect(() => {
    if (booking.date && booking.services.length > 0) {
      fetchAvailability();
    }
  }, [booking.date, booking.services, booking.professional]);

  const fetchAvailability = async () => {
    if (!booking.date || !data?.barbershop || booking.services.length === 0) return;
    
    setLoadingSlots(true);
    try {
      const dateStr = format(booking.date, 'yyyy-MM-dd');
      // Use the first service for availability check
      const response = await api.get(
        `/appointments/availability/${data.barbershop.barbershop_id}?date=${dateStr}&service_id=${booking.services[0].service_id}${booking.professional ? `&professional_id=${booking.professional.professional_id}` : ''}`
      );
      setAvailableSlots(response.data.available_slots || []);
    } catch (error) {
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleServiceToggle = (service) => {
    const isSelected = booking.services.some(s => s.service_id === service.service_id);
    if (isSelected) {
      setBooking({ 
        ...booking, 
        services: booking.services.filter(s => s.service_id !== service.service_id),
        time: null 
      });
    } else {
      setBooking({ 
        ...booking, 
        services: [...booking.services, service],
        time: null 
      });
    }
  };

  const handleContinueFromServices = () => {
    if (booking.services.length === 0) {
      toast.error('Selecione pelo menos um serviço');
      return;
    }
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
    
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      const timeoutId = setTimeout(() => checkVipStatus(cleanPhone), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const handlePhoneNormalized = (normalizedPhone) => {
    setBooking(prev => ({ ...prev, clientPhoneNormalized: normalizedPhone }));
    // Check VIP with normalized phone
    if (normalizedPhone) {
      checkVipStatus(normalizedPhone.replace(/\D/g, ''));
    }
  };

  const calculateFinalPrice = () => {
    if (booking.services.length === 0) return 0;
    const originalPrice = totalPrice;
    if (vipInfo.is_vip && vipInfo.discount_percentage > 0) {
      return originalPrice * (1 - vipInfo.discount_percentage / 100);
    }
    return originalPrice;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Use normalized phone for submission
    const phoneToSubmit = booking.clientPhoneNormalized || booking.clientPhone;
    if (!phoneToSubmit || phoneToSubmit.replace(/\D/g, '').length < 10) {
      toast.error('Informe um número de WhatsApp válido com DDD');
      return;
    }
    
    setSubmitting(true);

    try {
      const response = await api.post('/appointments', {
        barbershop_id: data.barbershop.barbershop_id,
        service_ids: booking.services.map(s => s.service_id),  // Changed to service_ids array
        professional_id: booking.professional?.professional_id || null,
        date: format(booking.date, 'yyyy-MM-dd'),
        time: booking.time,
        client_name: booking.clientName,
        client_phone: phoneToSubmit,
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
      if (steps[currentIndex - 1] === 'professional' && data.professionals.length === 0) {
        setStep('service');
      } else {
        setStep(steps[currentIndex - 1]);
      }
    }
  };

  // Format business hours for display
  const formatBusinessHours = () => {
    if (!data?.business_hours) return [];
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return data.business_hours
      .sort((a, b) => a.day_of_week - b.day_of_week)
      .map(h => ({
        day: days[h.day_of_week],
        hours: h.is_closed ? 'Fechado' : `${h.start_time} - ${h.end_time}`
      }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Scissors className="w-12 h-12 text-primary animate-pulse mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 border-border">
          <CardContent className="py-12 text-center">
            <Scissors className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-xl uppercase mb-2">Barbearia não encontrada</h2>
            <p className="text-muted-foreground mb-4">
              O link pode estar incorreto ou a barbearia foi desativada.
            </p>
            <Link to="/">
              <Button variant="outline">Voltar ao início</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Custom CSS styles based on barbershop settings
  const customStyles = {
    '--primary-color': primaryColor,
    fontFamily: fontStyle,
  };

  // Success screen
  if (success) {
    const finalPrice = successData?.final_price || calculateFinalPrice();
    const originalPrice = successData?.original_price || totalPrice;
    const discountApplied = successData?.discount_percentage || (vipInfo.is_vip ? vipInfo.discount_percentage : 0);
    const isVip = successData?.is_vip || vipInfo.is_vip;
    const servicesText = successData?.services_text || booking.services.map(s => s.name).join(', ');

    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: bgColor }}>
        <Card className="w-full max-w-md text-center bg-zinc-900 border-green-500/30">
          <CardContent className="py-12">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl uppercase mb-2 text-white" style={{ fontFamily: fontStyle }}>
              Agendamento Confirmado!
            </h2>
            <p className="text-gray-400 mb-6">
              Você receberá uma confirmação por WhatsApp.
            </p>
            <div className="bg-zinc-800 rounded-lg p-4 text-left space-y-2 mb-6 text-white">
              <p><strong className="text-gray-300">Serviço(s):</strong> {servicesText}</p>
              <p><strong className="text-gray-300">Duração total:</strong> {totalDuration} min</p>
              <p><strong className="text-gray-300">Data:</strong> {format(booking.date, "dd 'de' MMMM", { locale: ptBR })}</p>
              <p><strong className="text-gray-300">Horário:</strong> {booking.time}</p>
              {booking.professional && (
                <p><strong className="text-gray-300">Profissional:</strong> {booking.professional.name}</p>
              )}
              {isVip && discountApplied > 0 ? (
                <div className="pt-2 border-t border-zinc-700">
                  <p className="text-yellow-500 font-semibold flex items-center gap-1">
                    <Star className="w-4 h-4" fill="currentColor" /> Cliente VIP!
                  </p>
                  <p className="text-gray-400 line-through text-sm">
                    Valor original: {formatCurrency(originalPrice)}
                  </p>
                  <p className="text-green-400 font-semibold">
                    Com desconto de {discountApplied}%: {formatCurrency(finalPrice)}
                  </p>
                </div>
              ) : (
                <p><strong className="text-gray-300">Valor:</strong> <span style={{ color: primaryColor }}>{formatCurrency(originalPrice)}</span></p>
              )}
            </div>
            <Button 
              onClick={() => {
                setSuccess(false);
                setSuccessData(null);
                setVipInfo({ is_vip: false, discount_percentage: 0 });
                setStep('service');
                setBooking({
                  services: [],
                  professional: null,
                  date: null,
                  time: null,
                  clientName: '',
                  clientPhone: '',
                  clientEmail: '',
                });
              }}
              className="w-full text-black font-semibold"
              style={{ backgroundColor: primaryColor }}
              data-testid="new-booking-button"
            >
              Fazer outro agendamento
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: bgColor,
        ...customStyles 
      }}
    >
      {/* Gallery Modal */}
      {showGallery && (
        <GalleryModal 
          images={data.barbershop.gallery_images?.map(url => getImageUrl(url))} 
          onClose={() => setShowGallery(false)} 
        />
      )}

      {/* Header with Banner */}
      <header className="relative">
        {data.barbershop.banner_url ? (
          <div 
            className="h-48"
            style={{ 
              backgroundImage: `url(${getImageUrl(data.barbershop.banner_url)})`,
              backgroundSize: `${data.barbershop.banner_zoom || 100}%`,
              backgroundPosition: `center ${data.barbershop.banner_offset_y ?? 50}%`,
              backgroundRepeat: 'no-repeat'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70" />
          </div>
        ) : (
          <div className="h-32" style={{ backgroundColor: bgColor }} />
        )}
        
        {/* Logo and Name */}
        <div className="absolute bottom-0 left-0 right-0 transform translate-y-1/2 px-4">
          <div className="max-w-2xl mx-auto flex items-end gap-4">
            {data.barbershop.logo_url ? (
              <img 
                src={getImageUrl(data.barbershop.logo_url)} 
                alt={data.barbershop.name}
                className="w-20 h-20 rounded-xl border-4 object-cover"
                style={{ borderColor: bgColor }}
              />
            ) : (
              <div 
                className="w-20 h-20 rounded-xl border-4 flex items-center justify-center"
                style={{ borderColor: bgColor, backgroundColor: primaryColor }}
              >
                <Scissors className="w-8 h-8 text-black" />
              </div>
            )}
            <div className="pb-2">
              <h1 
                className="text-2xl font-bold text-white drop-shadow-lg"
                style={{ fontFamily: fontStyle }}
              >
                {data.barbershop.name}
              </h1>
              {data.barbershop.description && (
                <p className="text-white/80 text-sm drop-shadow">{data.barbershop.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Info Bar */}
      <div className="pt-14 pb-4 px-4" style={{ backgroundColor: bgColor }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {/* Location */}
            {data.barbershop.address && (
              <a
                href={data.barbershop.latitude && data.barbershop.longitude 
                  ? `https://www.google.com/maps?q=${data.barbershop.latitude},${data.barbershop.longitude}`
                  : `https://www.google.com/maps/search/${encodeURIComponent(data.barbershop.address)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
              >
                <MapPin className="w-4 h-4" style={{ color: primaryColor }} />
                <span className="truncate max-w-[200px]">{data.barbershop.address}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            
            {/* Phone */}
            {data.barbershop.phone && (
              <a
                href={`tel:${data.barbershop.phone}`}
                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4" style={{ color: primaryColor }} />
                {data.barbershop.phone}
              </a>
            )}

            {/* About */}
            {data.barbershop.about_text && (
              <button
                onClick={() => setShowAbout(!showAbout)}
                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
              >
                <Info className="w-4 h-4" style={{ color: primaryColor }} />
                Sobre
              </button>
            )}

            {/* Gallery */}
            {data.barbershop.gallery_images?.length > 0 && (
              <button
                onClick={() => setShowGallery(true)}
                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
              >
                <Image className="w-4 h-4" style={{ color: primaryColor }} />
                Galeria ({data.barbershop.gallery_images.length})
              </button>
            )}

            {/* Social Links */}
            <div className="flex items-center gap-2 ml-auto">
              {data.barbershop.instagram_url && (
                <a
                  href={data.barbershop.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  style={{ color: primaryColor }}
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {data.barbershop.facebook_url && (
                <a
                  href={data.barbershop.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  style={{ color: primaryColor }}
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {data.barbershop.whatsapp_number && (
                <a
                  href={`https://wa.me/${data.barbershop.whatsapp_number.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  style={{ color: primaryColor }}
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* About Section (Collapsible) */}
          {showAbout && data.barbershop.about_text && (
            <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
              <h3 className="font-semibold mb-2 text-white" style={{ fontFamily: fontStyle }}>
                Sobre Nós
              </h3>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{data.barbershop.about_text}</p>
              
              {/* Business Hours */}
              {data.business_hours?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h4 className="font-semibold text-sm mb-2 text-white">Horário de Funcionamento</h4>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {formatBusinessHours().map((h, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-gray-400">{h.day}</span>
                        <span className={h.hours === 'Fechado' ? 'text-red-400' : 'text-gray-300'}>
                          {h.hours}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Gallery Preview (Horizontal Scroll) */}
      {data.barbershop.gallery_images?.length > 0 && (
        <div className="px-4 pb-4" style={{ backgroundColor: bgColor }}>
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {data.barbershop.gallery_images.slice(0, 5).map((url, index) => (
                <button
                  key={index}
                  onClick={() => setShowGallery(true)}
                  className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-colors"
                >
                  <img src={getImageUrl(url)} alt={`Trabalho ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
              {data.barbershop.gallery_images.length > 5 && (
                <button
                  onClick={() => setShowGallery(true)}
                  className="flex-shrink-0 w-24 h-24 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-colors"
                >
                  +{data.barbershop.gallery_images.length - 5}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-white/10" />

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6" style={{ backgroundColor: bgColor }}>
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {step !== 'service' && (
            <button 
              onClick={goBack} 
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-zinc-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Voltar</span>
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {['service', 'datetime', 'info'].map((s, index) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    steps.indexOf(step) >= steps.indexOf(s)
                      ? 'text-black'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                  style={steps.indexOf(step) >= steps.indexOf(s) ? { backgroundColor: primaryColor } : {}}
                >
                  {index + 1}
                </div>
                {index < 2 && (
                  <div className={`w-8 h-0.5 ${steps.indexOf(step) > steps.indexOf(s) ? '' : 'bg-gray-700'}`}
                    style={steps.indexOf(step) > steps.indexOf(s) ? { backgroundColor: primaryColor } : {}}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step: Select Service */}
        {step === 'service' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl uppercase text-white" style={{ fontFamily: fontStyle }}>
              Escolha os Serviços
            </h2>
            <p className="text-gray-400 text-sm">Selecione um ou mais serviços</p>
            <div className="grid gap-3">
              {data.services.map((service) => {
                const isSelected = booking.services.some(s => s.service_id === service.service_id);
                return (
                  <button
                    key={service.service_id}
                    onClick={() => handleServiceToggle(service)}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      isSelected 
                        ? 'border-2 bg-gray-800' 
                        : 'border-gray-700 hover:border-opacity-50 bg-gray-800/50 hover:bg-gray-800'
                    }`}
                    style={isSelected ? { borderColor: primaryColor } : {}}
                    data-testid={`service-${service.service_id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div 
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mt-0.5 transition-colors ${
                            isSelected ? 'border-transparent' : 'border-gray-600'
                          }`}
                          style={isSelected ? { backgroundColor: primaryColor } : {}}
                        >
                          {isSelected && <Check className="w-4 h-4 text-black" />}
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{service.name}</h3>
                          {service.description && (
                            <p className="text-sm text-gray-400 mt-1">{service.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {service.duration} min
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-lg" style={{ color: primaryColor }}>
                        {formatCurrency(service.price)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Services Summary */}
            {booking.services.length > 0 && (
              <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">{booking.services.length} serviço(s) selecionado(s)</span>
                  <span className="text-white font-semibold">Duração: {totalDuration} min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total:</span>
                  <span className="text-xl font-bold" style={{ color: primaryColor }}>
                    {formatCurrency(totalPrice)}
                  </span>
                </div>
              </div>
            )}

            {/* Continue Button */}
            <Button
              onClick={handleContinueFromServices}
              disabled={booking.services.length === 0}
              className={`w-full h-12 text-lg font-semibold transition-all ${
                booking.services.length === 0 
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                  : 'text-black hover:opacity-90'
              }`}
              style={booking.services.length > 0 ? { backgroundColor: primaryColor } : {}}
              data-testid="continue-to-professional"
            >
              Continuar
            </Button>
          </div>
        )}

        {/* Step: Select Professional */}
        {step === 'professional' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl uppercase text-white" style={{ fontFamily: fontStyle }}>
              Escolha o Profissional
            </h2>
            <div className="grid gap-3">
              <button
                onClick={() => handleProfessionalSelect(null)}
                className="w-full p-4 rounded-lg border border-gray-700 hover:border-opacity-50 text-left transition-all bg-gray-800/50 hover:bg-gray-800"
                data-testid="professional-any"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                    <User className="w-6 h-6" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Sem preferência</h3>
                    <p className="text-sm text-gray-400">Qualquer profissional disponível</p>
                  </div>
                </div>
              </button>
              {data.professionals.map((prof) => (
                <button
                  key={prof.professional_id}
                  onClick={() => handleProfessionalSelect(prof)}
                  className="w-full p-4 rounded-lg border border-gray-700 hover:border-opacity-50 text-left transition-all bg-gray-800/50 hover:bg-gray-800"
                  data-testid={`professional-${prof.professional_id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                      <User className="w-6 h-6" style={{ color: primaryColor }} />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{prof.name}</h3>
                      {prof.specialty && (
                        <p className="text-sm text-gray-400">{prof.specialty}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Select Date & Time */}
        {step === 'datetime' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl uppercase text-white" style={{ fontFamily: fontStyle }}>
              Data e Horário
            </h2>
            
            <Card className="border-gray-700 bg-gray-800/50">
              <CardContent className="py-4">
                <Calendar
                  mode="single"
                  selected={booking.date}
                  onSelect={handleDateSelect}
                  disabled={(date) => isBefore(date, startOfToday())}
                  locale={ptBR}
                  className="rounded-md"
                />
              </CardContent>
            </Card>

            {booking.date && (
              <div className="space-y-3">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" style={{ color: primaryColor }} />
                  Horários disponíveis para {format(booking.date, "dd 'de' MMMM", { locale: ptBR })}
                </h3>
                
                {loadingSlots ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="skeleton h-10 rounded" />
                    ))}
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">
                    Nenhum horário disponível nesta data
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availableSlots.map((slot) => {
                      const isSelected = booking.time === slot.time;
                      return (
                        <button
                          key={slot.time}
                          onClick={() => handleTimeSelect(slot.time)}
                          className={`py-2.5 px-3 rounded-lg font-medium transition-all text-sm ${
                            isSelected 
                              ? 'text-black shadow-lg transform scale-105' 
                              : 'bg-zinc-800 text-white border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-700'
                          }`}
                          style={isSelected ? { backgroundColor: primaryColor } : {}}
                          data-testid={`time-${slot.time}`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Client Info */}
        {step === 'info' && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="text-2xl uppercase text-white" style={{ fontFamily: fontStyle }}>
              Seus Dados
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="clientPhone" className="text-white font-medium">WhatsApp * (com DDD)</Label>
                <PhoneInput
                  id="clientPhone"
                  placeholder="(64) 99999-9999"
                  value={booking.clientPhone}
                  onChange={handlePhoneChange}
                  onNormalized={handlePhoneNormalized}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white h-12 focus:border-amber-500 focus:ring-amber-500"
                  data-testid="client-phone-input"
                />
                {checkingVip && (
                  <p className="text-xs text-gray-400 animate-pulse">Verificando...</p>
                )}
                {vipInfo.is_vip && (
                  <div className="flex items-center gap-2 text-yellow-500 text-sm bg-yellow-500/10 p-2 rounded-lg">
                    <Star className="w-4 h-4" fill="currentColor" />
                    <span>Cliente VIP! Você tem {vipInfo.discount_percentage}% de desconto.</span>
                  </div>
                )}
              </div>

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
              </div>

              {/* Summary */}
              <Card className="border-gray-700 bg-gray-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-white">Resumo do Agendamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Serviço(s)</span>
                    <span className="text-white text-right max-w-[60%]">
                      {booking.services.map(s => s.name).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duração total</span>
                    <span className="text-white">{totalDuration} min</span>
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
                  
                  {vipInfo.is_vip && vipInfo.discount_percentage > 0 ? (
                    <div className="pt-2 border-t border-gray-700">
                      <div className="flex justify-between text-gray-400">
                        <span>Valor original</span>
                        <span className="line-through">{formatCurrency(totalPrice)}</span>
                      </div>
                      <div className="flex justify-between text-yellow-500">
                        <span>🌟 Desconto VIP ({vipInfo.discount_percentage}%)</span>
                        <span>-{formatCurrency(totalPrice * vipInfo.discount_percentage / 100)}</span>
                      </div>
                      <div className="flex justify-between font-medium mt-1">
                        <span className="text-white">Total</span>
                        <span style={{ color: primaryColor }}>{formatCurrency(calculateFinalPrice())}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between pt-2 border-t border-gray-700 font-medium">
                      <span className="text-white">Total</span>
                      <span style={{ color: primaryColor }}>{formatCurrency(totalPrice)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                type="submit"
                className="w-full btn-press text-lg h-12 text-black"
                style={{ backgroundColor: primaryColor }}
                disabled={submitting}
                data-testid="confirm-booking-button"
              >
                {submitting ? 'Agendando...' : 'Confirmar Agendamento'}
              </Button>
            </form>
          </div>
        )}
      </main>

      {/* Fixed WhatsApp Button */}
      {data.barbershop.whatsapp_number && (
        <a
          href={`https://wa.me/${data.barbershop.whatsapp_number.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 p-4 rounded-full shadow-lg z-40 text-black"
          style={{ backgroundColor: primaryColor }}
          data-testid="whatsapp-float-button"
        >
          <MessageCircle className="w-6 h-6" />
        </a>
      )}
    </div>
  );
}
