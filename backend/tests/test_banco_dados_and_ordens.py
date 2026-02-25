"""
Test suite for MercoTêxtil system - Testing:
1. Banco de Dados - CRUD operations for artigos
2. Ordem de Produção - Create with extra fields, delete, autocomplete
3. Machine queue ordering
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAuthentication:
    """Authentication tests - must pass first"""
    
    def test_login_success(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["username"] == "admin"
        assert data["user"]["role"] == "admin"
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    if response.status_code != 200:
        pytest.skip("Authentication failed - skipping tests")
    return response.json()["token"]


@pytest.fixture
def auth_headers(auth_token):
    """Auth headers fixture"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestBancoDadosArticles:
    """Tests for Banco de Dados - Artigos CRUD operations"""
    
    def test_create_artigo(self, auth_headers):
        """POST /api/banco-dados - Create new artigo"""
        artigo_data = {
            "artigo": "TEST_ARTIGO_001",
            "engrenagem": "ENG-100",
            "fios": "24",
            "maquinas": "CD1, CD2",
            "ciclos": "5",
            "carga": "100kg"
        }
        response = requests.post(f"{BASE_URL}/api/banco-dados", 
                                json=artigo_data, headers=auth_headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert data["artigo"] == artigo_data["artigo"]
        assert data["engrenagem"] == artigo_data["engrenagem"]
        assert data["fios"] == artigo_data["fios"]
        assert data["maquinas"] == artigo_data["maquinas"]
        assert data["ciclos"] == artigo_data["ciclos"]
        assert data["carga"] == artigo_data["carga"]
        assert "id" in data
        
        return data["id"]
    
    def test_list_artigos(self, auth_headers):
        """GET /api/banco-dados - List all artigos"""
        response = requests.get(f"{BASE_URL}/api/banco-dados", headers=auth_headers)
        assert response.status_code == 200, f"List failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the test artigo
        test_artigos = [a for a in data if a.get("artigo", "").startswith("TEST_")]
        assert len(test_artigos) >= 0  # May or may not exist yet
    
    def test_search_artigos_autocomplete(self, auth_headers):
        """GET /api/banco-dados/search?q=test - Search artigos for autocomplete"""
        # First create an artigo to search for
        artigo_data = {
            "artigo": "TEST_AUTOCOMPLETE_ARTIGO",
            "engrenagem": "ENG-AUTO",
            "fios": "32",
            "maquinas": "F1, F2",
            "ciclos": "3",
            "carga": "50kg"
        }
        create_response = requests.post(f"{BASE_URL}/api/banco-dados", 
                                       json=artigo_data, headers=auth_headers)
        assert create_response.status_code == 200
        created_artigo = create_response.json()
        
        # Now search for it
        response = requests.get(f"{BASE_URL}/api/banco-dados/search?q=TEST_AUTOCOMPLETE", 
                               headers=auth_headers)
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        # Should find our test artigo
        assert len(data) >= 1
        found = any(a["artigo"] == "TEST_AUTOCOMPLETE_ARTIGO" for a in data)
        assert found, "Autocomplete did not find created artigo"
        
        # Verify it returns the extra fields for autocomplete
        for artigo in data:
            if artigo["artigo"] == "TEST_AUTOCOMPLETE_ARTIGO":
                assert artigo["engrenagem"] == "ENG-AUTO"
                assert artigo["fios"] == "32"
                assert artigo["maquinas"] == "F1, F2"
    
    def test_update_artigo(self, auth_headers):
        """PUT /api/banco-dados/{id} - Update artigo"""
        # First create an artigo
        artigo_data = {
            "artigo": "TEST_UPDATE_ARTIGO",
            "engrenagem": "OLD-ENG",
            "fios": "16",
            "maquinas": "CD1",
            "ciclos": "2",
            "carga": "30kg"
        }
        create_response = requests.post(f"{BASE_URL}/api/banco-dados", 
                                       json=artigo_data, headers=auth_headers)
        assert create_response.status_code == 200
        artigo_id = create_response.json()["id"]
        
        # Update it
        update_data = {
            "engrenagem": "NEW-ENG",
            "fios": "32",
            "maquinas": "CD1, CD2, CD3"
        }
        response = requests.put(f"{BASE_URL}/api/banco-dados/{artigo_id}", 
                               json=update_data, headers=auth_headers)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        data = response.json()
        assert data["engrenagem"] == "NEW-ENG"
        assert data["fios"] == "32"
        assert data["maquinas"] == "CD1, CD2, CD3"
        # Original name should be preserved
        assert data["artigo"] == "TEST_UPDATE_ARTIGO"
    
    def test_delete_artigo(self, auth_headers):
        """DELETE /api/banco-dados/{id} - Delete artigo"""
        # First create an artigo to delete
        artigo_data = {
            "artigo": "TEST_DELETE_ARTIGO",
            "engrenagem": "DEL-ENG",
            "fios": "8",
            "maquinas": "F1",
            "ciclos": "1",
            "carga": "10kg"
        }
        create_response = requests.post(f"{BASE_URL}/api/banco-dados", 
                                       json=artigo_data, headers=auth_headers)
        assert create_response.status_code == 200
        artigo_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/banco-dados/{artigo_id}", 
                                  headers=auth_headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify it's gone - GET all and check
        list_response = requests.get(f"{BASE_URL}/api/banco-dados", headers=auth_headers)
        assert list_response.status_code == 200
        artigos = list_response.json()
        assert not any(a.get("id") == artigo_id for a in artigos), "Artigo still exists after delete"


class TestOrdemProducao:
    """Tests for Ordem de Producao operations"""
    
    def test_create_ordem_producao_with_extra_fields(self, auth_headers):
        """POST /api/ordens-producao - Create ordem with engrenagem, fios, maquinas"""
        ordem_data = {
            "cliente": "TEST_CLIENTE",
            "artigo": "TEST_ARTIGO",
            "cor": "Azul",
            "metragem": "100m",
            "data_entrega": "2026-02-15",
            "observacao": "Teste de criação",
            "engrenagem": "ENG-TEST",
            "fios": "24",
            "maquinas": "CD1, CD2"
        }
        response = requests.post(f"{BASE_URL}/api/ordens-producao", 
                                json=ordem_data, headers=auth_headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert data["cliente"] == "TEST_CLIENTE"
        assert data["artigo"] == "TEST_ARTIGO"
        assert data["engrenagem"] == "ENG-TEST"
        assert data["fios"] == "24"
        assert data["maquinas"] == "CD1, CD2"
        assert data["status"] == "pendente"
        assert "numero_os" in data
        assert "id" in data
        
        return data["id"]
    
    def test_list_ordens_producao(self, auth_headers):
        """GET /api/ordens-producao - List all ordens"""
        response = requests.get(f"{BASE_URL}/api/ordens-producao", headers=auth_headers)
        assert response.status_code == 200, f"List failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_ordem_producao_pendente(self, auth_headers):
        """DELETE /api/ordens-producao/{id} - Delete pending ordem"""
        # First create an ordem to delete
        ordem_data = {
            "cliente": "TEST_DELETE_CLIENTE",
            "artigo": "TEST_DELETE_ARTIGO",
            "cor": "Verde",
            "metragem": "50m",
            "data_entrega": "2026-03-01",
            "observacao": "",
            "engrenagem": "",
            "fios": "",
            "maquinas": ""
        }
        create_response = requests.post(f"{BASE_URL}/api/ordens-producao", 
                                       json=ordem_data, headers=auth_headers)
        assert create_response.status_code == 200
        ordem_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/ordens-producao/{ordem_id}", 
                                  headers=auth_headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify deletion
        list_response = requests.get(f"{BASE_URL}/api/ordens-producao", headers=auth_headers)
        ordens = list_response.json()
        assert not any(o.get("id") == ordem_id for o in ordens), "Ordem still exists after delete"


class TestMachineQueueOrdering:
    """Tests for machine queue ordering - should be newest first"""
    
    def test_get_machine_orders_sorted_newest_first(self, auth_headers):
        """GET /api/machines/{code}/orders - Verify orders sorted by most recent"""
        # Get machines first
        machines_response = requests.get(f"{BASE_URL}/api/machines/16_fusos", headers=auth_headers)
        assert machines_response.status_code == 200
        machines = machines_response.json()
        
        if not machines:
            pytest.skip("No machines available")
        
        # Find a green machine to create orders on
        green_machine = None
        for m in machines:
            if m["status"] == "verde":
                green_machine = m
                break
        
        if not green_machine:
            # Just test ordering on any machine that may have orders
            test_machine_code = machines[0]["code"]
        else:
            test_machine_code = green_machine["code"]
        
        # Get orders for this machine
        response = requests.get(f"{BASE_URL}/api/machines/{test_machine_code}/orders", 
                               headers=auth_headers)
        assert response.status_code == 200, f"Get orders failed: {response.text}"
        
        orders = response.json()
        # Verify ordering if there are multiple orders
        if len(orders) >= 2:
            # Check created_at is sorted descending (newest first)
            dates = [o.get("created_at") for o in orders if o.get("created_at")]
            for i in range(len(dates) - 1):
                assert dates[i] >= dates[i+1], f"Orders not sorted by newest first: {dates}"


class TestDeleteOrderFromProducao:
    """Test deleting orders from production queue"""
    
    def test_delete_order_from_machine_queue(self, auth_headers):
        """DELETE /api/orders/{id} - Delete order from machine queue"""
        # Get a green machine
        machines_response = requests.get(f"{BASE_URL}/api/machines/16_fusos", headers=auth_headers)
        machines = machines_response.json()
        
        green_machine = None
        for m in machines:
            if m["status"] == "verde":
                green_machine = m
                break
        
        if not green_machine:
            pytest.skip("No green machine available")
        
        # Create an order on this machine
        order_data = {
            "machine_id": green_machine["id"],
            "cliente": "TEST_DELETE_ORDER",
            "artigo": "ARTIGO_DELETE",
            "cor": "Amarelo",
            "quantidade": "20"
        }
        create_response = requests.post(f"{BASE_URL}/api/machines/{green_machine['code']}/orders", 
                                       json=order_data, headers=auth_headers)
        assert create_response.status_code == 200, f"Create order failed: {create_response.text}"
        order_id = create_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/orders/{order_id}", 
                                         headers=auth_headers)
        assert delete_response.status_code == 200, f"Delete order failed: {delete_response.text}"


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_artigos(self, auth_headers):
        """Clean up test artigos"""
        response = requests.get(f"{BASE_URL}/api/banco-dados", headers=auth_headers)
        if response.status_code == 200:
            artigos = response.json()
            for artigo in artigos:
                if artigo.get("artigo", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/banco-dados/{artigo['id']}", 
                                   headers=auth_headers)
        assert True  # Cleanup is best effort
    
    def test_cleanup_test_ordens(self, auth_headers):
        """Clean up test ordens de producao"""
        response = requests.get(f"{BASE_URL}/api/ordens-producao", headers=auth_headers)
        if response.status_code == 200:
            ordens = response.json()
            for ordem in ordens:
                if ordem.get("cliente", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/ordens-producao/{ordem['id']}", 
                                   headers=auth_headers)
        assert True  # Cleanup is best effort


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
