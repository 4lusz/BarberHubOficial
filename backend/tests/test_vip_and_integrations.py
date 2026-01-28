"""
Test VIP discount, Respond.io integration, and Mercado Pago configuration
Tests for iteration 4 - BarberHub SaaS
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "BarberHub" in data["message"]
        print("✓ API root endpoint working")


class TestPlansAPI:
    """Test subscription plans endpoint"""
    
    def test_get_plans(self):
        """Test /api/plans returns available plans"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        plans = response.json()
        
        # Should return 2 plans
        assert len(plans) == 2
        
        # Check comum plan
        comum = next((p for p in plans if p["plan_id"] == "comum"), None)
        assert comum is not None
        assert comum["name"] == "Plano Comum"
        assert comum["price"] == 49.90
        assert len(comum["features"]) > 0
        
        # Check premium plan
        premium = next((p for p in plans if p["plan_id"] == "premium"), None)
        assert premium is not None
        assert premium["name"] == "Plano Premium"
        assert premium["price"] == 99.90
        assert len(premium["features"]) > 0
        
        print("✓ Plans API returns both plans with correct prices")


class TestSchedulerStatus:
    """Test scheduler status endpoint for integration configuration"""
    
    def test_scheduler_status(self):
        """Test /api/tasks/scheduler-status shows correct configuration"""
        response = requests.get(f"{BASE_URL}/api/tasks/scheduler-status")
        assert response.status_code == 200
        data = response.json()
        
        # Check scheduler is running
        assert data["running"] == True
        
        # Check Respond.io is configured
        assert data["respondio_configured"] == True, "Respond.io should be configured"
        
        # Check Mercado Pago is configured
        assert data["mercadopago_configured"] == True, "Mercado Pago should be configured"
        
        # Check jobs are scheduled
        assert len(data["jobs"]) >= 2
        job_ids = [j["id"] for j in data["jobs"]]
        assert "check_reminders" in job_ids, "Reminder job should be scheduled"
        assert "check_subscriptions" in job_ids, "Subscription check job should be scheduled"
        
        print("✓ Scheduler status shows respondio_configured=true and mercadopago_configured=true")


