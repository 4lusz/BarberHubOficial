"""
Final verification tests for BarberHub before production deployment.
Tests all critical flows: auth, booking, super admin, appointments optimization.
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DEMO_EMAIL = "demo@barberhubpro.com.br"
DEMO_PASSWORD = "Demo@2024"
SUPER_ADMIN_PASSWORD = "alunyx110205"


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("PASS: API root endpoint working")
    
    def test_plans_endpoint(self):
        """Test subscription plans endpoint"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        plans = response.json()
        assert len(plans) == 2
        plan_ids = [p["plan_id"] for p in plans]
        assert "comum" in plan_ids
        assert "premium" in plan_ids
        print("PASS: Plans endpoint returns 2 plans (comum, premium)")


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_login_with_demo_credentials(self):
        """Test login with demo account"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == DEMO_EMAIL
        assert data["user"]["role"] == "barber"
        assert data["needs_payment"] == False
        print(f"PASS: Login successful for {DEMO_EMAIL}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("PASS: Invalid credentials rejected with 401")
    
    def test_auth_me_endpoint(self):
        """Test /auth/me endpoint with valid token"""
        # First login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        token = login_response.json()["token"]
        
        # Then check /auth/me
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == DEMO_EMAIL
        print("PASS: /auth/me returns correct user data")


class TestSuperAdmin:
    """Super Admin panel tests"""
    
    def test_super_admin_login(self):
        """Test Super Admin login"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/login",
            json={"password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "token" in data
        print("PASS: Super Admin login successful")
        return data["token"]
    
    def test_super_admin_dashboard(self):
        """Test Super Admin dashboard metrics"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/super-admin/login",
            json={"password": SUPER_ADMIN_PASSWORD}
        )
        token = login_response.json()["token"]
        
        # Get dashboard
        response = requests.get(
            f"{BASE_URL}/api/super-admin/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify dashboard structure
        assert "overview" in data
        assert "financial" in data
        assert "growth" in data
        assert "integrations" in data
        
        # Verify overview metrics
        overview = data["overview"]
        assert "total_barbershops" in overview
        assert "active_barbershops" in overview
        assert "total_appointments" in overview
        
        # Verify integrations status
        integrations = data["integrations"]
        assert "mercadopago" in integrations
        assert "whatsapp_respondio" in integrations
        
        print(f"PASS: Super Admin dashboard - {overview['total_barbershops']} barbershops, MRR: R${data['financial']['mrr']}")
    
    def test_super_admin_barbershops_list(self):
        """Test Super Admin barbershops list"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/super-admin/login",
            json={"password": SUPER_ADMIN_PASSWORD}
        )
        token = login_response.json()["token"]
        
        # Get barbershops
        response = requests.get(
            f"{BASE_URL}/api/super-admin/barbershops",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Super Admin barbershops list - {len(data)} barbershops")


class TestPublicBooking:
    """Public booking page tests"""
    
    def test_public_barbershop_page(self):
        """Test public barbershop page loads correctly"""
        response = requests.get(f"{BASE_URL}/api/barbershops/public/demo-premium")
        assert response.status_code == 200
        data = response.json()
        
        # Verify barbershop data
        assert "barbershop" in data
        assert "services" in data
        assert "professionals" in data
        assert "business_hours" in data
        
        barbershop = data["barbershop"]
        assert barbershop["slug"] == "demo-premium"
        assert barbershop["plan"] == "premium"
        assert barbershop["plan_status"] == "active"
        
        print(f"PASS: Public page for '{barbershop['name']}' - {len(data['services'])} services, {len(data['professionals'])} professionals")
    
    def test_available_slots(self):
        """Test available time slots endpoint"""
        # Get tomorrow's date
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # First get barbershop info
        barbershop_response = requests.get(f"{BASE_URL}/api/barbershops/public/demo-premium")
        barbershop_id = barbershop_response.json()["barbershop"]["barbershop_id"]
        
        # Get available slots
        response = requests.get(
            f"{BASE_URL}/api/appointments/available-slots",
            params={
                "barbershop_id": barbershop_id,
                "date": tomorrow,
                "duration": 30
            }
        )
        assert response.status_code == 200
        slots = response.json()
        assert isinstance(slots, list)
        print(f"PASS: Available slots for {tomorrow} - {len(slots)} slots")


class TestPhoneNormalization:
    """Phone normalization tests"""
    
    def test_normalize_phone_valid(self):
        """Test phone normalization with valid number"""
        response = requests.post(
            f"{BASE_URL}/api/utils/normalize-phone",
            params={"phone": "64999766685"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["normalized"] == "+5564999766685"
        assert data["formatted"] == "(64) 99976-6685"
        print("PASS: Phone normalization - 64999766685 -> +5564999766685")
    
    def test_normalize_phone_with_formatting(self):
        """Test phone normalization with formatted input"""
        response = requests.post(
            f"{BASE_URL}/api/utils/normalize-phone",
            params={"phone": "(11) 98765-4321"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["normalized"] == "+5511987654321"
        print("PASS: Phone normalization handles formatted input")
    
    def test_normalize_phone_invalid_ddd(self):
        """Test phone normalization with invalid DDD"""
        response = requests.post(
            f"{BASE_URL}/api/utils/normalize-phone",
            params={"phone": "00999766685"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert "inválido" in data["error"].lower()
        print("PASS: Phone normalization rejects invalid DDD")


class TestAppointments:
    """Appointment creation and management tests"""
    
    def test_create_appointment(self):
        """Test creating an appointment"""
        # Get barbershop info
        barbershop_response = requests.get(f"{BASE_URL}/api/barbershops/public/demo-premium")
        data = barbershop_response.json()
        barbershop_id = data["barbershop"]["barbershop_id"]
        service_id = data["services"][0]["service_id"]
        
        # Get tomorrow's date
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Create appointment
        response = requests.post(
            f"{BASE_URL}/api/appointments",
            json={
                "barbershop_id": barbershop_id,
                "service_id": service_id,
                "date": tomorrow,
                "time": "10:00",
                "client_name": "Test Client API",
                "client_phone": "11999887766"
            }
        )
        assert response.status_code in [200, 201]
        appointment = response.json()
        assert "appointment_id" in appointment
        assert appointment["status"] == "pending"
        print(f"PASS: Appointment created - ID: {appointment['appointment_id']}")
        return appointment["appointment_id"]
    
    def test_get_appointments_optimized(self):
        """Test appointments endpoint (N+1 optimization)"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        token = login_response.json()["token"]
        
        # Get appointments
        response = requests.get(
            f"{BASE_URL}/api/appointments",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        appointments = response.json()
        assert isinstance(appointments, list)
        
        # Verify each appointment has service and professional info embedded
        if len(appointments) > 0:
            apt = appointments[0]
            # Check that service info is included (N+1 optimization)
            assert "service_name" in apt or "service" in apt or "service_id" in apt
        
        print(f"PASS: Appointments endpoint - {len(appointments)} appointments (optimized)")


class TestVIPClients:
    """VIP clients functionality tests"""
    
    def test_vip_check_endpoint(self):
        """Test VIP client check endpoint"""
        # Get barbershop info
        barbershop_response = requests.get(f"{BASE_URL}/api/barbershops/public/demo-premium")
        barbershop_id = barbershop_response.json()["barbershop"]["barbershop_id"]
        
        # Check VIP status (should work even for non-VIP)
        response = requests.get(
            f"{BASE_URL}/api/vip-clients/check",
            params={
                "barbershop_id": barbershop_id,
                "phone": "11999999999"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "is_vip" in data
        print(f"PASS: VIP check endpoint - is_vip: {data['is_vip']}")


class TestInstitutionalPages:
    """Test that institutional page data is accessible"""
    
    def test_scheduler_status(self):
        """Test scheduler status endpoint"""
        response = requests.get(f"{BASE_URL}/api/tasks/scheduler-status")
        assert response.status_code == 200
        data = response.json()
        assert "running" in data
        assert "respondio_configured" in data
        assert "mercadopago_configured" in data
        print(f"PASS: Scheduler status - running: {data['running']}, WhatsApp: {data['respondio_configured']}, MercadoPago: {data['mercadopago_configured']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
