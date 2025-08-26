# Módulo Financeiro - OneEduca

Este diretório contém os scripts SQL para implementação completa do módulo de gestão financeira do sistema OneEduca.

## Estrutura dos Scripts

### 01_create_missing_financial_tables.sql
**Objetivo**: Criação de novas tabelas financeiras essenciais

**Tabelas criadas**:
- `invoices`: Gestão de notas fiscais eletrônicas
- `financial_declarations`: Declarações financeiras (ex: "nada consta")
- `payment_reminders`: Sistema de lembretes de pagamento
- `financial_batches`: Operações financeiras em lote

### 02_enhance_bank_slips.sql
**Objetivo**: Melhorias na tabela de boletos bancários

**Funcionalidades adicionadas**:
- Processamento em lote de boletos
- Envio automático por email
- Múltiplos métodos de pagamento (PIX, cartão, etc.)
- Cálculo automático de juros e multas
- Integração bancária

### 03_financial_policies.sql
**Objetivo**: Implementação de políticas de segurança (RLS)

**Características**:
- Controle de acesso baseado em perfis
- Políticas específicas para cada tipo de usuário
- Funções auxiliares para verificação de permissões

### 04_financial_reports.sql
**Objetivo**: Sistema completo de relatórios financeiros

**Relatórios disponíveis**:
- Balanço financeiro por período
- Resumo financeiro com agrupamentos
- Relatório de quitação de débitos
- Previsão de receitas e despesas
- Análise de inadimplência por turma
- Dashboard executivo

### 05_automatic_billing_services.sql
**Objetivo**: Serviços de cobrança automática e integração bancária

**Funcionalidades**:
- Configuração personalizada de cobrança por usuário
- Templates de mensagens (email/SMS)
- Log de notificações enviadas
- Integração com sistemas bancários
- Processamento automático de cobranças

### 06_financial_utilities.sql
**Objetivo**: Funções auxiliares e utilitários

**Funcionalidades**:
- Cadastro em lote de dados financeiros
- Geração de declarações "nada consta"
- Cálculo de juros e multas
- Processamento de pagamentos
- Backup de dados financeiros
- Dashboard financeiro

## Requisitos Atendidos

### 3.4.1 Serviço de Cadastro
✅ **3.3.1.1**: Cadastro de dados financeiros (individual e lote)
- Função `bulk_register_student_financial_data()`
- Tabela `financial_data` aprimorada

✅ **3.3.1.2**: Cadastro de recebimentos e pagamentos (individual e lote)
- Tabela `financial_transactions` existente
- Função `generate_bank_slips_batch()`

✅ **3.3.1.3**: Cadastro de bolsistas em lote
- Função `bulk_register_scholarship_students()`
- Tabela `profile_scholarships` existente

### 3.4.2 Serviço de Emissão de Documentos
✅ **3.3.2.1**: Contratos de prestação de serviço
- Função `generate_service_contract()`
- Tabela `contracts` existente

✅ **3.3.2.2**: Boletos bancários com envio por email
- Tabela `bank_slips` aprimorada
- Função `send_bank_slips_batch()`
- Sistema de templates de email

✅ **3.3.2.3**: Nota fiscal eletrônica
- Tabela `invoices`
- Campos para dados fiscais completos

✅ **3.3.2.4**: Declarações financeiras
- Tabela `financial_declarations`
- Função `generate_nothing_owed_declaration()`

### 3.4.3 Serviço de Relatórios
✅ **3.3.3.1**: Balanço de recebimentos e pagamentos
- Função `get_financial_balance_report()`

✅ **3.3.3.2**: Resumo financeiro por período
- Função `get_financial_summary_report()`

✅ **3.3.3.3**: Quitação de débitos
- Função `get_debt_settlement_report()`

✅ **3.3.3.4**: Previsão de despesas e receitas
- Função `get_financial_forecast()`

✅ **3.3.3.5**: Inadimplência das turmas
- Função `get_class_delinquency_report()`

### 3.4.4 Serviços Adicionais
✅ **3.3.4.1**: Cobrança automática (SMS/email)
- Função `process_automatic_billing()`
- Sistema de templates personalizáveis
- Log de notificações

✅ **3.3.4.2**: Integração bancária
- Tabela `bank_integrations` aprimorada
- Função `sync_bank_payments()`
- Suporte a webhooks

## Ordem de Execução

Execute os scripts na seguinte ordem:

1. `01_create_missing_financial_tables.sql`
2. `02_enhance_bank_slips.sql`
3. `03_financial_policies.sql`
4. `04_financial_reports.sql`
5. `05_automatic_billing_services.sql`
6. `06_financial_utilities.sql`

## Funcionalidades Principais

### Gestão de Boletos
- Geração individual e em lote
- Cálculo automático de juros e multas
- Envio por email com templates personalizáveis
- Suporte a múltiplos métodos de pagamento
- Integração com sistemas bancários

### Relatórios Financeiros
- Dashboard executivo com métricas principais
- Relatórios detalhados por período
- Análise de inadimplência
- Previsões financeiras baseadas em histórico

### Cobrança Automática
- Configuração personalizada por usuário
- Envio automático de lembretes
- Templates de mensagem customizáveis
- Log completo de notificações

### Segurança
- Row Level Security (RLS) implementado
- Controle de acesso baseado em perfis
- Auditoria de operações financeiras

### Integração Bancária
- Sincronização automática de pagamentos
- Suporte a webhooks
- Configuração flexível por banco
- Tratamento de erros e retry automático

## Observações Técnicas

- Todos os scripts são idempotentes (podem ser executados múltiplas vezes)
- Utilizam transações para garantir consistência
- Incluem tratamento de erros adequado
- Seguem as melhores práticas de segurança do PostgreSQL
- Otimizados com índices apropriados

## Suporte

Para dúvidas sobre implementação ou uso das funcionalidades, consulte a documentação técnica ou entre em contato com a equipe de desenvolvimento.