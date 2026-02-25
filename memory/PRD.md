# MercoTêxtil - Sistema de Controle de Máquinas

## Descrição do Produto
Sistema de gerenciamento de produção têxtil que permite controlar máquinas de produção, ordens de serviço, espulagem e relatórios.

## Stack Tecnológico
- **Frontend**: React, Tailwind CSS, ShadCN UI
- **Backend**: FastAPI, Motor (async MongoDB driver), Pydantic
- **Banco de Dados**: MongoDB
- **Exportação**: xlsx-js-style para relatórios Excel estilizados

## Funcionalidades Principais

### Dashboard
- Visualização de status das máquinas (16 fusos e 32 fusos)
- Sistema de cores: verde (disponível), amarelo (pendente), vermelho (em produção), azul (manutenção), cinza (desativada)
- Fila de pedidos por máquina ordenada por mais novos primeiro

### Ordem de Produção
- Criação de ordens de serviço (OS) com numeração sequencial
- **Autocomplete de artigos**: Ao digitar no campo artigo, o sistema sugere artigos do Banco de Dados
- **Preenchimento automático**: Ao selecionar um artigo, os campos engrenagem, fios e máquinas são preenchidos automaticamente
- **Excluir ordem pendente**: Botão de exclusão visível apenas para ordens com status "pendente"

### Banco de Dados (Artigos)
- CRUD completo de artigos
- Campos: artigo, engrenagem, fios, máquinas, ciclos, carga
- Busca por nome para autocomplete

### Espulagem
- Controle de espulagem com alocação de máquinas
- Cargas e frações dinâmicas
- Edição de máquinas alocadas em espulagens ativas

### Relatórios
- Exportação de relatórios para Excel com formatação avançada
- Cores e estilos personalizados
- Remoção de linhas vazias

### Administração
- Gerenciamento de usuários
- Permissões por aba
- Roles: admin, operador_interno, operador_externo

## Endpoints API Principais

### Banco de Dados
- `POST /api/banco-dados` - Criar artigo
- `GET /api/banco-dados` - Listar artigos
- `GET /api/banco-dados/search?q={term}` - Buscar artigos (autocomplete)
- `PUT /api/banco-dados/{id}` - Atualizar artigo
- `DELETE /api/banco-dados/{id}` - Excluir artigo

### Ordens de Produção
- `POST /api/ordens-producao` - Criar ordem
- `GET /api/ordens-producao` - Listar ordens
- `DELETE /api/ordens-producao/{id}` - Excluir ordem

### Máquinas
- `GET /api/machines/{code}/orders` - Fila de pedidos (ordenado por mais novos)

## O Que Foi Implementado (25/02/2026)

### Correções
- Corrigido erro de sintaxe no backend (server.py linha 1082)
- Campos ciclos e carga do modelo ArtigoBancoDados alterados para ter valor default

### Novas Funcionalidades
1. **Autocomplete na Ordem de Produção**
   - Campo artigo com sugestões em tempo real
   - Preenchimento automático de engrenagem, fios e máquinas
   
2. **Excluir Ordem de Produção**
   - Botão "Excluir Ordem" visível apenas em ordens pendentes
   - Endpoint DELETE /api/ordens-producao/{id}

3. **Ordenação da Fila de Máquinas**
   - Pedidos ordenados por mais novos primeiro

## Credenciais de Teste
- **Admin**: admin / admin123
- **Interno**: interno / interno123
- **Externo**: externo / externo123

## Arquivos Principais
- `/app/backend/server.py` - Backend completo
- `/app/frontend/src/App.js` - Frontend monolítico (necessita refatoração)

## Tarefas Futuras/Backlog
1. **Refatoração**: Dividir App.js em componentes menores (BancoDadosPanel.js, OrdemProducaoPanel.js, etc.)
2. **Acessibilidade**: Adicionar aria-describedby aos DialogContent
