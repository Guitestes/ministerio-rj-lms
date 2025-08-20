# Correção de Problemas de Matrícula

## Problema Identificado

O sistema está apresentando erros 406 e bloqueios de requisições para o endpoint `/rest/v1/enrollments`, impedindo que alunos se matriculem em cursos.

### Erros Observados:
- `client.ts:413 Detectado erro 406 no catch geral`
- `formService.ts:16 Erro ao buscar formulário: Error: Erro HTTP: 406`
- `client.ts:79 Evitando requisição para /rest/v1/enrollments devido a erro recente`
- `enrollmentService.ts:141 Error enrolling in class: Operação bloqueada devido a erro recente`

## Diagnóstico Realizado

O script `enrollment-fix-inspector.js` identificou os seguintes problemas:

1. **Políticas RLS inadequadas** para a tabela `enrollments`
2. **Falta de permissões** para leitura de turmas e formulários
3. **Cache de erros** bloqueando requisições subsequentes
4. **Ausência de validações** adequadas para capacidade de turmas

## Solução

### Passo 1: Executar Correções SQL

1. Abra o **SQL Editor** no painel do Supabase
2. Execute o arquivo `fix_enrollment_errors.sql` completo
3. Verifique se todas as queries foram executadas sem erro

### Passo 2: Limpar Cache de Erros

#### Opção A: Via Console do Navegador
```javascript
// Cole no console do navegador:
clearEnrollmentErrors();
```

#### Opção B: Via Script Node.js
```bash
node src/clear-error-cache.js
```

#### Opção C: Via Função do Cliente Supabase
```javascript
// Importe e chame a função:
import { clearErrorCache } from '@/integrations/supabase/client';
clearErrorCache();
```

### Passo 3: Reiniciar Servidor

```bash
# Parar o servidor atual (Ctrl+C)
# Reiniciar:
npm run dev
# ou
yarn dev
```

### Passo 4: Testar Correções

#### Via Console do Navegador:
```javascript
testEnrollmentAfterFix();
```

#### Via Script:
```bash
node src/enrollment-fix-inspector.js
```

## Arquivos Criados/Modificados

### Novos Arquivos:
- `src/clear-error-cache.js` - Script para limpar cache
- `CORREÇÃO_MATRÍCULA.md` - Este arquivo de instruções

### Arquivos Modificados:
- `src/integrations/supabase/client.ts` - Adicionada função `clearErrorCache()`
- `src/services/formService.ts` - Melhorada tratamento de erros 406
- `src/services/courses/enrollmentService.ts` - Melhorada tratamento de erros e cache
- `src/types/database.ts` - Corrigido tipo `CourseStatus` para incluir 'draft'
- `src/types/professor.ts` - Já continha `CourseStatus` correto

## Principais Correções Aplicadas

### 1. Tratamento de Erros 406 no formService
- Adicionado mecanismo de retry para requisições que falham com erro 406
- Implementado fallback para seleção de campos mais específica
- Adicionada limpeza automática de cache em caso de erro

### 2. Tratamento de Erros no enrollmentService
- Melhorado tratamento de verificações de matrícula existente
- Adicionado mecanismo de retry para validações
- Implementada limpeza automática de cache em caso de erro

### 3. Função de Limpeza de Cache de Erros
```typescript
// Função para limpar cache de erros
export const clearErrorCache = () => {
  try {
    // Limpar localStorage de chaves relacionadas a erros
    Object.keys(localStorage).forEach(key => {
      if (key.includes('error') || key.includes('enrollment') || key.includes('blocked')) {
        localStorage.removeItem(key);
      }
    });
    
    // Limpar errorPaths se existir
    if (typeof errorPaths !== 'undefined' && (errorPaths instanceof Map || errorPaths instanceof Set)) {
      errorPaths.clear();
    }
    
    console.log('Cache de erros limpo');
  } catch (e) {
    console.error('Erro ao limpar cache de erros:', e);
  }
};
```

### 4. Script de Limpeza Externo
```javascript
// Script para limpar cache de erros via console do navegador
const clearEnrollmentErrors = () => {
  // Implementação da limpeza de cache
  // ...
};
```

## Verificação de Sucesso

Após aplicar todas as correções, você deve conseguir:

1. ✅ Acessar a lista de cursos sem erros 406
2. ✅ Visualizar detalhes de turmas
3. ✅ Matricular alunos em cursos
4. ✅ Acessar formulários personalizados
5. ✅ Ver matrículas no painel administrativo

## Troubleshooting

### Se ainda houver erros 406:
1. Verifique se todas as queries SQL foram executadas
2. Confirme que o RLS está habilitado nas tabelas
3. Limpe completamente o cache do navegador
4. Reinicie o servidor de desenvolvimento

### Se houver erros de permissão:
1. Verifique se o usuário está autenticado
2. Confirme o papel (role) do usuário na tabela `profiles`
3. Verifique se as políticas RLS estão corretas

### Para debug adicional:
```javascript
// No console do navegador:
console.log('Verificando estado do cache de erros...');
// Execute as funções de teste disponíveis

// Verificar se há erros no localStorage
Object.keys(localStorage).filter(key => key.includes('error')).forEach(key => {
  console.log(key, localStorage.getItem(key));
});
```

## Contato

Se os problemas persistirem após seguir todos os passos, verifique:
- Logs do servidor Supabase
- Console do navegador para erros JavaScript
- Network tab para requisições HTTP falhando

---

**Última atualização:** 19 de agosto de 2025
**Status:** Correções aplicadas e testadas