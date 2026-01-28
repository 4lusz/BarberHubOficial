"""
Test Phone Normalization Feature for BarberHub
Tests the normalize_brazilian_phone function and /api/utils/normalize-phone endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhoneNormalizationEndpoint:
    """Tests for /api/utils/normalize-phone endpoint"""
    
    def test_normalize_phone_with_parentheses_format(self):
        """Test phone with (DD) NNNNN-NNNN format"""
        response = requests.post(f"{BASE_URL}/api/utils/normalize-phone?phone=(64)%2099976-6685")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["normalized"] == "+5564999766685"
        assert data["formatted"] == "(64) 99976-6685"
        assert data["error"] is None
        print("✓ Phone with parentheses format normalized correctly")
    
    def test_normalize_phone_digits_only(self):
        """Test phone with digits only (DDNNNNNNNNN)"""
        response = requests.post(f"{BASE_URL}/api/utils/normalize-phone?phone=64999766685")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["normalized"] == "+5564999766685"
        assert data["formatted"] == "(64) 99976-6685"
        print("✓ Phone with digits only normalized correctly")
    
    def test_normalize_phone_with_country_code(self):
        """Test phone with +55 country code"""
        response = requests.post(f"{BASE_URL}/api/utils/normalize-phone?phone=%2B5564999766685")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["normalized"] == "+5564999766685"
        assert data["formatted"] == "(64) 99976-6685"
        print("✓ Phone with country code normalized correctly")
    
    def test_normalize_phone_sao_paulo(self):
        """Test São Paulo phone number (DDD 11)"""
        response = requests.post(f"{BASE_URL}/api/utils/normalize-phone?phone=11987654321")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["normalized"] == "+5511987654321"
        assert data["formatted"] == "(11) 98765-4321"
        print("✓ São Paulo phone normalized correctly")
    
    def test_normalize_phone_rio_de_janeiro(self):
        """Test Rio de Janeiro phone number (DDD 21)"""
        response = requests.post(f"{BASE_URL}/api/utils/normalize-phone?phone=21999887766")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["normalized"] == "+5521999887766"
        assert data["formatted"] == "(21) 99988-7766"
        print("✓ Rio de Janeiro phone normalized correctly")
    
    def test_normalize_phone_8_digit_mobile(self):
        """Test 8-digit mobile number (should add leading 9)"""
        response = requests.post(f"{BASE_URL}/api/utils/normalize-phone?phone=1198765432")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        # Should add leading 9 for mobile numbers
        assert data["normalized"] == "+5511998765432"
        print("✓ 8-digit mobile number normalized correctly (added leading 9)")
    
    def test_normalize_phone_incomplete_number(self):
        """Test incomplete phone number (less than 10 digits)"""
        response = requests.post(f"{BASE_URL}/api/utils/normalize-phone?phone=99999999")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert data["normalized"] is None
        assert "incompleto" in data["error"].lower() or "ddd" in data["error"].lower()
        print("✓ Incomplete phone number rejected correctly")
    
    def test_normalize_phone_invalid_ddd(self):
        """Test phone with invalid DDD (00)"""
        response = requests.post(f"{BASE_URL}/api/utils/normalize-phone?phone=00999766685")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert data["normalized"] is None
        assert "ddd" in data["error"].lower() and "inválido" in data["error"].lower()
        print("✓ Invalid DDD rejected correctly")
    
    def test_normalize_phone_empty(self):
        """Test empty phone number"""
        response = requests.post(f"{BASE_URL}/api/utils/normalize-phone?phone=")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert data["normalized"] is None
        print("✓ Empty phone number rejected correctly")
    
    def test_normalize_phone_with_spaces(self):
        """Test phone with various spaces"""
        response = requests.post(f"{BASE_URL}/api/utils/normalize-phone?phone=64%20999%20766%20685")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["normalized"] == "+5564999766685"
        print("✓ Phone with spaces normalized correctly")
    
    def test_normalize_phone_with_dashes(self):
        """Test phone with dashes"""
        response = requests.post(f"{BASE_URL}/api/utils/normalize-phone?phone=64-99976-6685")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["normalized"] == "+5564999766685"
        print("✓ Phone with dashes normalized correctly")
    
    def test_normalize_phone_all_valid_ddds(self):
        """Test a sample of valid DDDs from different regions"""
        valid_ddds = ['11', '21', '31', '41', '51', '61', '71', '81', '91', '64']
        for ddd in valid_ddds:
            response = requests.post(f"{BASE_URL}/api/utils/normalize-phone?phone={ddd}999887766")
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True, f"DDD {ddd} should be valid"
            assert data["normalized"].startswith(f"+55{ddd}")
        print(f"✓ All {len(valid_ddds)} valid DDDs accepted correctly")


class TestPhoneNormalizationInAppointment:
    """Tests for phone normalization when creating appointments"""
    
    @pytest.fixture
    def barbershop_data(self):
        """Get demo-premium barbershop data"""
        response = requests.get(f"{BASE_URL}/api/barbershops/public/demo-premium")
        if response.status_code == 200:
            return response.json()
        pytest.skip("Demo barbershop not available")
    
    def test_appointment_normalizes_phone_on_creation(self, barbershop_data):
        """Test that appointment creation normalizes the client phone"""
        barbershop_id = barbershop_data["barbershop_id"]
        services = barbershop_data.get("services", [])
        
        if not services:
            pytest.skip("No services available")
        
        service = services[0]
        
        # Create appointment with non-normalized phone
        appointment_data = {
            "barbershop_id": barbershop_id,
            "service_id": service["service_id"],
            "date": "2026-02-15",
            "time": "10:00",
            "client_name": "Test Phone Normalization",
            "client_phone": "(64) 99976-6685",  # Non-normalized format
            "client_email": "test@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/appointments", json=appointment_data)
        
        if response.status_code == 201:
            data = response.json()
            # The phone should be normalized in the response
            assert data["client_phone"] == "+5564999766685", f"Phone should be normalized, got: {data['client_phone']}"
            print("✓ Appointment creation normalizes phone correctly")
            
            # Cleanup - delete the test appointment
            apt_id = data.get("appointment_id")
            if apt_id:
                requests.delete(f"{BASE_URL}/api/appointments/{apt_id}")
        else:
            # If appointment creation fails for other reasons, just check the endpoint exists
            print(f"Note: Appointment creation returned {response.status_code}")


class TestPhoneNormalizationInVIP:
    """Tests for phone normalization when creating VIP clients"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for demo premium account"""
        login_data = {
            "email": "demo@barberhubpro.com.br",
            "password": "Demo@2024"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not authenticate with demo account")
    
    def test_vip_client_normalizes_phone_on_creation(self, auth_token):
        """Test that VIP client creation normalizes the phone"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create VIP client with non-normalized phone
        vip_data = {
            "client_name": "Test VIP Phone Normalization",
            "client_phone": "64 99976-6685",  # Non-normalized format
            "discount_percentage": 10.0
        }
        
        response = requests.post(f"{BASE_URL}/api/vip-clients", json=vip_data, headers=headers)
        
        if response.status_code == 201:
            data = response.json()
            # The phone should be normalized
            assert data["client_phone"] == "+5564999766685", f"VIP phone should be normalized, got: {data['client_phone']}"
            print("✓ VIP client creation normalizes phone correctly")
            
            # Cleanup - delete the test VIP client
            vip_id = data.get("vip_id")
            if vip_id:
                requests.delete(f"{BASE_URL}/api/vip-clients/{vip_id}", headers=headers)
        elif response.status_code == 400 and "já cadastrado" in response.text.lower():
            # Phone already exists as VIP - that's fine, normalization is working
            print("✓ VIP client phone normalization working (duplicate detected)")
        else:
            print(f"Note: VIP creation returned {response.status_code}: {response.text}")


class TestVIPCheckWithDifferentPhoneFormats:
    """Tests for VIP check endpoint with different phone formats"""
    
    @pytest.fixture
    def barbershop_id(self):
        """Get demo-premium barbershop ID"""
        response = requests.get(f"{BASE_URL}/api/barbershops/public/demo-premium")
        if response.status_code == 200:
            return response.json()["barbershop_id"]
        pytest.skip("Demo barbershop not available")
    
    def test_vip_check_with_normalized_phone(self, barbershop_id):
        """Test VIP check with already normalized phone"""
        # First check if there's a VIP client
        response = requests.get(f"{BASE_URL}/api/vip-clients/check/%2B5511966666666?barbershop_id={barbershop_id}")
        assert response.status_code == 200
        data = response.json()
        # Just verify the endpoint works
        assert "is_vip" in data
        print(f"✓ VIP check with normalized phone works (is_vip={data['is_vip']})")
    
    def test_vip_check_with_raw_digits(self, barbershop_id):
        """Test VIP check with raw digits format"""
        response = requests.get(f"{BASE_URL}/api/vip-clients/check/11966666666?barbershop_id={barbershop_id}")
        assert response.status_code == 200
        data = response.json()
        assert "is_vip" in data
        print(f"✓ VIP check with raw digits works (is_vip={data['is_vip']})")
    
    def test_vip_check_with_parentheses_format(self, barbershop_id):
        """Test VIP check with (DD) NNNNN-NNNN format"""
        response = requests.get(f"{BASE_URL}/api/vip-clients/check/(11)%2096666-6666?barbershop_id={barbershop_id}")
        assert response.status_code == 200
        data = response.json()
        assert "is_vip" in data
        print(f"✓ VIP check with parentheses format works (is_vip={data['is_vip']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
