import requests
import sys
import json
from datetime import datetime

class NewFeaturesTester:
    def __init__(self, base_url="https://prodmanager-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ordem_id = None
        self.created_machine_id = None
        self.created_order_id = None
        self.created_espula_id = None

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

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

    def authenticate(self):
        """Login as admin user"""
        print("\n🔐 AUTHENTICATING")
        
        credentials = {"username": "admin", "password": "admin123"}
        success, response, status = self.make_request('POST', 'auth/login', credentials)
        
        if success and 'token' in response:
            self.token = response['token']
            self.log_test("Admin login", True, f"- Token obtained")
            return True
        else:
            self.log_test("Admin login", False, f"- Status: {status}, Response: {response}")
            return False

    def test_temporary_data_save(self):
        """Test temporary data save functionality in OrdemProducao"""
        print("\n💾 TESTING TEMPORARY DATA SAVE FUNCTIONALITY")
        
        # Step 1: Create an ordem de producao
        ordem_data = {
            "cliente": "Empresa Teste Temp",
            "artigo": "Artigo Temporário",
            "cor": "Azul Claro",
            "metragem": "2000",
            "data_entrega": "2025-02-15",
            "observacao": "Teste de dados temporários"
        }
        
        success, response, status = self.make_request('POST', 'ordens-producao', ordem_data)
        
        if success and 'id' in response:
            self.created_ordem_id = response['id']
            ordem_number = response.get('numero_os')
            self.log_test(
                "Create ordem for temp data test", 
                True, 
                f"- ID: {self.created_ordem_id}, Number: {ordem_number}"
            )
        else:
            self.log_test(
                "Create ordem for temp data test", 
                False, 
                f"- Status: {status}, Response: {response}"
            )
            return False

        # Step 2: Save temporary data using PUT /api/ordens-producao/{id}/salvar-temporarios
        temp_data = {
            "dados_temporarios_maquinas": [
                {
                    "machine_code": "CD1",
                    "machine_id": "test-machine-1",
                    "layout_type": "16_fusos",
                    "quantidade": "500"
                },
                {
                    "machine_code": "CD2", 
                    "machine_id": "test-machine-2",
                    "layout_type": "16_fusos",
                    "quantidade": "750"
                }
            ],
            "espula_data": {
                "maquina": "CD1",
                "mat_prima": "Cotton Premium",
                "qtde_fios": "16",
                "carga": "TEMP001",
                "observacoes": "Dados salvos temporariamente"
            }
        }
        
        success, response, status = self.make_request(
            'PUT', 
            f'ordens-producao/{self.created_ordem_id}/salvar-temporarios', 
            temp_data
        )
        
        self.log_test(
            "Save temporary data", 
            success, 
            f"- Status: {status}, Message: {response.get('message', '')}"
        )

        # Step 3: Retrieve ordem and verify temp data is saved
        success, response, status = self.make_request(
            'GET', 
            f'ordens-producao/{self.created_ordem_id}'
        )
        
        if success:
            has_temp_machines = 'dados_temporarios_maquinas' in response and len(response['dados_temporarios_maquinas']) == 2
            has_temp_espula = 'espula_data_temp' in response and response['espula_data_temp'].get('maquina') == 'CD1'
            has_editor_info = 'editado_por' in response and response['editado_por'] == 'admin'
            has_edit_time = 'editado_em' in response and response['editado_em'] is not None
            
            self.log_test(
                "Verify temp data saved correctly", 
                has_temp_machines and has_temp_espula and has_editor_info and has_edit_time, 
                f"- Machines: {has_temp_machines}, Espula: {has_temp_espula}, Editor: {has_editor_info}, Time: {has_edit_time}"
            )
            
            # Verify specific machine allocation data
            if has_temp_machines:
                machines = response['dados_temporarios_maquinas']
                cd1_machine = next((m for m in machines if m.get('machine_code') == 'CD1'), None)
                cd2_machine = next((m for m in machines if m.get('machine_code') == 'CD2'), None)
                
                correct_quantities = (cd1_machine and cd1_machine.get('quantidade') == '500' and
                                    cd2_machine and cd2_machine.get('quantidade') == '750')
                
                self.log_test(
                    "Verify machine allocation quantities", 
                    correct_quantities, 
                    f"- CD1: {cd1_machine.get('quantidade') if cd1_machine else 'None'}, CD2: {cd2_machine.get('quantidade') if cd2_machine else 'None'}"
                )
            
            # Verify espula temp data
            if has_temp_espula:
                espula_temp = response['espula_data_temp']
                correct_espula_data = (espula_temp.get('mat_prima') == 'Cotton Premium' and
                                     espula_temp.get('qtde_fios') == '16' and
                                     espula_temp.get('carga') == 'TEMP001')
                
                self.log_test(
                    "Verify espula temp data details", 
                    correct_espula_data, 
                    f"- Mat Prima: {espula_temp.get('mat_prima')}, Fios: {espula_temp.get('qtde_fios')}, Carga: {espula_temp.get('carga')}"
                )
        else:
            self.log_test(
                "Retrieve ordem with temp data", 
                False, 
                f"- Status: {status}"
            )

        # Step 4: Test that another user can retrieve and edit the same temp data
        # First, login as interno user
        interno_credentials = {"username": "interno", "password": "interno123"}
        success, response, status = self.make_request('POST', 'auth/login', interno_credentials)
        
        if success and 'token' in response:
            interno_token = response['token']
            original_token = self.token
            self.token = interno_token
            
            # Retrieve the ordem as interno user
            success, response, status = self.make_request(
                'GET', 
                f'ordens-producao/{self.created_ordem_id}'
            )
            
            if success:
                can_see_temp_data = ('dados_temporarios_maquinas' in response and 
                                   len(response['dados_temporarios_maquinas']) == 2)
                
                self.log_test(
                    "Another user can see temp data", 
                    can_see_temp_data, 
                    f"- Interno user can access temp data: {can_see_temp_data}"
                )
                
                # Try to update temp data as interno user
                updated_temp_data = {
                    "dados_temporarios_maquinas": [
                        {
                            "machine_code": "CD3",
                            "machine_id": "test-machine-3", 
                            "layout_type": "16_fusos",
                            "quantidade": "1000"
                        }
                    ],
                    "espula_data": {
                        "maquina": "CD3",
                        "mat_prima": "Polyester",
                        "qtde_fios": "20",
                        "carga": "TEMP002",
                        "observacoes": "Editado por usuário interno"
                    }
                }
                
                success, response, status = self.make_request(
                    'PUT', 
                    f'ordens-producao/{self.created_ordem_id}/salvar-temporarios', 
                    updated_temp_data
                )
                
                self.log_test(
                    "Another user can edit temp data", 
                    success, 
                    f"- Interno user can edit: {success}, Status: {status}"
                )
                
                # Verify the update was saved
                if success:
                    success, response, status = self.make_request(
                        'GET', 
                        f'ordens-producao/{self.created_ordem_id}'
                    )
                    
                    if success:
                        updated_by_interno = response.get('editado_por') == 'interno'
                        has_cd3_machine = any(m.get('machine_code') == 'CD3' for m in response.get('dados_temporarios_maquinas', []))
                        
                        self.log_test(
                            "Verify temp data updated by another user", 
                            updated_by_interno and has_cd3_machine, 
                            f"- Updated by interno: {updated_by_interno}, Has CD3: {has_cd3_machine}"
                        )
            
            # Restore original token
            self.token = original_token
        
        return True

    def test_machine_queue_bug_fix(self):
        """Test machine queue bug fix - prevent production order replacement"""
        print("\n🔧 TESTING MACHINE QUEUE BUG FIX")
        
        # Step 1: Get a machine from 16_fusos layout
        success, response, status = self.make_request('GET', 'machines/16_fusos')
        
        if not success or not response:
            self.log_test("Get machines for queue test", False, f"- Status: {status}")
            return False
        
        # Use CD1 machine for testing
        test_machine = next((m for m in response if m.get('code') == 'CD1'), None)
        if not test_machine:
            self.log_test("Find CD1 machine", False, "- CD1 machine not found")
            return False
        
        machine_id = test_machine['id']
        machine_code = test_machine['code']
        
        self.log_test(
            "Find test machine", 
            True, 
            f"- Using machine {machine_code} (ID: {machine_id})"
        )

        # Step 2: Create an order and start it (machine should become vermelho)
        order_data = {
            "machine_id": machine_id,
            "cliente": "Cliente Produção Teste",
            "artigo": "Artigo em Produção",
            "cor": "Verde",
            "quantidade": "1000"
        }
        
        success, response, status = self.make_request('POST', 'orders', order_data)
        
        if success and 'id' in response:
            self.created_order_id = response['id']
            self.log_test(
                "Create order for production", 
                True, 
                f"- Order ID: {self.created_order_id}"
            )
        else:
            self.log_test(
                "Create order for production", 
                False, 
                f"- Status: {status}, Response: {response}"
            )
            return False

        # Start the order (should make machine vermelho)
        update_data = {
            "status": "em_producao",
            "observacao_liberacao": "Iniciando produção para teste",
            "laudo_final": ""
        }
        
        success, response, status = self.make_request(
            'PUT', 
            f'orders/{self.created_order_id}', 
            update_data
        )
        
        self.log_test(
            "Start order production", 
            success, 
            f"- Status: {status}"
        )

        # Verify machine status is vermelho
        success, response, status = self.make_request('GET', 'machines/16_fusos')
        
        if success:
            updated_machine = next((m for m in response if m.get('id') == machine_id), None)
            machine_status = updated_machine.get('status') if updated_machine else None
            
            self.log_test(
                "Machine status is vermelho (in production)", 
                machine_status == "vermelho", 
                f"- Status: {machine_status} (expected: vermelho)"
            )
        else:
            self.log_test("Check machine status after starting order", False, f"- Status: {status}")

        # Step 3: Create an espula with machine allocation for the same machine
        espula_data = {
            "cliente": "Cliente Espula Teste",
            "artigo": "Artigo Espula",
            "cor": "Amarelo",
            "quantidade_metros": "500",
            "carga": "ESP001",
            "data_prevista_entrega": "2025-02-20",
            "machine_allocations": [
                {
                    "machine_code": machine_code,
                    "machine_id": machine_id,
                    "layout_type": "16_fusos",
                    "quantidade": "500"
                }
            ]
        }
        
        success, response, status = self.make_request('POST', 'espulas', espula_data)
        
        if success and 'id' in response:
            self.created_espula_id = response['id']
            self.log_test(
                "Create espula with machine allocation", 
                True, 
                f"- Espula ID: {self.created_espula_id}"
            )
        else:
            self.log_test(
                "Create espula with machine allocation", 
                False, 
                f"- Status: {status}, Response: {response}"
            )
            return False

        # Step 4: Finalize the espula (this should create new orders but NOT change machine status)
        success, response, status = self.make_request(
            'POST', 
            f'espulas/{self.created_espula_id}/finalize-with-machines'
        )
        
        if success:
            orders_created = response.get('orders_created', 0)
            self.log_test(
                "Finalize espula with machines", 
                orders_created > 0, 
                f"- Orders created: {orders_created}"
            )
        else:
            self.log_test(
                "Finalize espula with machines", 
                False, 
                f"- Status: {status}, Response: {response}"
            )
            return False

        # Step 5: Verify machine status remains 'vermelho' (NOT changed to 'amarelo')
        success, response, status = self.make_request('GET', 'machines/16_fusos')
        
        if success:
            updated_machine = next((m for m in response if m.get('id') == machine_id), None)
            machine_status = updated_machine.get('status') if updated_machine else None
            
            self.log_test(
                "Machine status remains vermelho after espula finalization", 
                machine_status == "vermelho", 
                f"- Status: {machine_status} (should remain vermelho, not change to amarelo)"
            )
        else:
            self.log_test("Check machine status after espula finalization", False, f"- Status: {status}")

        # Step 6: Verify new orders are created with status 'pendente' in the queue
        success, response, status = self.make_request('GET', 'orders')
        
        if success:
            machine_orders = [o for o in response if o.get('machine_code') == machine_code]
            pending_orders = [o for o in machine_orders if o.get('status') == 'pendente']
            production_orders = [o for o in machine_orders if o.get('status') == 'em_producao']
            
            has_pending = len(pending_orders) > 0
            has_production = len(production_orders) == 1  # Should be exactly 1 (our original order)
            
            self.log_test(
                "New orders created as pendente in queue", 
                has_pending and has_production, 
                f"- Pending: {len(pending_orders)}, In production: {len(production_orders)}"
            )
        else:
            self.log_test("Check orders in machine queue", False, f"- Status: {status}")

        # Step 7: Finish the production order
        finish_data = {
            "status": "finalizado",
            "observacao_liberacao": "Produção finalizada",
            "laudo_final": "Produto aprovado"
        }
        
        success, response, status = self.make_request(
            'PUT', 
            f'orders/{self.created_order_id}', 
            finish_data
        )
        
        self.log_test(
            "Finish production order", 
            success, 
            f"- Status: {status}"
        )

        # Step 8: Verify machine status changes to 'amarelo' (has pending orders)
        success, response, status = self.make_request('GET', 'machines/16_fusos')
        
        if success:
            updated_machine = next((m for m in response if m.get('id') == machine_id), None)
            machine_status = updated_machine.get('status') if updated_machine else None
            
            self.log_test(
                "Machine status changes to amarelo after finishing production", 
                machine_status == "amarelo", 
                f"- Status: {machine_status} (should be amarelo - has pending orders)"
            )
        else:
            self.log_test("Check final machine status", False, f"- Status: {status}")

        return True

    def run_all_tests(self):
        """Run all new feature tests"""
        print("🚀 STARTING NEW FEATURES TESTING")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        if not self.authenticate():
            print("❌ Authentication failed, cannot continue")
            return 1
        
        # Test the two new features
        self.test_temporary_data_save()
        self.test_machine_queue_bug_fix()
        
        print("\n" + "=" * 60)
        print(f"📊 NEW FEATURES TEST RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All new feature tests passed!")
            return 0
        else:
            print(f"⚠️ {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = NewFeaturesTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())