import { createClient } from '@supabase/supabase-js';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Supabase config
const supabaseUrl = 'https://ynbbpcurdsbijxaazive.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Truncado por segurança
const supabase = createClient(supabaseUrl, serviceRoleKey, { db: { schema: 'public' } });

// MCP Server
const server = new McpServer({
  name: "solicitacoes-debugger",
  version: "1.0.0",
});

// Função principal de teste do fluxo
async function testSolicitacoesFluxo() {
  try {
    const { data: alunos, error: alunoError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'aluno')
      .limit(1);

    if (alunoError || !alunos || alunos.length === 0) {
      return { erro: 'Nenhum aluno encontrado ou erro ao buscar aluno.' };
    }

    const aluno = alunos[0];

    // Inserir uma solicitação como o aluno
    const novaSolicitacao = {
      user_id: aluno.id,
      request_type: 'teste',
      subject: 'Teste de visualização do aluno',
      description: 'Criada via script para testar RLS',
      status: 'open'
    };

    const { data: solicitacaoCriada, error: insertError } = await supabase
      .from('administrative_requests')
      .insert(novaSolicitacao)
      .select();

    if (insertError) {
      return { erro: 'Erro ao inserir solicitação.', detalhe: insertError.message };
    }

    const createdId = solicitacaoCriada?.[0]?.id;

    // Agora tentar ler a solicitação como se fosse o aluno (usando anon key)
    const anonClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'); // anon key real aqui
    const { data: visiveisParaAluno, error: readError } = await anonClient
      .from('administrative_requests')
      .select('*')
      .eq('user_id', aluno.id);

    // Deleta a solicitação de teste depois
    await supabase.from('administrative_requests').delete().eq('id', createdId);

    if (readError) {
      return { erro: 'Erro ao ler solicitações como aluno.', detalhe: readError.message };
    }

    const visiveis = visiveisParaAluno?.map((s: any) => ({
      id: s.id,
      assunto: s.subject,
      status: s.status
    })) || [];

    return {
      sucesso: true,
      aluno: aluno.email,
      visualizou: visiveis.length > 0,
      solicitacoes: visiveis
    };
  } catch (e) {
    return { erro: 'Erro inesperado', detalhe: e.message };
  }
}

// Tool de diagnóstico
server.registerTool(
  "debug_solicitacoes_fluxo",
  {
    title: "Debug Fluxo de Solicitações",
    description: "Verifica se o aluno consegue visualizar as próprias solicitações.",
    inputSchema: z.object({}),
    outputSchema: z.object({
      content: z.array(z.object({ type: z.string(), text: z.string() }))
    }),
  },
  async () => {
    const resultado = await testSolicitacoesFluxo();
    if (resultado.erro) {
      return {
        content: [{ type: "text", text: `Erro: ${resultado.erro}\nDetalhe: ${resultado.detalhe || ''}` }]
      };
    }

    return {
      content: [
        { type: "text", text: `Aluno: ${resultado.aluno}` },
        { type: "text", text: `Solicitações visíveis para ele: ${resultado.visualizou ? 'SIM' : 'NÃO'}` },
        ...resultado.solicitacoes.map((s: any) => ({
          type: "text", text: ` - ID: ${s.id}, Assunto: ${s.assunto}, Status: ${s.status}`
        }))
      ]
    };
  }
);

// Iniciar servidor MCP
async function startServer() {
  console.log('Iniciando MCP...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('Servidor MCP conectado');
}

startServer().catch(console.error);