class TestVIPClientCheck:
    """Test VIP client check endpoint (public)"""
    
    def test_vip_check_non_vip(self):
        """Test /api/vip-clients/check/{phone} for non-VIP client"""
        response = requests.get(
            f"{BASE_URL}/api/vip-clients/check/11999999999",
            params={"barbershop_id": "nonexistent_barbershop"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Non-VIP should return is_vip=false
        assert data["is_vip"] == False
        assert data["discount_percentage"] == 0
        
        print("✓ VIP check returns is_vip=false for non-VIP client")
    
    def test_vip_check_endpoint_exists(self):
        """Test VIP check endpoint is accessible"""
        # Test with various phone formats
        test_phones = ["11999999999", "(11)99999-9999", "5511999999999"]
        
        for phone in test_phones:
            response = requests.get(
                f"{BASE_URL}/api/vip-clients/check/{phone}",
                params={"barbershop_id": "test_barbershop"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "is_vip" in data
            assert "discount_percentage" in data
        
        print("✓ VIP check endpoint accessible with various phone formats")


class TestRegistrationFlow:
    """Test registration flow redirects to plan selection"""
    
    def test_register_returns_needs_payment(self):
        """Test registration returns needs_payment=true for new barbers"""
        unique_email = f"test_vip_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": unique_email,
                "password": "testpass123",
                "name": "Test VIP User",
                "role": "barber"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return needs_payment=true for new barber
        assert data["needs_payment"] == True
        assert data["barbershop"] is None
        assert "token" in data
        assert data["user"]["email"] == unique_email
        
        print("✓ Registration returns needs_payment=true for new barbers")
        return data["token"]


class TestVIPDiscountInAppointment:
    """Test VIP discount is applied in appointment creation"""
    
    @pytest.fixture
    def setup_barbershop_with_vip(self):
        """Create a barbershop with premium plan and VIP client"""
        # Register a new barber
        unique_id = uuid.uuid4().hex[:8]
        email = f"test_vip_barber_{unique_id}@test.com"
        
        # Register
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": email,
                "password": "testpass123",
                "name": "Test VIP Barber",
                "role": "barber"
            }
        )
        assert reg_response.status_code == 200
        token = reg_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create barbershop
        barb_response = requests.post(
            f"{BASE_URL}/api/barbershops",
            json={
                "name": f"Test VIP Barbershop {unique_id}",
                "address": "Test Address",
                "phone": "11999999999"
            },
            headers=headers
        )
        assert barb_response.status_code == 200
        barbershop = barb_response.json()
        barbershop_id = barbershop["barbershop_id"]
        slug = barbershop["slug"]
        
        # Activate with premium plan
        activate_response = requests.post(
            f"{BASE_URL}/api/barbershops/activate",
            params={"plan_id": "premium"},
            headers=headers
        )
        assert activate_response.status_code == 200
        
        # Create a service
        service_response = requests.post(
            f"{BASE_URL}/api/services",
            json={
                "name": "Corte de Cabelo",
                "duration": 30,
                "price": 50.00
            },
            headers=headers
        )
        assert service_response.status_code == 200
        service = service_response.json()
        
        # Create VIP client - use a consistent phone format
        vip_phone = "11987654321"
        vip_response = requests.post(
            f"{BASE_URL}/api/vip-clients",
            json={
                "client_name": "VIP Test Client",
                "client_phone": vip_phone,
                "discount_percentage": 15.0,
                "notes": "Test VIP"
            },
            headers=headers
        )
        assert vip_response.status_code == 200
        
        return {
            "barbershop_id": barbershop_id,
            "slug": slug,
            "service_id": service["service_id"],
            "vip_phone": vip_phone,
            "token": token,
            "headers": headers
        }
    
    def test_vip_check_for_created_vip(self, setup_barbershop_with_vip):
        """Test VIP check returns correct data for created VIP client"""
        data = setup_barbershop_with_vip
        
        response = requests.get(
            f"{BASE_URL}/api/vip-clients/check/{data['vip_phone']}",
            params={"barbershop_id": data["barbershop_id"]}
        )
        assert response.status_code == 200
        result = response.json()
        
        assert result["is_vip"] == True
        assert result["discount_percentage"] == 15.0
        assert result["client_name"] == "VIP Test Client"
        
        print("✓ VIP check returns correct data for VIP client")
    
    def test_appointment_with_vip_discount(self, setup_barbershop_with_vip):
        """Test appointment creation applies VIP discount"""
        data = setup_barbershop_with_vip
        
        # Get availability for tomorrow
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        avail_response = requests.get(
            f"{BASE_URL}/api/appointments/availability/{data['barbershop_id']}",
            params={
                "date": tomorrow,
                "service_id": data["service_id"]
            }
        )
        assert avail_response.status_code == 200
        slots = avail_response.json().get("available_slots", [])
        
        if not slots:
            pytest.skip("No available slots for testing")
        
        # Create appointment with VIP phone
        apt_response = requests.post(
            f"{BASE_URL}/api/appointments",
            json={
                "barbershop_id": data["barbershop_id"],
                "service_id": data["service_id"],
                "date": tomorrow,
                "time": slots[0]["time"],
                "client_name": "VIP Test Client",
                "client_phone": data["vip_phone"],
                "client_email": "vip@test.com"
            }
        )
        assert apt_response.status_code == 200
        appointment = apt_response.json()
        
        # Verify VIP discount was applied
        assert appointment["is_vip"] == True
        assert appointment["original_price"] == 50.00
        assert appointment["discount_percentage"] == 15.0
        assert appointment["final_price"] == 42.50  # 50 * (1 - 0.15)
        
        print("✓ Appointment creation applies VIP discount correctly")
        print(f"  Original: R${appointment['original_price']:.2f}")
        print(f"  Discount: {appointment['discount_percentage']}%")
        print(f"  Final: R${appointment['final_price']:.2f}")
    
    def test_appointment_without_vip(self, setup_barbershop_with_vip):
        """Test appointment creation without VIP discount"""
        data = setup_barbershop_with_vip
        
        # Get availability for tomorrow
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        avail_response = requests.get(
            f"{BASE_URL}/api/appointments/availability/{data['barbershop_id']}",
            params={
                "date": tomorrow,
                "service_id": data["service_id"]
            }
        )
        assert avail_response.status_code == 200
        slots = avail_response.json().get("available_slots", [])
        
        if len(slots) < 2:
            pytest.skip("Not enough available slots for testing")
        
        # Create appointment with non-VIP phone
        apt_response = requests.post(
            f"{BASE_URL}/api/appointments",
            json={
                "barbershop_id": data["barbershop_id"],
                "service_id": data["service_id"],
                "date": tomorrow,
                "time": slots[1]["time"],
                "client_name": "Regular Client",
                "client_phone": "11888888888",
                "client_email": "regular@test.com"
            }
        )
        assert apt_response.status_code == 200
        appointment = apt_response.json()
        
        # Verify no VIP discount
        assert appointment["is_vip"] == False
        assert appointment["original_price"] == 50.00
        assert appointment["discount_percentage"] == 0
        assert appointment["final_price"] == 50.00
        
        print("✓ Appointment without VIP has no discount")


class TestPublicBookingPage:
    """Test public booking page data"""
    
    def test_public_barbershop_endpoint(self):
        """Test public barbershop endpoint returns correct data"""
        # First create a barbershop
        unique_id = uuid.uuid4().hex[:8]
        email = f"test_public_{unique_id}@test.com"
        
        # Register
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": email,
                "password": "testpass123",
                "name": "Test Public Barber",
                "role": "barber"
            }
        )
        assert reg_response.status_code == 200
        token = reg_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create barbershop
        barb_response = requests.post(
            f"{BASE_URL}/api/barbershops",
            json={
                "name": f"Public Test Shop {unique_id}",
                "address": "Test Address 123",
                "phone": "11999999999"
            },
            headers=headers
        )
        assert barb_response.status_code == 200
        barbershop = barb_response.json()
        slug = barbershop["slug"]
        
        # Activate barbershop
        activate_response = requests.post(
            f"{BASE_URL}/api/barbershops/activate",
            params={"plan_id": "comum"},
            headers=headers
        )
        assert activate_response.status_code == 200
        
        # Test public endpoint
        public_response = requests.get(f"{BASE_URL}/api/barbershops/public/{slug}")
        assert public_response.status_code == 200
        data = public_response.json()
        
        assert "barbershop" in data
        assert "services" in data
        assert "professionals" in data
        assert "business_hours" in data
        assert data["barbershop"]["slug"] == slug
        
        print("✓ Public barbershop endpoint returns correct data structure")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
