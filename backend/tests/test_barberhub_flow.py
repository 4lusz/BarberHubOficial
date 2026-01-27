"""
BarberHub Backend API Tests - Payment Flow
Tests the new registration flow: Register -> Select Plan -> Payment -> Activate Barbershop
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndPlans:
    """Health check and plans API tests"""
    
    def test_api_health(self):
        """Test API is running"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✓ API health check passed")
    
    def test_get_plans(self):
        """Test /api/plans returns both plans"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        plans = response.json()
        assert len(plans) == 2
        
        # Verify plan IDs
        plan_ids = [p["plan_id"] for p in plans]
        assert "comum" in plan_ids
        assert "premium" in plan_ids
        
        # Verify prices
        comum = next(p for p in plans if p["plan_id"] == "comum")
        premium = next(p for p in plans if p["plan_id"] == "premium")
        assert comum["price"] == 49.90
        assert premium["price"] == 99.90
        print("✓ Plans API returns both plans with correct prices")


class TestRegistrationFlow:
    """Test the new registration flow with payment requirement"""
    
    @pytest.fixture
    def unique_email(self):
        """Generate unique email for testing"""
        return f"TEST_barber_{uuid.uuid4().hex[:8]}@test.com"
    
    def test_register_barber_returns_needs_payment(self, unique_email):
        """Test that registering a barber returns needs_payment: true"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Test Barber",
            "role": "barber"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "token" in data
        assert "user" in data
        assert "needs_payment" in data
        
        # Key assertion: needs_payment should be True for new barbers
        assert data["needs_payment"] == True
        
        # User should NOT have barbershop_id yet
        assert data["user"]["barbershop_id"] is None
        assert data["user"]["role"] == "barber"
        
        print(f"✓ Registration returns needs_payment=True for new barber: {unique_email}")
        return data["token"]
    
    def test_login_barber_without_barbershop_returns_needs_payment(self, unique_email):
        """Test that login for barber without barbershop returns needs_payment: true"""
        # First register
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Test Barber Login",
            "role": "barber"
        })
        assert reg_response.status_code == 200
        
        # Then login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "test123456"
        })
        assert login_response.status_code == 200
        data = login_response.json()
        
        assert data["needs_payment"] == True
        assert data["user"]["barbershop_id"] is None
        print("✓ Login returns needs_payment=True for barber without barbershop")


