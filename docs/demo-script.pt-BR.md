# Roteiro de demonstração do ERP Next

Duração alvo: 3–4 minutos. Use empresa e dados fictícios. Nunca mostre variáveis de ambiente, consoles dos provedores, tokens, e-mail pessoal ou gerenciador de senhas.

## Antes de gravar

- Aqueça a API pública abrindo o health check.
- Confirme que o usuário de demonstração acessa todas as telas do roteiro.
- Prepare fornecedor, cliente, produto, depósito e endereço de estoque fictícios.
- Feche abas e notificações; use proporção 16:9 e zoom legível.
- Oculte dados sensíveis e mantenha apenas informações comerciais inventadas.

## Narrativa

**0:00–0:25 — Contexto.** Abra o dashboard e explique que acesso, cadastros, estoque, compras, vendas, financeiro e analytics compartilham uma sessão limitada à empresa.

**0:25–0:50 — Acesso.** Mostre usuários ou papéis. A interface reflete permissões por usabilidade, mas os guards da API formam a barreira de segurança.

**0:50–1:25 — Compras.** Abra um pedido e o histórico de recebimentos. Explique recebimento parcial/múltiplo, idempotência e a transação que altera pedido, movimentos e saldo físico em conjunto.

**1:25–2:05 — Estoque e vendas.** Mostre o saldo do produto e um pedido de venda. Diferencie físico, reservado e disponível. A reserva compromete disponibilidade; a expedição cria a saída física.

**2:05–2:35 — Financeiro.** Mostre um título e uma baixa parcial. Explique baixas imutáveis e fluxo previsto versus realizado.

**2:35–3:05 — Indicadores.** Volte ao dashboard e aos relatórios, altere o período e relacione os números aos registros operacionais persistidos.

**3:05–3:35 — Engenharia.** Mostre README ou CI: Next.js, NestJS, Prisma/PostgreSQL, multiempresa, RBAC, auditoria, testes com PostgreSQL real, Docker e entrega automatizada.

**3:35–3:50 — Encerramento honesto.** Cite regras fiscais/contábeis, MFA, throttling distribuído, WMS avançado e backup automatizado como evoluções.

## Checklist da gravação

- O primeiro quadro explica o produto mesmo sem áudio.
- Nenhum segredo, dado real, cold start ou tela quebrada aparece.
- Cada tela sustenta uma frase; evite percorrer CRUDs completos.
- Movimento do cursor é intencional e a narração descreve decisões reais.
- Termine com aplicação e repositório e assista ao vídeo exportado uma vez.
