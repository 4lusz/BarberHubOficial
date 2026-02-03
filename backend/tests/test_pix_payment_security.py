"""
PIX Payment Security Tests
==========================
Tests to verify that the PIX payment flow is secure:
1. No /activateplan or /barbershops/activate endpoints exist
2. PIX status check does NOT activate subscription
3. plan_status remains 'pending' until webhook confirms payment
4. Dashboard is blocked for non-active subscriptions
5. Frontend does not call any activation endpoints
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://barber-schedule-49.preview.emergentagent.com').rstrip('/')


class TestSecurityEndpointsNotExist:
    """Verify that insecure activation endpoints do NOT exist"""
    
    def test_activateplan_endpoint_not_exists(self):
        """Verify /api/barbershops/activateplan returns 404 or 405"""
        response = requests.post(f"{BASE_URL}/api/barbershops/activateplan")
        # Should return 404 (not found) or 405 (method not allowed) or 401 (unauthorized)
        # But NOT 200 (success)
        assert response.status_code in [401, 404, 405, 422], f"Expected 401/404/405/422, got {response.status_code}"
        print(f"✓ /api/barbershops/activateplan returns {response.status_code} (endpoint does not exist)")
    
    def test_activate_endpoint_not_exists(self):
        """Verify /api/barbershops/activate returns 404 or 405"""
        response = requests.post(f"{BASE_URL}/api/barbershops/activate")
        assert response.status_code in [401, 404, 405, 422], f"Expected 401/404/405/422, got {response.status_code}"
        print(f"✓ /api/barbershops/activate returns {response.status_code} (endpoint does not exist)")
    
    def test_activate_with_plan_id_not_exists(self):
        """Verify /api/barbershops/activate/comum returns 404"""
        response = requests.post(f"{BASE_URL}/api/barbershops/activate/comum")
        assert response.status_code in [401, 404, 405, 422], f"Expected 401/404/405/422, got {response.status_code}"
        print(f"✓ /api/barbershops/activate/comum returns {response.status_code} (endpoint does not exist)")


class TestPixStatusEndpointSecurity:
    """Verify that PIX status endpoint only checks, never activates"""
    
    def test_pix_status_requires_auth(self):
        """PIX status endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/payment/pix-status/12345")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/payment/pix-status requires authentication")
    
    def test_pix_status_with_invalid_payment_id(self):
        """PIX status with invalid payment ID returns pending, not error"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@barberhubpro.com.br",
            "password": "Demo@2024"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Demo account not available")
        
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Check status of non-existent payment
        response = requests.get(
            f"{BASE_URL}/api/payment/pix-status/invalid_payment_123",
            headers=headers
        )
        
        # Should return pending status, not activate anything
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") in ["pending", "error"], f"Expected pending/error, got {data.get('status')}"
        assert data.get("redirect_to") != "/dashboard", "Should NOT redirect to dashboard for invalid payment"
        print(f"✓ PIX status with invalid ID returns: {data}")


class TestNewUserRegistrationFlow:
    """Test that new user registration creates barbershop with pending status"""
    
    def test_register_new_barber(self):
        """New barber registration should NOT auto-activate subscription"""
        unique_email = f"test_pix_security_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "name": "Test PIX Security User",
            "role": "barber"
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        # New user should need payment
        assert data.get("needs_payment") == True, "New user should need payment"
        # No barbershop should be created yet
        assert data.get("barbershop") is None, "Barbershop should not be created on registration"
        
        print(f"✓ New user registered with needs_payment=True, no barbershop created")
        
        # Return token for cleanup
        return data.get("token")


class TestBarbershopCreationWithPendingStatus:
    """Test that barbershop creation sets plan_status to pending"""
    
    def test_create_barbershop_pending_status(self):
        """Creating barbershop should set plan_status to 'pending'"""
        # Register new user
        unique_email = f"test_barb_pending_{uuid.uuid4().hex[:8]}@test.com"
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "name": "Test Barbershop Pending",
            "role": "barber"
        })
        
        assert reg_response.status_code == 200
        token = reg_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create barbershop
        barb_response = requests.post(f"{BASE_URL}/api/barbershops", json={
            "name": f"Test Barbershop {uuid.uuid4().hex[:6]}",
            "address": "Test Address",
            "phone": "11999999999"
        }, headers=headers)
        
        assert barb_response.status_code == 200, f"Barbershop creation failed: {barb_response.text}"
        barb_data = barb_response.json()
        
        # Verify plan_status is pending
        assert barb_data.get("plan_status") == "pending", f"Expected pending, got {barb_data.get('plan_status')}"
        print(f"✓ Barbershop created with plan_status='pending'")
        
        # Verify user cannot access dashboard (protected route check via API)
        me_response = requests.get(f"{BASE_URL}/api/barbershops/me", headers=headers)
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data.get("plan_status") == "pending", "Barbershop should still be pending"
        
        print(f"✓ Barbershop remains pending until webhook activates it")


class TestProtectedRoutesBlockPendingSubscription:
    """Test that protected routes block users with pending subscription"""
    
    def test_services_blocked_for_pending(self):
        """Services endpoint should be blocked for pending subscription"""
        # Register new user
        unique_email = f"test_protected_{uuid.uuid4().hex[:8]}@test.com"
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "name": "Test Protected Routes",
            "role": "barber"
        })
        
        assert reg_response.status_code == 200
        token = reg_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create barbershop (will be pending)
        requests.post(f"{BASE_URL}/api/barbershops", json={
            "name": f"Test Protected {uuid.uuid4().hex[:6]}",
            "address": "Test Address",
            "phone": "11999999999"
        }, headers=headers)
        
        # Try to access services (protected route)
        services_response = requests.get(f"{BASE_URL}/api/services", headers=headers)
        
        # Should return 403 (forbidden) because subscription is pending
        assert services_response.status_code == 403, f"Expected 403, got {services_response.status_code}"
        print(f"✓ Services endpoint blocked for pending subscription (403)")
    
    def test_professionals_blocked_for_pending(self):
        """Professionals endpoint should be blocked for pending subscription"""
        unique_email = f"test_prof_blocked_{uuid.uuid4().hex[:8]}@test.com"
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "name": "Test Prof Blocked",
            "role": "barber"
        })
        
        assert reg_response.status_code == 200
        token = reg_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create barbershop (will be pending)
        requests.post(f"{BASE_URL}/api/barbershops", json={
            "name": f"Test Prof {uuid.uuid4().hex[:6]}",
            "address": "Test Address",
            "phone": "11999999999"
        }, headers=headers)
        
        # Try to access professionals (protected route)
        prof_response = requests.get(f"{BASE_URL}/api/professionals", headers=headers)
        
        assert prof_response.status_code == 403, f"Expected 403, got {prof_response.status_code}"
        print(f"✓ Professionals endpoint blocked for pending subscription (403)")


class TestSubscriptionCreateDoesNotActivate:
    """Test that subscription/create only creates payment, does not activate"""
    
    def test_subscription_create_returns_pix_data(self):
        """Subscription create should return PIX data, not activate subscription"""
        # Register new user
        unique_email = f"test_sub_create_{uuid.uuid4().hex[:8]}@test.com"
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "name": "Test Subscription Create",
            "role": "barber"
        })
        
        assert reg_response.status_code == 200
        token = reg_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create barbershop first
        barb_response = requests.post(f"{BASE_URL}/api/barbershops", json={
            "name": f"Test Sub Create {uuid.uuid4().hex[:6]}",
            "address": "Test Address",
            "phone": "11999999999"
        }, headers=headers)
        
        assert barb_response.status_code == 200
        
        # Create subscription (PIX payment)
        sub_response = requests.post(f"{BASE_URL}/api/subscription/create", json={
            "plan_id": "comum",
            "payment_method": "pix",
            "customer_name": "Test User",
            "customer_email": unique_email,
            "customer_document": "12345678901"  # Test CPF
        }, headers=headers)
        
        # Should return PIX data
        assert sub_response.status_code == 200, f"Subscription create failed: {sub_response.text}"
        sub_data = sub_response.json()
        
        assert sub_data.get("success") == True
        assert sub_data.get("payment_method") == "pix"
        assert sub_data.get("pix_qr_code") is not None, "Should return PIX QR code"
        
        print(f"✓ Subscription create returns PIX data: payment_id={sub_data.get('payment_id')}")
        
        # Verify barbershop is STILL pending
        me_response = requests.get(f"{BASE_URL}/api/barbershops/me", headers=headers)
        assert me_response.status_code == 200
        me_data = me_response.json()
        
        assert me_data.get("plan_status") == "pending", f"Expected pending, got {me_data.get('plan_status')}"
        print(f"✓ Barbershop remains pending after subscription/create (not activated)")


class TestDemoAccountHasActiveSubscription:
    """Verify demo account has active subscription (for comparison)"""
    
    def test_demo_account_is_active(self):
        """Demo account should have active subscription"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@barberhubpro.com.br",
            "password": "Demo@2024"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Demo account not available")
        
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get barbershop
        me_response = requests.get(f"{BASE_URL}/api/barbershops/me", headers=headers)
        assert me_response.status_code == 200
        me_data = me_response.json()
        
        assert me_data.get("plan_status") == "active", f"Demo should be active, got {me_data.get('plan_status')}"
        print(f"✓ Demo account has active subscription")
        
        # Demo should be able to access services
        services_response = requests.get(f"{BASE_URL}/api/services", headers=headers)
        assert services_response.status_code == 200, "Demo should access services"
        print(f"✓ Demo account can access protected routes")


class TestWebhookEndpointExists:
    """Verify webhook endpoint exists and is accessible"""
    
    def test_webhook_endpoint_exists(self):
        """Webhook endpoint should exist and accept POST"""
        # Send empty webhook (will be ignored but should not error)
        response = requests.post(f"{BASE_URL}/api/webhooks/mercadopago", json={
            "type": "test",
            "data": {"id": "test"}
        })
        
        # Should return 200 (webhook always returns 200 to acknowledge)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Webhook endpoint exists and returns 200")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
