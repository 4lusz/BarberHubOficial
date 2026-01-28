import { useState, useEffect } from 'react';
import { Input } from './input';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../lib/api';

/**
 * PhoneInput - Input de telefone brasileiro com normalização automática
 * 
 * Aceita qualquer formato e normaliza para +55DDNNNNNNNNN
 * Mostra preview do número formatado para confirmação
 */
export function PhoneInput({ 
  value, 
  onChange, 
  onNormalized,
  placeholder = "(64) 99999-9999",
  required = false,
  disabled = false,
  className = "",
  showPreview = true,
  ...props 
}) {
  const [inputValue, setInputValue] = useState(value || '');
  const [normalizedData, setNormalizedData] = useState(null);
  const [validating, setValidating] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);

  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || '');
    }
  }, [value]);

  const normalizePhone = async (phone) => {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setNormalizedData(null);
      return;
    }

    setValidating(true);
    try {
      const response = await api.post(`/utils/normalize-phone?phone=${encodeURIComponent(phone)}`);
      setNormalizedData(response.data);
      
      if (response.data.success && onNormalized) {
        onNormalized(response.data.normalized);
      }
    } catch (error) {
      setNormalizedData({
        success: false,
        error: 'Erro ao validar número'
      });
    } finally {
      setValidating(false);
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Notify parent of raw change
    if (onChange) {
      onChange(e);
    }

    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Debounce validation
    const timer = setTimeout(() => {
      normalizePhone(newValue);
    }, 500);
    setDebounceTimer(timer);
  };

  const handleBlur = () => {
    // Validate immediately on blur
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    normalizePhone(inputValue);
  };

  // Apply mask while typing
  const formatWhileTyping = (value) => {
    const digits = value.replace(/\D/g, '');
    
    // Remove 55 if user typed it
    let cleanDigits = digits;
    if (cleanDigits.startsWith('55') && cleanDigits.length > 11) {
      cleanDigits = cleanDigits.slice(2);
    }
    
    if (cleanDigits.length <= 2) {
      return cleanDigits;
    } else if (cleanDigits.length <= 7) {
      return `(${cleanDigits.slice(0, 2)}) ${cleanDigits.slice(2)}`;
    } else if (cleanDigits.length <= 11) {
      const ddd = cleanDigits.slice(0, 2);
      const part1 = cleanDigits.slice(2, 7);
      const part2 = cleanDigits.slice(7);
      return `(${ddd}) ${part1}${part2 ? '-' + part2 : ''}`;
    }
    
    return value;
  };

  const displayValue = formatWhileTyping(inputValue);

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          type="tel"
          value={displayValue}
          onChange={(e) => {
            // Allow only the raw input
            const rawValue = e.target.value.replace(/[^\d\s()-+]/g, '');
            handleChange({ target: { value: rawValue } });
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`${className} ${normalizedData?.success === false ? 'border-red-500' : normalizedData?.success ? 'border-green-500' : ''}`}
          {...props}
        />
        
        {/* Status indicator */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {validating && (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          )}
          {!validating && normalizedData?.success && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          {!validating && normalizedData?.success === false && (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
        </div>
      </div>

      {/* Preview/Error message */}
      {showPreview && normalizedData && (
        <div className={`text-xs ${normalizedData.success ? 'text-green-600' : 'text-red-500'}`}>
          {normalizedData.success ? (
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Número válido: {normalizedData.formatted}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {normalizedData.error}
            </span>
          )}
        </div>
      )}

      {/* Helper text */}
      {!normalizedData && inputValue.replace(/\D/g, '').length > 0 && inputValue.replace(/\D/g, '').length < 10 && (
        <p className="text-xs text-muted-foreground">
          Informe DDD + número (ex: 64 99976-6685)
        </p>
      )}
    </div>
  );
}

/**
 * Hook para normalizar telefone
 */
export function usePhoneNormalization() {
  const normalize = async (phone) => {
    try {
      const response = await api.post(`/utils/normalize-phone?phone=${encodeURIComponent(phone)}`);
      return response.data;
    } catch (error) {
      return { success: false, error: 'Erro ao validar número' };
    }
  };

  return { normalize };
}

export default PhoneInput;
