"""
BarberHub E2E API Tests
Tests for: Plans, Premium features, VIP clients, Appointments, Reports
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Demo Premium Account Credentials
DEMO_EMAIL = "demo@barberhubpro.com.br"
DEMO_PASSWORD = "Demo@2024"
DEMO_BARBERSHOP_SLUG = "demo-premium"
VIP_TEST_PHONE = "+5511966666666"


class TestHealthAndPlans:
    """Basic API health and plans tests"""
    
    def test_api_health(self):
        """Test API is running"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✓ API health check passed")
    
    def test_plans_endpoint(self):
        """Test plans endpoint returns both plans"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        plans = response.json()
        assert len(plans) == 2
        
        # Check Comum plan
        comum = next((p for p in plans if p["plan_id"] == "comum"), None)
        assert comum is not None
        assert comum["price"] == 49.90
        assert "Agendamentos online ilimitados" in comum["features"]
        
        # Check Premium plan
        premium = next((p for p in plans if p["plan_id"] == "premium"), None)
        assert premium is not None
        assert premium["price"] == 99.90
        assert "Criação de clientes VIP com desconto" in premium["features"]
        print("✓ Plans endpoint returns correct data")
    
    def test_scheduler_status(self):
        """Test scheduler status endpoint"""
        response = requests.get(f"{BASE_URL}/api/tasks/scheduler-status")
        assert response.status_code == 200
        data = response.json()
        assert "running" in data
        assert "respondio_configured" in data
        assert "mercadopago_configured" in data
        print(f"✓ Scheduler status: running={data['running']}, respondio={data['respondio_configured']}, mercadopago={data['mercadopago_configured']}")


class TestDemoPremiumAccount:
    """Tests for demo premium account"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for demo premium account"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["needs_payment"] == False
        return data["token"]
    
    def test_demo_login(self, auth_token):
        """Test demo premium account login"""
        assert auth_token is not None
        print("✓ Demo premium account login successful")
    
    def test_demo_barbershop_is_premium(self, auth_token):
        """Test demo barbershop has premium plan"""
        response = requests.get(
            f"{BASE_URL}/api/barbershops/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        barbershop = response.json()
        assert barbershop["plan"] == "premium"
        assert barbershop["plan_status"] == "active"
        assert barbershop["slug"] == DEMO_BARBERSHOP_SLUG
        print("✓ Demo barbershop is premium with active status")
    
    def test_public_barbershop_endpoint(self):
        """Test public barbershop endpoint"""
        response = requests.get(f"{BASE_URL}/api/barbershops/public/{DEMO_BARBERSHOP_SLUG}")
        assert response.status_code == 200
        data = response.json()
        
        assert "barbershop" in data
        assert "services" in data
        assert "professionals" in data
        assert "business_hours" in data
        
        assert data["barbershop"]["plan"] == "premium"
        assert len(data["services"]) >= 5  # Demo has 5 services
        assert len(data["professionals"]) >= 2  # Demo has 2 professionals
        print(f"✓ Public barbershop endpoint: {len(data['services'])} services, {len(data['professionals'])} professionals")


class TestPremiumFeatures:
    """Tests for premium-only features"""
    
    @pytest.fixture
    def premium_token(self):
        """Get auth token for premium account"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture
    def comum_token(self):
        """Create and get token for comum plan user"""
        # Register new user
        timestamp = int(datetime.now().timestamp())
        email = f"test_comum_{timestamp}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "Test@123",
            "name": "Test Comum User",
            "role": "barber"
        })
        assert response.status_code == 200
        token = response.json()["token"]
        
        # Create barbershop
        response = requests.post(
            f"{BASE_URL}/api/barbershops",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": f"Test Comum Barbershop {timestamp}"}
        )
        assert response.status_code == 200
        
        # Activate with comum plan
        response = requests.post(
            f"{BASE_URL}/api/barbershops/activate?plan_id=comum",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        return token
    
    def test_premium_can_access_vip_clients(self, premium_token):
        """Test premium account can access VIP clients"""
        response = requests.get(
            f"{BASE_URL}/api/vip-clients",
            headers={"Authorization": f"Bearer {premium_token}"}
        )
        assert response.status_code == 200
        vip_clients = response.json()
        assert isinstance(vip_clients, list)
        print(f"✓ Premium can access VIP clients: {len(vip_clients)} clients")
    
    def test_comum_cannot_access_vip_clients(self, comum_token):
        """Test comum plan cannot access VIP clients"""
        response = requests.get(
            f"{BASE_URL}/api/vip-clients",
            headers={"Authorization": f"Bearer {comum_token}"}
        )
        assert response.status_code == 403
        assert "Premium" in response.json()["detail"]
        print("✓ Comum plan correctly blocked from VIP clients")
    
    def test_premium_can_access_weekly_reports(self, premium_token):
        """Test premium account can access weekly reports"""
        response = requests.get(
            f"{BASE_URL}/api/reports/weekly",
            headers={"Authorization": f"Bearer {premium_token}"}
        )
        assert response.status_code == 200
        report = response.json()
        assert "total_revenue" in report
        assert "daily_breakdown" in report
        print("✓ Premium can access weekly reports")
    
    def test_comum_cannot_access_weekly_reports(self, comum_token):
        """Test comum plan cannot access weekly reports"""
        response = requests.get(
            f"{BASE_URL}/api/reports/weekly",
            headers={"Authorization": f"Bearer {comum_token}"}
        )
        assert response.status_code == 403
        assert "Premium" in response.json()["detail"]
        print("✓ Comum plan correctly blocked from weekly reports")
    
    def test_comum_cannot_create_vip_client(self, comum_token):
        """Test comum plan cannot create VIP clients"""
        response = requests.post(
            f"{BASE_URL}/api/vip-clients",
            headers={"Authorization": f"Bearer {comum_token}"},
            json={
                "client_name": "Test VIP",
                "client_phone": "+5511999999999",
                "discount_percentage": 10
            }
        )
        assert response.status_code == 403
        assert "Premium" in response.json()["detail"]
        print("✓ Comum plan correctly blocked from creating VIP clients")


class TestVIPDiscount:
    """Tests for VIP discount functionality"""
    
    def test_vip_check_endpoint(self):
        """Test VIP check public endpoint"""
        # Get barbershop ID first
        response = requests.get(f"{BASE_URL}/api/barbershops/public/{DEMO_BARBERSHOP_SLUG}")
        barbershop_id = response.json()["barbershop"]["barbershop_id"]
        
        # Check VIP status for test phone
        phone = VIP_TEST_PHONE.replace("+", "")
        response = requests.get(f"{BASE_URL}/api/vip-clients/check/{phone}?barbershop_id={barbershop_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_vip"] == True
        assert data["discount_percentage"] == 15.0
        assert data["client_name"] == "Cliente VIP Teste"
        print(f"✓ VIP check: is_vip={data['is_vip']}, discount={data['discount_percentage']}%")
    
    def test_non_vip_check(self):
        """Test VIP check for non-VIP phone"""
        response = requests.get(f"{BASE_URL}/api/barbershops/public/{DEMO_BARBERSHOP_SLUG}")
        barbershop_id = response.json()["barbershop"]["barbershop_id"]
        
        # Check non-VIP phone
        response = requests.get(f"{BASE_URL}/api/vip-clients/check/5511999999999?barbershop_id={barbershop_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_vip"] == False
        print("✓ Non-VIP check returns is_vip=False")


class TestAppointments:
    """Tests for appointment functionality"""
    
    def test_availability_endpoint(self):
        """Test availability endpoint"""
        # Get barbershop and service info
        response = requests.get(f"{BASE_URL}/api/barbershops/public/{DEMO_BARBERSHOP_SLUG}")
        data = response.json()
        barbershop_id = data["barbershop"]["barbershop_id"]
        service_id = data["services"][0]["service_id"]
        
        # Get tomorrow's date
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/appointments/availability/{barbershop_id}",
            params={"date": tomorrow, "service_id": service_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert "available_slots" in data
        print(f"✓ Availability endpoint: {len(data['available_slots'])} slots available")


class TestRegistrationFlow:
    """Tests for registration and payment flow"""
    
    def test_registration_returns_needs_payment(self):
        """Test new barber registration returns needs_payment=True"""
        timestamp = int(datetime.now().timestamp())
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_reg_{timestamp}@test.com",
            "password": "Test@123",
            "name": "Test Registration",
            "role": "barber"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["needs_payment"] == True
        assert data["barbershop"] is None
        print("✓ Registration returns needs_payment=True for new barbers")


class TestDailyReports:
    """Tests for daily reports (available for all plans)"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["token"]
    
    def test_daily_report(self, auth_token):
        """Test daily report endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/reports/daily",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        report = response.json()
        assert "date" in report
        assert "total_appointments" in report
        assert "completed" in report
        assert "pending" in report
        assert "cancelled" in report
        assert "revenue" in report
        print(f"✓ Daily report: {report['total_appointments']} appointments, R${report['revenue']} revenue")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
