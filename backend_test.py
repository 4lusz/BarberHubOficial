#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class BarberSaaSAPITester:
    def __init__(self, base_url="https://barberbook-55.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.barbershop_data = None
        self.service_id = None
        self.professional_id = None
        self.appointment_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append({"test": name, "details": details})

    def make_request(self, method, endpoint, data=None, expected_status=200, auth_required=True):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            return success, response.json() if response.content else {}

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}
        except json.JSONDecodeError:
            return False, {"error": "Invalid JSON response"}

    def test_api_health(self):
        """Test API health endpoint"""
        success, response = self.make_request('GET', '/', auth_required=False)
        self.log_test("API Health Check", success and response.get('status') == 'ok', 
                     f"Response: {response}")
        return success

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        test_data = {
            "name": f"Test Barber {timestamp}",
            "email": f"testbarber{timestamp}@example.com",
            "password": "testpass123",
            "barbershop_name": f"Test Barbershop {timestamp}",
            "role": "barber"
        }
        
        success, response = self.make_request('POST', '/auth/register', test_data, 
                                            expected_status=200, auth_required=False)
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_data = response['user']
            self.barbershop_data = response.get('barbershop')
            
        self.log_test("User Registration", success and 'token' in response,
                     f"Response: {response}")
        return success

    def test_user_login(self):
        """Test user login with registered credentials"""
        if not self.user_data:
            self.log_test("User Login", False, "No user data available for login test")
            return False
            
        login_data = {
            "email": self.user_data['email'],
            "password": "testpass123"
        }
        
        success, response = self.make_request('POST', '/auth/login', login_data,
                                            expected_status=200, auth_required=False)
        
        if success and 'token' in response:
            # Update token with login token
            self.token = response['token']
            
        self.log_test("User Login", success and 'token' in response,
                     f"Response: {response}")
        return success

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.make_request('GET', '/auth/me')
        
        self.log_test("Get Current User", success and 'user_id' in response,
                     f"Response: {response}")
        return success

    def test_get_my_barbershop(self):
        """Test getting user's barbershop"""
        success, response = self.make_request('GET', '/barbershops/me')
        
        self.log_test("Get My Barbershop", success and (response is None or 'barbershop_id' in response),
                     f"Response: {response}")
        return success

    def test_services_crud(self):
        """Test services CRUD operations"""
        # Create service
        service_data = {
            "name": "Test Haircut",
            "duration": 30,
            "price": 25.00,
            "description": "Basic haircut service"
        }
        
        success, response = self.make_request('POST', '/services', service_data, expected_status=200)
        
        if success and 'service_id' in response:
            self.service_id = response['service_id']
            
        self.log_test("Create Service", success and 'service_id' in response,
                     f"Response: {response}")
        
        if not success:
            return False

        # Get services
        success, response = self.make_request('GET', '/services')
        services_found = success and isinstance(response, list) and len(response) > 0
        
        self.log_test("Get Services", services_found,
                     f"Found {len(response) if isinstance(response, list) else 0} services")

        # Update service
        if self.service_id:
            update_data = {
                "name": "Updated Test Haircut",
                "duration": 45,
                "price": 30.00,
                "description": "Updated haircut service"
            }
            
            success, response = self.make_request('PUT', f'/services/{self.service_id}', update_data)
            
            self.log_test("Update Service", success and response.get('name') == 'Updated Test Haircut',
                         f"Response: {response}")

        return services_found

    def test_professionals_crud(self):
        """Test professionals CRUD operations"""
        # Create professional
        prof_data = {
            "name": "Test Professional",
            "phone": "(11) 99999-9999",
            "email": "testprof@example.com"
        }
        
        success, response = self.make_request('POST', '/professionals', prof_data, expected_status=200)
        
        if success and 'professional_id' in response:
            self.professional_id = response['professional_id']
            
        self.log_test("Create Professional", success and 'professional_id' in response,
                     f"Response: {response}")
        
        if not success:
            return False

        # Get professionals
        success, response = self.make_request('GET', '/professionals')
        profs_found = success and isinstance(response, list) and len(response) > 0
        
        self.log_test("Get Professionals", profs_found,
                     f"Found {len(response) if isinstance(response, list) else 0} professionals")

        return profs_found

    def test_business_hours(self):
        """Test business hours management"""
        # Get business hours
        success, response = self.make_request('GET', '/business-hours')
        
        self.log_test("Get Business Hours", success and isinstance(response, list),
                     f"Response: {response}")

        # Update business hours
        hours_data = []
        for day in range(7):
            hours_data.append({
                "day_of_week": day,
                "start_time": "09:00",
                "end_time": "18:00",
                "is_closed": day == 6  # Sunday closed
            })
        
        success, response = self.make_request('PUT', '/business-hours', hours_data)
        
        self.log_test("Update Business Hours", success and isinstance(response, list),
                     f"Response: {response}")
        
        return success

    def test_appointments_flow(self):
        """Test appointment creation and management"""
        if not self.service_id or not self.barbershop_data:
            self.log_test("Appointments Flow", False, "Missing service or barbershop data")
            return False

        # Get availability
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        endpoint = f"/appointments/availability/{self.barbershop_data['barbershop_id']}?date={tomorrow}&service_id={self.service_id}"
        
        success, response = self.make_request('GET', endpoint, auth_required=False)
        
        available_slots = response.get('available_slots', []) if success else []
        
        self.log_test("Get Availability", success and 'available_slots' in response,
                     f"Found {len(available_slots)} available slots")

        if not available_slots:
            return success

        # Create appointment
        appointment_data = {
            "barbershop_id": self.barbershop_data['barbershop_id'],
            "service_id": self.service_id,
            "professional_id": self.professional_id,
            "date": tomorrow,
            "time": available_slots[0]['time'],
            "client_name": "Test Client",
            "client_phone": "(11) 88888-8888",
            "client_email": "testclient@example.com"
        }
        
        success, response = self.make_request('POST', '/appointments', appointment_data, 
                                            expected_status=200, auth_required=False)
        
        if success and 'appointment_id' in response:
            self.appointment_id = response['appointment_id']
            
        self.log_test("Create Appointment", success and 'appointment_id' in response,
                     f"Response: {response}")

        # Get appointments
        success, response = self.make_request('GET', f'/appointments?date={tomorrow}')
        
        appointments_found = success and isinstance(response, list) and len(response) > 0
        
        self.log_test("Get Appointments", appointments_found,
                     f"Found {len(response) if isinstance(response, list) else 0} appointments")

        # Update appointment status
        if self.appointment_id:
            update_data = {"status": "confirmed"}
            
            success, response = self.make_request('PUT', f'/appointments/{self.appointment_id}', update_data)
            
            self.log_test("Update Appointment Status", success and response.get('status') == 'confirmed',
                         f"Response: {response}")

        return appointments_found

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.make_request('GET', '/dashboard/stats')
        
        expected_keys = ['today_appointments', 'pending_appointments', 'week_revenue', 'total_clients']
        has_all_keys = success and all(key in response for key in expected_keys)
        
        self.log_test("Dashboard Stats", has_all_keys,
                     f"Response: {response}")
        
        return has_all_keys

    def test_public_barbershop_access(self):
        """Test public barbershop page access"""
        if not self.barbershop_data or not self.barbershop_data.get('slug'):
            self.log_test("Public Barbershop Access", False, "No barbershop slug available")
            return False

        slug = self.barbershop_data['slug']
        success, response = self.make_request('GET', f'/barbershops/public/{slug}', auth_required=False)
        
        expected_keys = ['barbershop', 'services', 'professionals', 'business_hours']
        has_all_keys = success and all(key in response for key in expected_keys)
        
        self.log_test("Public Barbershop Access", has_all_keys,
                     f"Response keys: {list(response.keys()) if success else 'Failed'}")
        
        return has_all_keys

    def cleanup_test_data(self):
        """Clean up test data"""
        # Delete service
        if self.service_id:
            success, _ = self.make_request('DELETE', f'/services/{self.service_id}')
            self.log_test("Cleanup: Delete Service", success)

        # Delete professional
        if self.professional_id:
            success, _ = self.make_request('DELETE', f'/professionals/{self.professional_id}')
            self.log_test("Cleanup: Delete Professional", success)

        # Cancel appointment
        if self.appointment_id:
            success, _ = self.make_request('DELETE', f'/appointments/{self.appointment_id}')
            self.log_test("Cleanup: Cancel Appointment", success)

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting BarberSaaS API Tests...")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)

        # Core API tests
        if not self.test_api_health():
            print("❌ API Health check failed - stopping tests")
            return False

        # Authentication flow
        if not self.test_user_registration():
            print("❌ User registration failed - stopping tests")
            return False

        self.test_user_login()
        self.test_get_current_user()
        self.test_get_my_barbershop()

        # Business logic tests
        self.test_services_crud()
        self.test_professionals_crud()
        self.test_business_hours()
        self.test_appointments_flow()
        self.test_dashboard_stats()
        self.test_public_barbershop_access()

        # Cleanup
        self.cleanup_test_data()

        # Results
        print("=" * 60)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"📈 Success rate: {success_rate:.1f}%")
        
        return success_rate >= 80  # Consider 80%+ as passing

def main():
    tester = BarberSaaSAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())