class TestBarbershopCreationFlow:
    """Test barbershop creation and activation flow"""
    
    @pytest.fixture
    def authenticated_barber(self):
        """Create and authenticate a new barber"""
        email = f"TEST_barber_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "test123456",
            "name": "Test Barber Flow",
            "role": "barber"
        })
        assert response.status_code == 200
        data = response.json()
        return {
            "token": data["token"],
            "user": data["user"],
            "email": email
        }
    
    def test_create_barbershop(self, authenticated_barber):
        """Test creating a barbershop via /api/barbershops"""
        headers = {"Authorization": f"Bearer {authenticated_barber['token']}"}
        
        barbershop_name = f"TEST Barbearia {uuid.uuid4().hex[:6]}"
        response = requests.post(f"{BASE_URL}/api/barbershops", json={
            "name": barbershop_name,
            "address": "Rua Teste, 123",
            "phone": "(11) 99999-9999",
            "latitude": -23.5505,
            "longitude": -46.6333
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify barbershop was created
        assert data["name"] == barbershop_name
        assert data["barbershop_id"] is not None
        assert data["slug"] is not None
        assert data["plan_status"] == "pending"  # Should be pending until payment
        
        print(f"✓ Barbershop created with pending status: {barbershop_name}")
        return data
    
    def test_create_subscription_demo_mode(self, authenticated_barber):
        """Test subscription creation in demo mode"""
        headers = {"Authorization": f"Bearer {authenticated_barber['token']}"}
        
        # First create barbershop
        barbershop_name = f"TEST Barbearia Sub {uuid.uuid4().hex[:6]}"
        barb_response = requests.post(f"{BASE_URL}/api/barbershops", json={
            "name": barbershop_name,
            "address": "Rua Teste, 456",
            "phone": "(11) 88888-8888"
        }, headers=headers)
        assert barb_response.status_code == 200
        
        # Then create subscription
        sub_response = requests.post(f"{BASE_URL}/api/subscription/create", json={
            "plan_id": "comum",
            "payment_method": "pix",
            "customer_name": "Test Customer",
            "customer_email": authenticated_barber["email"],
            "customer_document": "12345678901"
        }, headers=headers)
        
        assert sub_response.status_code == 200
        data = sub_response.json()
        
        # In demo mode, should return success (may be demo_mode or renewal)
        assert data["success"] == True
        # Either demo_mode for new subscription or renewal message for existing
        assert data.get("demo_mode") == True or "renovada" in data.get("message", "")
        
        print("✓ Subscription created/renewed successfully")
        return data
    
    def test_activate_barbershop(self, authenticated_barber):
        """Test activating barbershop after payment"""
        headers = {"Authorization": f"Bearer {authenticated_barber['token']}"}
        
        # First create barbershop
        barbershop_name = f"TEST Barbearia Activate {uuid.uuid4().hex[:6]}"
        barb_response = requests.post(f"{BASE_URL}/api/barbershops", json={
            "name": barbershop_name,
            "address": "Rua Teste, 789"
        }, headers=headers)
        assert barb_response.status_code == 200
        
        # Activate barbershop
        activate_response = requests.post(
            f"{BASE_URL}/api/barbershops/activate?plan_id=comum",
            headers=headers
        )
        
        assert activate_response.status_code == 200
        data = activate_response.json()
        
        assert data["success"] == True
        assert data["barbershop"]["plan_status"] == "active"
        assert data["barbershop"]["plan"] == "comum"
        
        print("✓ Barbershop activated successfully")
        return data


class TestFullPaymentFlow:
    """Test the complete payment flow end-to-end"""
    
    def test_complete_registration_to_activation_flow(self):
        """Test complete flow: Register -> Create Barbershop -> Subscribe -> Activate"""
        email = f"TEST_fullflow_{uuid.uuid4().hex[:8]}@test.com"
        
        # Step 1: Register
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "test123456",
            "name": "Full Flow Test",
            "role": "barber"
        })
        assert reg_response.status_code == 200
        reg_data = reg_response.json()
        assert reg_data["needs_payment"] == True
        token = reg_data["token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✓ Step 1: User registered, needs_payment=True")
        
        # Step 2: Create Barbershop
        barbershop_name = f"TEST Full Flow Barber {uuid.uuid4().hex[:6]}"
        barb_response = requests.post(f"{BASE_URL}/api/barbershops", json={
            "name": barbershop_name,
            "address": "Rua Full Flow, 100",
            "phone": "(11) 77777-7777",
            "latitude": -23.5505,
            "longitude": -46.6333
        }, headers=headers)
        assert barb_response.status_code == 200
        barb_data = barb_response.json()
        assert barb_data["plan_status"] == "pending"
        print("✓ Step 2: Barbershop created with pending status")
        
        # Step 3: Create Subscription (demo mode)
        sub_response = requests.post(f"{BASE_URL}/api/subscription/create", json={
            "plan_id": "premium",
            "payment_method": "card",
            "customer_name": "Full Flow Test",
            "customer_email": email,
            "customer_document": "98765432100"
        }, headers=headers)
        assert sub_response.status_code == 200
        sub_data = sub_response.json()
        assert sub_data["success"] == True
        print("✓ Step 3: Subscription created in demo mode")
        
        # Step 4: Activate Barbershop
        activate_response = requests.post(
            f"{BASE_URL}/api/barbershops/activate?plan_id=premium",
            headers=headers
        )
        assert activate_response.status_code == 200
        activate_data = activate_response.json()
        assert activate_data["success"] == True
        assert activate_data["barbershop"]["plan_status"] == "active"
        assert activate_data["barbershop"]["plan"] == "premium"
        print("✓ Step 4: Barbershop activated with premium plan")
        
        # Step 5: Verify user can access dashboard data
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data["barbershop_id"] is not None
        print("✓ Step 5: User now has barbershop_id")
        
        # Step 6: Verify barbershop is accessible
        my_barb_response = requests.get(f"{BASE_URL}/api/barbershops/me", headers=headers)
        assert my_barb_response.status_code == 200
        my_barb_data = my_barb_response.json()
        assert my_barb_data["plan_status"] == "active"
        print("✓ Step 6: Barbershop accessible via /barbershops/me")
        
        print("\n✓✓✓ COMPLETE FLOW PASSED ✓✓✓")


class TestLoginRedirectLogic:
    """Test login redirect logic for users with/without barbershop"""
    
    def test_login_with_active_barbershop(self):
        """Test that login with active barbershop returns needs_payment=False"""
        email = f"TEST_active_{uuid.uuid4().hex[:8]}@test.com"
        
        # Register and setup
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "test123456",
            "name": "Active Barber Test",
            "role": "barber"
        })
        token = reg_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create and activate barbershop
        requests.post(f"{BASE_URL}/api/barbershops", json={
            "name": f"TEST Active Barber {uuid.uuid4().hex[:6]}"
        }, headers=headers)
        requests.post(f"{BASE_URL}/api/barbershops/activate?plan_id=comum", headers=headers)
        
        # Now login again
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "test123456"
        })
        assert login_response.status_code == 200
        data = login_response.json()
        
        # Should NOT need payment anymore
        assert data["needs_payment"] == False
        assert data["user"]["barbershop_id"] is not None
        print("✓ Login with active barbershop returns needs_payment=False")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_info(self):
        """Info about test data cleanup"""
        print("\n⚠️ Note: Test data prefixed with 'TEST_' was created during testing")
        print("These can be cleaned up manually from the database if needed")
        assert True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
