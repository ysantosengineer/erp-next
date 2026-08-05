# Instruções operacionais para o Codex

`AGENTS.md` é a instrução prioritária deste repositório. Os arquivos em `docs` são a fonte de verdade do produto e devem ser consultados antes de implementar.

## Antes de implementar

1. Ler `01-visao-geral.md` e os documentos específicos da funcionalidade, especialmente `02-requisitos.md`, `03-arquitetura.md`, `05-api.md` e `06-padroes.md`.
2. Verificar implementações, testes e contratos já existentes.
3. Apresentar um plano curto e apontar conflitos documentais antes de mudar o código.
4. Não alterar arquitetura ou adicionar dependência sem justificativa explícita.

## Durante a implementação

- Usar TypeScript com tipagem forte, validação de entradas e separação entre controller, serviço e persistência.
- Aplicar SOLID quando reduzir acoplamento ou melhorar manutenção, sem criar abstrações desnecessárias.
- Atualizar OpenAPI, testes e documentação quando o contrato ou regra de negócio mudar.
- Não expor entidades de banco, segredos, hashes ou tokens.

## Depois da implementação

1. Executar lint, verificação de tipos e testes relacionados.
2. Informar arquivos modificados, decisões técnicas, verificações executadas e limitações/erros encontrados.
