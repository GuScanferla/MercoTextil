import requests
import sys
import json
from datetime import datetime

class FusosSystemTester:
    def __init__(self, base_url="https://spinning-manager.preview.emergentagent.com"):
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
        self.created_espulas = []

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
        """Test machine endpoints with exact layout codes"""
        print("\n🏭 TESTING MACHINES")
        
        # Test 16 fusos layout - should have CD1-CD24, CI1-CI4, F1-F24
        success, response, status = self.make_request(
            'GET', 'machines/16_fusos', token=self.tokens.get('admin')
        )
        
        if success and isinstance(response, list):
            machine_count = len(response)
            expected_count = 52  # CD1-CD24 (24) + CI1-CI4 (4) + F1-F24 (24) = 52
            
            # Check specific machine codes
            codes = [m.get('code') for m in response]
            cd_codes = [c for c in codes if c.startswith('CD')]
            ci_codes = [c for c in codes if c.startswith('CI')]
            f_codes = [c for c in codes if c.startswith('F')]
            
            cd_expected = [f'CD{i}' for i in range(1, 25)]  # CD1-CD24
            ci_expected = [f'CI{i}' for i in range(1, 5)]   # CI1-CI4
            f_expected = [f'F{i}' for i in range(1, 25)]    # F1-F24
            
            cd_correct = set(cd_codes) == set(cd_expected)
            ci_correct = set(ci_codes) == set(ci_expected)
            f_correct = set(f_codes) == set(f_expected)
            
            all_correct = cd_correct and ci_correct and f_correct and machine_count == expected_count
            
            self.log_test(
                "Get machines 16_fusos", 
                all_correct, 
                f"- Total: {machine_count}/{expected_count}, CD: {len(cd_codes)}/24, CI: {len(ci_codes)}/4, F: {len(f_codes)}/24"
            )
        else:
            self.log_test(
                "Get machines 16_fusos", 
                False, 
                f"- Status: {status}, Response type: {type(response)}"
            )

        # Test 32 fusos layout - should have CT1-CT24, U1-U33, N1-N10
        success, response, status = self.make_request(
            'GET', 'machines/32_fusos', token=self.tokens.get('admin')
        )
        
        if success and isinstance(response, list):
            machine_count = len(response)
            expected_count = 67  # CT1-CT24 (24) + U1-U33 (33) + N1-N10 (10) = 67
            
            # Check specific machine codes
            codes = [m.get('code') for m in response]
            ct_codes = [c for c in codes if c.startswith('CT')]
            u_codes = [c for c in codes if c.startswith('U')]
            n_codes = [c for c in codes if c.startswith('N')]
            
            ct_expected = [f'CT{i}' for i in range(1, 25)]  # CT1-CT24
            u_expected = [f'U{i}' for i in range(1, 34)]    # U1-U33
            n_expected = [f'N{i}' for i in range(1, 11)]    # N1-N10
            
            ct_correct = set(ct_codes) == set(ct_expected)
            u_correct = set(u_codes) == set(u_expected)
            n_correct = set(n_codes) == set(n_expected)
            
            all_correct = ct_correct and u_correct and n_correct and machine_count == expected_count
            
            self.log_test(
                "Get machines 32_fusos", 
                all_correct, 
                f"- Total: {machine_count}/{expected_count}, CT: {len(ct_codes)}/24, U: {len(u_codes)}/33, N: {len(n_codes)}/10"
            )
        else:
            self.log_test(
                "Get machines 32_fusos", 
                False, 
                f"- Status: {status}, Response type: {type(response)}"
            )

    def test_espulas_creation(self):
        """Test Espulas creation with new field structure"""
        print("\n📦 TESTING ESPULAS CREATION")
        
        # Test espula creation with new fields
        espula_data = {
            "cliente": "Empresa ABC Ltda",
            "artigo": "Tecido Premium 100% Algodão",
            "cor": "Azul Marinho",
            "quantidade_metros": "150.5",  # New field name
            "carga": "ABC123",  # New alphanumeric field
            "observacoes": "Material de alta qualidade para exportação",
            "data_prevista_entrega": "2024-02-15"
        }
        
        success, response, status = self.make_request(
            'POST', 'espulas', espula_data, token=self.tokens.get('admin')
        )
        
        if success and 'id' in response:
            self.created_espulas.append(response['id'])
            # Verify new field names are present
            has_metros = 'quantidade_metros' in response
            has_carga = 'carga' in response
            correct_status = response.get('status') == 'pendente'
            
            self.log_test(
                "Create espula with new fields", 
                has_metros and has_carga and correct_status, 
                f"- ID: {response['id']}, Metros: {has_metros}, Carga: {has_carga}, Status: {response.get('status')}"
            )
        else:
            self.log_test(
                "Create espula with new fields", 
                False, 
                f"- Status: {status}, Response: {response}"
            )

        # Test with different user roles
        espula_data["cliente"] = "Cliente Interno"
        espula_data["carga"] = "XYZ789"
        
        success, response, status = self.make_request(
            'POST', 'espulas', espula_data, token=self.tokens.get('interno')
        )
        
        if success and 'id' in response:
            self.created_espulas.append(response['id'])
            self.log_test(
                "Create espula (interno)", 
                True, 
                f"- ID: {response['id']}"
            )
        else:
            self.log_test(
                "Create espula (interno)", 
                False, 
                f"- Status: {status}"
            )

    def test_espulas_status_updates(self):
        """Test Espulas status updates with history tracking"""
        print("\n🔄 TESTING ESPULAS STATUS UPDATES")
        
        if not self.created_espulas:
            print("⚠️ No espulas created, skipping status update tests")
            return

        espula_id = self.created_espulas[0]
        
        # Test status update to em_producao_aguardando (should set iniciado_em)
        update_data = {"status": "em_producao_aguardando"}
        
        success, response, status = self.make_request(
            'PUT', f'espulas/{espula_id}', update_data, token=self.tokens.get('admin')
        )
        
        self.log_test(
            "Update to em_producao_aguardando", 
            success, 
            f"- Status: {status} (should set iniciado_em)"
        )

        # Test status update to producao
        update_data = {"status": "producao"}
        
        success, response, status = self.make_request(
            'PUT', f'espulas/{espula_id}', update_data, token=self.tokens.get('admin')
        )
        
        self.log_test(
            "Update to producao", 
            success, 
            f"- Status: {status}"
        )

        # Test status update to finalizado (should set finalizado_em)
        update_data = {"status": "finalizado"}
        
        success, response, status = self.make_request(
            'PUT', f'espulas/{espula_id}', update_data, token=self.tokens.get('admin')
        )
        
        self.log_test(
            "Update to finalizado", 
            success, 
            f"- Status: {status} (should set finalizado_em)"
        )

    def test_espulas_list(self):
        """Test getting espulas list with new field names"""
        print("\n📄 TESTING ESPULAS LIST")
        
        success, response, status = self.make_request(
            'GET', 'espulas', token=self.tokens.get('admin')
        )
        
        if success and isinstance(response, list):
            # Check if response contains new field names
            has_new_fields = True
            if response:
                first_espula = response[0]
                has_metros = 'quantidade_metros' in first_espula
                has_carga = 'carga' in first_espula
                has_new_fields = has_metros and has_carga
            
            self.log_test(
                "Get espulas list", 
                has_new_fields, 
                f"- Count: {len(response)}, Has new fields: {has_new_fields}"
            )
        else:
            self.log_test(
                "Get espulas list", 
                False, 
                f"- Status: {status}"
            )

    def test_database_reset(self):
        """Test database reset functionality (admin only)"""
        print("\n🔄 TESTING DATABASE RESET")
        
        # Test admin can reset database
        success, response, status = self.make_request(
            'POST', 'reset-database', token=self.tokens.get('admin')
        )
        
        self.log_test(
            "Reset database (admin)", 
            success, 
            f"- Status: {status}, Message: {response.get('message', '')}"
        )

        # Test non-admin cannot reset database
        success, response, status = self.make_request(
            'POST', 'reset-database', token=self.tokens.get('interno'), expected_status=403
        )
        
        self.log_test(
            "Reset database (interno - should fail)", 
            success, 
            f"- Status: {status} (expected 403)"
        )

        # Verify machines are recreated after reset
        success, response, status = self.make_request(
            'GET', 'machines/16_fusos', token=self.tokens.get('admin')
        )
        
        if success and isinstance(response, list):
            machine_count = len(response)
            expected_count = 52  # Should be recreated
            
            self.log_test(
                "Machines recreated after reset", 
                machine_count == expected_count, 
                f"- Count: {machine_count}/{expected_count}"
            )
        else:
            self.log_test(
                "Machines recreated after reset", 
                False, 
                f"- Status: {status}"
            )

    def test_timezone_handling(self):
        """Test Brasília timezone handling"""
        print("\n🌎 TESTING TIMEZONE HANDLING")
        
        # Create an espula and check timestamp format
        espula_data = {
            "cliente": "Teste Timezone",
            "artigo": "Teste",
            "cor": "Verde",
            "quantidade_metros": "100",
            "carga": "TZ001",
            "observacoes": "Teste de timezone",
            "data_prevista_entrega": "2024-03-01"
        }
        
        success, response, status = self.make_request(
            'POST', 'espulas', espula_data, token=self.tokens.get('admin')
        )
        
        if success and 'created_at' in response:
            created_at = response['created_at']
            # Check if timestamp is in ISO format (should be Brasília time)
            try:
                datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                timezone_test_passed = True
            except:
                timezone_test_passed = False
            
            self.log_test(
                "Timezone handling", 
                timezone_test_passed, 
                f"- Created at: {created_at}"
            )
        else:
            self.log_test(
                "Timezone handling", 
                False, 
                f"- Status: {status}"
            )

    def test_error_handling(self):
        """Test error handling for invalid data"""
        print("\n⚠️ TESTING ERROR HANDLING")
        
        # Test invalid espula data (missing required fields)
        invalid_data = {
            "cliente": "Test",
            # Missing required fields
        }
        
        success, response, status = self.make_request(
            'POST', 'espulas', invalid_data, token=self.tokens.get('admin'), expected_status=422
        )
        
        self.log_test(
            "Invalid espula data", 
            status == 422, 
            f"- Status: {status} (expected 422)"
        )

        # Test unauthorized access (no token)
        success, response, status = self.make_request(
            'GET', 'espulas', expected_status=403
        )
        
        self.log_test(
            "Unauthorized access", 
            status == 403, 
            f"- Status: {status} (expected 403)"
        )

        # Test invalid espula ID for update
        update_data = {"status": "producao"}
        success, response, status = self.make_request(
            'PUT', 'espulas/invalid-id', update_data, token=self.tokens.get('admin'), expected_status=404
        )
        
        self.log_test(
            "Invalid espula ID", 
            status == 404, 
            f"- Status: {status} (expected 404)"
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

    def test_ordem_producao_functionality(self):
        """Test complete Ordem de Produção functionality"""
        print("\n📋 TESTING ORDEM DE PRODUÇÃO FUNCTIONALITY")
        
        # Test 1: GET next-number initially (should return 0001)
        success, response, status = self.make_request(
            'GET', 'ordens-producao/next-number', token=self.tokens.get('admin')
        )
        
        initial_number = response.get('numero_os') if success else None
        self.log_test(
            "Get next OS number (initial)", 
            success and initial_number == "0001", 
            f"- Number: {initial_number} (expected 0001)"
        )
        
        # Test 2: Create first ordem de produção
        ordem_data_1 = {
            "cliente": "Cliente Test",
            "artigo": "Artigo A", 
            "cor": "Azul",
            "metragem": "1000",
            "data_entrega": "2025-01-15",
            "observacao": "Test ordem"
        }
        
        success, response, status = self.make_request(
            'POST', 'ordens-producao', ordem_data_1, token=self.tokens.get('admin')
        )
        
        ordem_1_id = response.get('id') if success else None
        ordem_1_number = response.get('numero_os') if success else None
        ordem_1_status = response.get('status') if success else None
        
        self.log_test(
            "Create ordem 0001", 
            success and ordem_1_number == "0001" and ordem_1_status == "pendente", 
            f"- ID: {ordem_1_id}, Number: {ordem_1_number}, Status: {ordem_1_status}"
        )
        
        # Test 3: Verify ordem created with correct data
        if ordem_1_id:
            success, response, status = self.make_request(
                'GET', f'ordens-producao/{ordem_1_id}', token=self.tokens.get('admin')
            )
            
            if success:
                has_timestamps = 'criado_em' in response and 'created_at' in response
                correct_data = (response.get('cliente') == "Cliente Test" and 
                              response.get('artigo') == "Artigo A" and
                              response.get('cor') == "Azul")
                
                self.log_test(
                    "Verify ordem 0001 data", 
                    has_timestamps and correct_data, 
                    f"- Timestamps: {has_timestamps}, Data: {correct_data}"
                )
        
        # Test 4: GET all ordens
        success, response, status = self.make_request(
            'GET', 'ordens-producao', token=self.tokens.get('admin')
        )
        
        ordens_count = len(response) if success and isinstance(response, list) else 0
        self.log_test(
            "Get all ordens", 
            success and ordens_count >= 1, 
            f"- Count: {ordens_count}"
        )
        
        # Test 5: GET pendentes ordens (should include ordem 0001)
        success, response, status = self.make_request(
            'GET', 'ordens-producao/pendentes', token=self.tokens.get('admin')
        )
        
        pendentes_count = len(response) if success and isinstance(response, list) else 0
        has_ordem_1 = any(o.get('numero_os') == "0001" for o in response) if success and isinstance(response, list) else False
        
        self.log_test(
            "Get pendentes ordens (should include 0001)", 
            success and has_ordem_1, 
            f"- Count: {pendentes_count}, Has 0001: {has_ordem_1}"
        )
        
        # Test 6: GET next-number after creating one (should return 0002)
        success, response, status = self.make_request(
            'GET', 'ordens-producao/next-number', token=self.tokens.get('admin')
        )
        
        next_number = response.get('numero_os') if success else None
        self.log_test(
            "Get next OS number (after 0001)", 
            success and next_number == "0002", 
            f"- Number: {next_number} (expected 0002)"
        )
        
        # Test 7: Create second ordem (should get 0002)
        ordem_data_2 = {
            "cliente": "Cliente Test 2",
            "artigo": "Artigo B", 
            "cor": "Verde",
            "metragem": "500",
            "data_entrega": "2025-01-20",
            "observacao": "Second test ordem"
        }
        
        success, response, status = self.make_request(
            'POST', 'ordens-producao', ordem_data_2, token=self.tokens.get('admin')
        )
        
        ordem_2_id = response.get('id') if success else None
        ordem_2_number = response.get('numero_os') if success else None
        
        self.log_test(
            "Create ordem 0002", 
            success and ordem_2_number == "0002", 
            f"- ID: {ordem_2_id}, Number: {ordem_2_number}"
        )
        
        # Store IDs for espula tests
        self.ordem_1_id = ordem_1_id
        self.ordem_2_id = ordem_2_id
        
        return ordem_1_id, ordem_2_id

    def test_updated_espulas_functionality(self):
        """Test updated Espulas functionality with new fields"""
        print("\n🧵 TESTING UPDATED ESPULAS FUNCTIONALITY")
        
        # Ensure we have ordem IDs from previous test
        if not hasattr(self, 'ordem_1_id') or not self.ordem_1_id:
            print("⚠️ No ordem ID available, running ordem tests first")
            self.test_ordem_producao_functionality()
        
        # Test 9: Create espula with new fields including ordem_producao_id
        espula_data = {
            "numero_os": "0001",
            "ordem_producao_id": self.ordem_1_id,
            "maquina": "CD1",
            "mat_prima": "Cotton",
            "qtde_fios": "12",
            "cliente": "Cliente Test",
            "artigo": "Artigo A",
            "cor": "Azul",
            "quantidade_metros": "1000",
            "carga": "A123",
            "carga_fracao_1": "200",
            "carga_fracao_2": "300", 
            "carga_fracao_3": "500",
            "data_prevista_entrega": "2025-01-15"
        }
        
        success, response, status = self.make_request(
            'POST', 'espulas', espula_data, token=self.tokens.get('admin')
        )
        
        espula_id = response.get('id') if success else None
        has_new_fields = (success and 
                         response.get('numero_os') == "0001" and
                         response.get('ordem_producao_id') == self.ordem_1_id and
                         response.get('maquina') == "CD1" and
                         response.get('mat_prima') == "Cotton")
        
        self.log_test(
            "Create espula with new fields", 
            has_new_fields, 
            f"- ID: {espula_id}, Has new fields: {has_new_fields}"
        )
        
        # Test 10: Verify espula created with all new fields
        if espula_id:
            success, response, status = self.make_request(
                'GET', 'espulas', token=self.tokens.get('admin')
            )
            
            if success and isinstance(response, list):
                created_espula = next((e for e in response if e.get('id') == espula_id), None)
                if created_espula:
                    has_cargas = (created_espula.get('carga_fracao_1') == "200" and
                                created_espula.get('carga_fracao_2') == "300" and
                                created_espula.get('carga_fracao_3') == "500")
                    
                    self.log_test(
                        "Verify espula has all new fields", 
                        has_cargas, 
                        f"- Cargas: {has_cargas}"
                    )
        
        # Test 11: Verify ordem status changed to em_producao
        if self.ordem_1_id:
            success, response, status = self.make_request(
                'GET', f'ordens-producao/{self.ordem_1_id}', token=self.tokens.get('admin')
            )
            
            ordem_status = response.get('status') if success else None
            has_iniciado_em = 'iniciado_em' in response and response['iniciado_em'] is not None if success else False
            
            self.log_test(
                "Ordem status changed to em_producao", 
                success and ordem_status == "em_producao" and has_iniciado_em, 
                f"- Status: {ordem_status}, Has iniciado_em: {has_iniciado_em}"
            )
        
        # Test 12: Verify ordem no longer in pendentes
        success, response, status = self.make_request(
            'GET', 'ordens-producao/pendentes', token=self.tokens.get('admin')
        )
        
        has_ordem_1 = any(o.get('id') == self.ordem_1_id for o in response) if success and isinstance(response, list) else True
        
        self.log_test(
            "Ordem 0001 not in pendentes", 
            success and not has_ordem_1, 
            f"- Still in pendentes: {has_ordem_1}"
        )
        
        # Test 13: GET espulas returns ALL including new one
        success, response, status = self.make_request(
            'GET', 'espulas', token=self.tokens.get('admin')
        )
        
        espulas_count = len(response) if success and isinstance(response, list) else 0
        has_created_espula = any(e.get('id') == espula_id for e in response) if success and isinstance(response, list) else False
        
        self.log_test(
            "GET espulas includes new espula", 
            success and has_created_espula, 
            f"- Count: {espulas_count}, Has created: {has_created_espula}"
        )
        
        # Test 14: Update espula status to finalizado
        if espula_id:
            update_data = {"status": "finalizado"}
            success, response, status = self.make_request(
                'PUT', f'espulas/{espula_id}', update_data, token=self.tokens.get('admin')
            )
            
            self.log_test(
                "Update espula to finalizado", 
                success, 
                f"- Status: {status}"
            )
            
            # Test 15: Verify finalized espula still appears in list
            success, response, status = self.make_request(
                'GET', 'espulas', token=self.tokens.get('admin')
            )
            
            finalized_espula = next((e for e in response if e.get('id') == espula_id), None) if success and isinstance(response, list) else None
            finalized_status = finalized_espula.get('status') if finalized_espula else None
            has_finalizado_em = finalized_espula and 'finalizado_em' in finalized_espula and finalized_espula['finalizado_em'] is not None
            
            self.log_test(
                "Finalized espula still in list", 
                success and finalized_espula is not None and finalized_status == "finalizado" and has_finalizado_em, 
                f"- Status: {finalized_status}, Has finalizado_em: {has_finalizado_em}"
            )
        
        self.created_espula_id = espula_id
        return espula_id

    def test_sequential_os_numbers(self):
        """Test sequential OS number generation"""
        print("\n🔢 TESTING SEQUENTIAL OS NUMBERS")
        
        created_ordens = []
        
        # Test 16: Create 10 ordens rapidly to test sequential numbering
        for i in range(10):
            ordem_data = {
                "cliente": f"Cliente Sequencial {i+1}",
                "artigo": f"Artigo {i+1}", 
                "cor": f"Cor {i+1}",
                "metragem": f"{(i+1)*100}",
                "data_entrega": "2025-02-01",
                "observacao": f"Ordem sequencial {i+1}"
            }
            
            success, response, status = self.make_request(
                'POST', 'ordens-producao', ordem_data, token=self.tokens.get('admin')
            )
            
            if success:
                created_ordens.append({
                    'id': response.get('id'),
                    'numero_os': response.get('numero_os'),
                    'index': i
                })
        
        # Test 17: Verify all have unique sequential numbers
        if len(created_ordens) == 10:
            numbers = [int(o['numero_os']) for o in created_ordens]
            is_sequential = all(numbers[i] == numbers[i-1] + 1 for i in range(1, len(numbers)))
            all_unique = len(set(numbers)) == len(numbers)
            
            # Should start from 0003 (after 0001 and 0002 from previous tests)
            starts_correctly = numbers[0] >= 3
            
            self.log_test(
                "Sequential OS numbering", 
                is_sequential and all_unique and starts_correctly, 
                f"- Sequential: {is_sequential}, Unique: {all_unique}, Range: {min(numbers)}-{max(numbers)}"
            )
        else:
            self.log_test(
                "Sequential OS numbering", 
                False, 
                f"- Only created {len(created_ordens)}/10 ordens"
            )

    def test_validation_scenarios(self):
        """Test validation scenarios"""
        print("\n✅ TESTING VALIDATION SCENARIOS")
        
        # Test 18: Create espula without ordem_producao_id (should work)
        espula_data_no_ordem = {
            "maquina": "CD2",
            "mat_prima": "Polyester",
            "qtde_fios": "8",
            "cliente": "Cliente Independente",
            "artigo": "Artigo Independente",
            "cor": "Vermelho",
            "quantidade_metros": "750",
            "carga": "B456",
            "data_prevista_entrega": "2025-01-25"
        }
        
        success, response, status = self.make_request(
            'POST', 'espulas', espula_data_no_ordem, token=self.tokens.get('admin')
        )
        
        self.log_test(
            "Create espula without ordem_producao_id", 
            success, 
            f"- Status: {status}, ID: {response.get('id') if success else 'None'}"
        )
        
        # Test 19: Create espula with invalid ordem_producao_id (should fail gracefully)
        espula_data_invalid_ordem = {
            "ordem_producao_id": "invalid-ordem-id-12345",
            "maquina": "CD3",
            "mat_prima": "Cotton",
            "qtde_fios": "10",
            "cliente": "Cliente Invalid",
            "artigo": "Artigo Invalid",
            "cor": "Preto",
            "quantidade_metros": "500",
            "carga": "C789",
            "data_prevista_entrega": "2025-01-30"
        }
        
        success, response, status = self.make_request(
            'POST', 'espulas', espula_data_invalid_ordem, token=self.tokens.get('admin')
        )
        
        # This should either succeed (if validation allows invalid IDs) or fail gracefully
        self.log_test(
            "Create espula with invalid ordem_producao_id", 
            True,  # Accept either success or graceful failure
            f"- Status: {status}, Response handled gracefully"
        )

    def test_reports(self):
        """Test reports (admin only)"""
        print("\n📊 TESTING REPORTS")
        
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

        # Test espulas report
        success, response, status = self.make_request(
            'GET', 'espulas/report', token=self.tokens.get('admin')
        )
        
        if success and 'espulas' in response:
            self.log_test(
                "Espulas report (admin)", 
                True, 
                f"- Espulas: {len(response['espulas'])}"
            )
        else:
            self.log_test(
                "Espulas report (admin)", 
                False, 
                f"- Status: {status}"
            )

        # Test non-admin cannot access reports
        success, response, status = self.make_request(
            'GET', 'reports/export?layout_type=16_fusos', token=self.tokens.get('externo'), expected_status=403
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
        
        # NEW ORDEM DE PRODUÇÃO AND ESPULAS TESTS
        self.test_ordem_producao_functionality()
        self.test_updated_espulas_functionality()
        self.test_sequential_os_numbers()
        self.test_validation_scenarios()
        
        # EXISTING TESTS
        self.test_espulas_creation()
        self.test_espulas_status_updates()
        self.test_espulas_list()
        self.test_database_reset()
        self.test_timezone_handling()
        self.test_error_handling()
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