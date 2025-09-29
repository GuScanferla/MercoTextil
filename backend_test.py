import requests
import sys
import json
from datetime import datetime

class FusosSystemTester:
    def __init__(self, base_url="https://merco-textile-mgmt.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}
        self.users = {
            "admin": {"username": "admin", "password": "admin123"},
            "interno": {"username": "interno", "password": "interno123"},
            "externo": {"username": "externo", "password": "externo123"}
        }
        self.tests_run = 0
        self.tests_passed = 0
        self.created_orders = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            
            success = response.status_code == expected_status
            return success, response.json() if response.content else {}, response.status_code
        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_authentication(self):
        """Test login for all user types"""
        print("\n🔐 TESTING AUTHENTICATION")
        
        for user_type, credentials in self.users.items():
            success, response, status = self.make_request(
                'POST', 'auth/login', credentials, expected_status=200
            )
            
            if success and 'token' in response:
                self.tokens[user_type] = response['token']
                user_role = response['user']['role']
                self.log_test(
                    f"Login {user_type}", 
                    True, 
                    f"- Role: {user_role}"
                )
            else:
                self.log_test(
                    f"Login {user_type}", 
                    False, 
                    f"- Status: {status}, Response: {response}"
                )

    def test_user_info(self):
        """Test getting user information"""
        print("\n👤 TESTING USER INFO")
        
        for user_type, token in self.tokens.items():
            success, response, status = self.make_request(
                'GET', 'auth/me', token=token
            )
            
            if success:
                self.log_test(
                    f"Get user info {user_type}", 
                    True, 
                    f"- Username: {response.get('username')}, Role: {response.get('role')}"
                )
            else:
                self.log_test(
                    f"Get user info {user_type}", 
                    False, 
                    f"- Status: {status}"
                )

    def test_machines(self):
        """Test machine endpoints"""
        print("\n🏭 TESTING MACHINES")
        
        layouts = ["16_fusos", "32_fusos"]
        expected_counts = {"16_fusos": 24, "32_fusos": 33}
        
        for layout in layouts:
            success, response, status = self.make_request(
                'GET', f'machines/{layout}', token=self.tokens.get('admin')
            )
            
            if success and isinstance(response, list):
                machine_count = len(response)
                expected_count = expected_counts[layout]
                count_correct = machine_count == expected_count
                
                # Check if all machines start with verde status
                verde_count = sum(1 for m in response if m.get('status') == 'verde')
                
                self.log_test(
                    f"Get machines {layout}", 
                    count_correct, 
                    f"- Count: {machine_count}/{expected_count}, Verde: {verde_count}"
                )
            else:
                self.log_test(
                    f"Get machines {layout}", 
                    False, 
                    f"- Status: {status}, Response type: {type(response)}"
                )

    def test_order_creation(self):
        """Test order creation (admin and interno only)"""
        print("\n📋 TESTING ORDER CREATION")
        
        # Test with admin user
        order_data = {
            "machine_number": 1,
            "layout_type": "16_fusos",
            "cliente": "Test Client",
            "artigo": "Test Article",
            "cor": "Blue",
            "quantidade": 100,
            "observacao": "Test order"
        }
        
        # Test admin can create orders
        success, response, status = self.make_request(
            'POST', 'orders', order_data, token=self.tokens.get('admin')
        )
        
        if success and 'id' in response:
            self.created_orders.append(response['id'])
            self.log_test(
                "Create order (admin)", 
                True, 
                f"- Order ID: {response['id']}"
            )
        else:
            self.log_test(
                "Create order (admin)", 
                False, 
                f"- Status: {status}, Response: {response}"
            )

        # Test interno can create orders
        order_data["machine_number"] = 2
        success, response, status = self.make_request(
            'POST', 'orders', order_data, token=self.tokens.get('interno')
        )
        
        if success and 'id' in response:
            self.created_orders.append(response['id'])
            self.log_test(
                "Create order (interno)", 
                True, 
                f"- Order ID: {response['id']}"
            )
        else:
            self.log_test(
                "Create order (interno)", 
                False, 
                f"- Status: {status}, Response: {response}"
            )

        # Test externo CANNOT create orders
        order_data["machine_number"] = 3
        success, response, status = self.make_request(
            'POST', 'orders', order_data, token=self.tokens.get('externo'), expected_status=403
        )
        
        self.log_test(
            "Create order (externo - should fail)", 
            success, 
            f"- Status: {status} (expected 403)"
        )

    def test_order_management(self):
        """Test order status updates"""
        print("\n🔄 TESTING ORDER MANAGEMENT")
        
        if not self.created_orders:
            print("⚠️ No orders created, skipping order management tests")
            return

        order_id = self.created_orders[0]
        
        # Test externo can start production
        update_data = {
            "status": "em_producao",
            "observacao_liberacao": "Starting production"
        }
        
        success, response, status = self.make_request(
            'PUT', f'orders/{order_id}', update_data, token=self.tokens.get('externo')
        )
        
        self.log_test(
            "Start production (externo)", 
            success, 
            f"- Status: {status}"
        )

        # Test admin can finish production
        update_data = {
            "status": "finalizado",
            "observacao_liberacao": "Production finished"
        }
        
        success, response, status = self.make_request(
            'PUT', f'orders/{order_id}', update_data, token=self.tokens.get('admin')
        )
        
        self.log_test(
            "Finish production (admin)", 
            success, 
            f"- Status: {status}"
        )

        # Test interno CANNOT update orders
        if len(self.created_orders) > 1:
            order_id_2 = self.created_orders[1]
            update_data = {
                "status": "em_producao",
                "observacao_liberacao": "Should not work"
            }
            
            success, response, status = self.make_request(
                'PUT', f'orders/{order_id_2}', update_data, 
                token=self.tokens.get('interno'), expected_status=403
            )
            
            self.log_test(
                "Update order (interno - should fail)", 
                success, 
                f"- Status: {status} (expected 403)"
            )

    def test_orders_list(self):
        """Test getting orders list"""
        print("\n📄 TESTING ORDERS LIST")
        
        for user_type, token in self.tokens.items():
            success, response, status = self.make_request(
                'GET', 'orders', token=token
            )
            
            if success and isinstance(response, list):
                self.log_test(
                    f"Get orders ({user_type})", 
                    True, 
                    f"- Count: {len(response)}"
                )
            else:
                self.log_test(
                    f"Get orders ({user_type})", 
                    False, 
                    f"- Status: {status}"
                )

    def test_user_management(self):
        """Test user management (admin only)"""
        print("\n👥 TESTING USER MANAGEMENT")
        
        # Test admin can get users
        success, response, status = self.make_request(
            'GET', 'users', token=self.tokens.get('admin')
        )
        
        if success and isinstance(response, list):
            self.log_test(
                "Get users (admin)", 
                True, 
                f"- Count: {len(response)}"
            )
        else:
            self.log_test(
                "Get users (admin)", 
                False, 
                f"- Status: {status}"
            )

        # Test non-admin cannot get users
        success, response, status = self.make_request(
            'GET', 'users', token=self.tokens.get('interno'), expected_status=403
        )
        
        self.log_test(
            "Get users (interno - should fail)", 
            success, 
            f"- Status: {status} (expected 403)"
        )

        # Test admin can create user
        new_user_data = {
            "username": f"test_user_{datetime.now().strftime('%H%M%S')}",
            "email": "test@example.com",
            "password": "testpass123",
            "role": "operador_interno"
        }
        
        success, response, status = self.make_request(
            'POST', 'users', new_user_data, token=self.tokens.get('admin')
        )
        
        self.log_test(
            "Create user (admin)", 
            success, 
            f"- Status: {status}"
        )

    def test_reports(self):
        """Test reports (admin only)"""
        print("\n📊 TESTING REPORTS")
        
        # Test status history
        success, response, status = self.make_request(
            'GET', 'reports/status-history', token=self.tokens.get('admin')
        )
        
        if success and isinstance(response, list):
            self.log_test(
                "Get status history (admin)", 
                True, 
                f"- Count: {len(response)}"
            )
        else:
            self.log_test(
                "Get status history (admin)", 
                False, 
                f"- Status: {status}"
            )

        # Test export reports
        for layout in ["16_fusos", "32_fusos"]:
            success, response, status = self.make_request(
                'GET', f'reports/export?layout_type={layout}', token=self.tokens.get('admin')
            )
            
            if success and 'orders' in response and 'status_history' in response:
                self.log_test(
                    f"Export report {layout} (admin)", 
                    True, 
                    f"- Orders: {len(response['orders'])}, History: {len(response['status_history'])}"
                )
            else:
                self.log_test(
                    f"Export report {layout} (admin)", 
                    False, 
                    f"- Status: {status}"
                )

        # Test non-admin cannot access reports
        success, response, status = self.make_request(
            'GET', 'reports/status-history', token=self.tokens.get('externo'), expected_status=403
        )
        
        self.log_test(
            "Get reports (externo - should fail)", 
            success, 
            f"- Status: {status} (expected 403)"
        )

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 STARTING FUSOS SYSTEM BACKEND TESTS")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        self.test_authentication()
        
        if not self.tokens:
            print("❌ Authentication failed, cannot continue with other tests")
            return 1
            
        self.test_user_info()
        self.test_machines()
        self.test_order_creation()
        self.test_order_management()
        self.test_orders_list()
        self.test_user_management()
        self.test_reports()
        
        print("\n" + "=" * 60)
        print(f"📊 BACKEND TEST RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All backend tests passed!")
            return 0
        else:
            print(f"⚠️ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = FusosSystemTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())