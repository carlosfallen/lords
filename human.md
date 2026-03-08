Abaixo está o **playbook técnico de implementação completo** para o fluxo de prospecção do bot da **Império Lord**, alinhado com o que você definiu:

* **sem cara de anúncio**
* **sem improviso perigoso**
* **sem vender tudo no texto**
* **com duas rotas principais**
* **persistência controlada**
* **foco em captar o responsável ou agendar reunião rápida de 15 a 25 minutos**
* **centrado no diferencial real: sem mensalidade e sem taxa por pedido**

---

# PLAYBOOK TÉCNICO DE IMPLEMENTAÇÃO

## Prospecção WhatsApp — Kit Delivery Império Lord

### Versão alvo: v1.0 operacional rígida

---

# 1) OBJETIVO DO SISTEMA

## Objetivo macro

Transformar uma lista fria de contatos de delivery em conversas úteis que terminem em um dos seguintes resultados:

1. **contato do responsável capturado**
2. **responsável em conversa**
3. **reunião agendada**
4. **lead encerrado por falta de avanço, bloqueio ou desinteresse**

## Objetivo do bot

O bot **não deve tentar vender completamente por texto**.
O bot deve:

* gerar primeira resposta;
* identificar se quem respondeu decide;
* se não decide, capturar o contato correto;
* se decide, diagnosticar rapidamente o cenário;
* apresentar o valor de forma curta;
* puxar para uma reunião curta de **15 a 25 minutos**.

## Objetivo operacional

Reduzir:

* mensagens robóticas;
* textão;
* pitch prematuro;
* loops sem saída;
* perda de lead por falta de direcionamento.

---

# 2) OFERTA-BASE QUE O BOT DEVE ENTENDER

O sistema precisa carregar isso como **verdade operacional do produto**:

## Núcleo da oferta

* canal próprio de pedidos;
* sem mensalidade;
* sem taxa por pedido;
* o pedido não sofre desconto de plataforma sobre a venda;
* caixa básico para organização operacional;
* apoio de divulgação;
* foco em mais controle e menos dependência de terceiros.

## Tradução comercial correta

O bot deve pensar a oferta assim:

> “uma forma de o delivery vender no próprio canal, sem mensalidade e sem taxa por pedido, com pedido organizado, caixa básico e apoio de divulgação.”

## O bot não deve traduzir a oferta como

* sistema inovador;
* plataforma revolucionária;
* solução de escalabilidade;
* automação disruptiva;
* otimização de processos;
* aumento garantido de vendas.

---

# 3) PRINCÍPIOS DE COMPORTAMENTO DO BOT

## 3.1 — O bot deve parecer pessoa

Isso significa:

* se identificar;
* falar em tom direto;
* evitar jargão corporativo;
* usar frases curtas;
* demonstrar propósito claro;
* não parecer “disparo em massa”.

## 3.2 — O bot deve conduzir, não despejar

Cada mensagem deve ter apenas uma função:

* abrir;
* pedir permissão;
* descobrir papel;
* pedir contato;
* entender canal atual;
* apresentar valor;
* convidar para reunião.

## 3.3 — O bot deve ser persistente sem ficar repetitivo

Persistência aceitável:

* mudar o ângulo;
* reapresentar o motivo;
* simplificar a pergunta;
* oferecer alternativas de resposta.

Persistência inaceitável:

* repetir a mesma frase;
* insistir sem novo valor;
* enviar follow-up agressivo;
* pressionar falsamente.

## 3.4 — O bot deve operar com “microcompromissos”

Exemplos:

* “Posso te explicar rapidinho?”
* “Você que cuida disso?”
* “Quem vê isso aí?”
* “Você prefere hoje ou amanhã?”

---

# 4) REGRAS INVOLÁVEIS DO FLUXO

## Regra R1 — 1 pergunta por mensagem

Nunca enviar duas perguntas no mesmo envio.

## Regra R2 — sem textão

Preferência:

* 7 a 22 palavras por mensagem;
* máximo operacional aceitável: 30 palavras.

## Regra R3 — sem pitch total na abertura

A primeira abordagem não deve despejar:

* produto inteiro;
* preço;
* detalhes técnicos;
* promessa exagerada.

## Regra R4 — sempre se identificar primeiro

Quem puxa o assunto precisa se apresentar.

## Regra R5 — sempre existir motivo

Não usar abordagem vazia tipo:

* “oi tudo bem?”
* “fala”
* “como vai?”

## Regra R6 — se não for responsável, o foco vira captação do responsável

O bot não deve ficar vendendo para atendente/intermediário.

## Regra R7 — quando houver abertura, o foco vira reunião

Ao menor sinal de encaixe:

* dor;
* curiosidade;
* canal dependente de terceiros;
* pedido manual;
* controle bagunçado;

o bot deve puxar reunião curta.

## Regra R8 — não prometer resultado garantido

Proibido:

* “vai vender mais”
* “vai dobrar vendas”
* “garante lucro”
* “vai substituir tudo”

## Regra R9 — nunca usar urgência falsa

Proibido:

* “últimas vagas”
* “promoção acaba hoje”
* “só hoje”
* “apenas 3 vagas”
  sem prova real e regra comercial verdadeira.

## Regra R10 — não mencionar preço cedo por padrão

Preço não deve liderar a abertura.
Preço pode aparecer apenas se:

* o lead insistir;
* a política comercial permitir;
* ainda assim, com contexto mínimo.

---

# 5) ARQUITETURA LÓGICA RECOMENDADA

Baseando no seu stack atual:

* **Gateway Go / WhatsApp**
* **Brain Rust / roteamento**
* **API Central Bun**
* **Response Engine**
* **Validator**
* **State Extractor**
* **Redis pub/sub**
* **JSONB no lead**

## Componentes recomendados

### A. `prospectStrategyBank.ts`

Responsável por:

* decidir etapa do funil;
* objetivo micro da resposta;
* rota atual;
* limites invisíveis da mensagem.

### B. `prospectSemanticBank.ts`

Responsável por:

* vocabulário permitido;
* blacklist de linguagem robótica;
* bancos por nicho;
* expressões humanas curtas.

### C. `prospectResponseEngine.service.ts`

Responsável por:

* compor prompt;
* escolher tipo de resposta;
* chamar LLM;
* validar;
* regenerar se necessário.

### D. `prospectValidator.service.ts`

Responsável por:

* checar tamanho;
* checar perguntas;
* checar clichês proibidos;
* checar pitch excessivo;
* checar tom de anúncio;
* checar fuga de rota.

### E. `prospectStateExtractor.service.ts`

Responsável por:

* ler contexto recente;
* detectar rota;
* extrair status;
* salvar JSONB;
* sinalizar finalização ou próxima ação.

### F. `followUpOrchestrator.service.ts`

Responsável por:

* decidir se e quando mandar follow-up;
* escolher próxima mensagem por ângulo;
* bloquear repetição;
* encerrar sequência ao captar responsável ou reunião.

---

# 6) MÁQUINA DE ESTADOS

## Estados principais

### `S0_OPENING`

Mensagem inicial ainda não respondida.

### `S1_WAITING_OPENING_REPLY`

Abertura enviada, aguardando resposta.

### `S2_ROLE_CHECK`

Já houve resposta; agora o bot identifica se é o responsável.

### `RA_NON_RESPONSIBLE`

Rota A ativa: a pessoa não decide.

### `RA_WAITING_CONTACT_INFO`

Aguardando nome/cargo/número/horário do responsável.

### `RA_CONTACT_CAPTURED`

Contato do responsável obtido.

### `RB_RESPONSIBLE`

Rota B ativa: a pessoa decide.

### `RB_CHANNEL_DIAGNOSIS`

Diagnóstico do canal atual.

### `RB_PAIN_CLARIFICATION`

Clareza da dor operacional/comercial.

### `RB_VALUE_PRESENTED`

Oferta curta apresentada.

### `RB_MEETING_PROPOSED`

Reunião proposta.

### `RB_MEETING_CONFIRMED`

Reunião confirmada.

### `SX_BLOCKED`

Bloqueio/intermediário sem cooperação.

### `SX_NOT_INTERESTED`

Desinteresse claro.

### `SX_NO_RESPONSE`

Sem resposta após limite.

---

# 7) EVENTOS DE TRANSIÇÃO

## Eventos de entrada

* `opening_sent`
* `lead_replied`
* `followup_sent`

## Eventos de interpretação

* `reply_positive_open`
* `reply_asks_about`
* `reply_not_responsible`
* `reply_is_responsible`
* `reply_gives_name`
* `reply_gives_number`
* `reply_gives_role`
* `reply_gives_best_time`
* `reply_blocks_contact`
* `reply_depends_third_party`
* `reply_has_own_channel`
* `reply_has_manual_flow`
* `reply_shows_interest`
* `reply_asks_price`
* `reply_no_time`
* `reply_not_interested`
* `reply_accepts_meeting`
* `reply_rejects_meeting`

## Eventos finais

* `responsible_contact_captured`
* `meeting_confirmed`
* `conversation_closed_no_interest`
* `conversation_closed_no_response`
* `conversation_closed_blocked`

---

# 8) TABELA DE ESTADOS → AÇÕES

## Estado `S0_OPENING`

### ação

Enviar mensagem inicial.

### próxima transição

`S1_WAITING_OPENING_REPLY`

---

## Estado `S1_WAITING_OPENING_REPLY`

### se resposta aberta

* “pode”
* “fale”
* “quem é”
* “sobre o quê”
* “diga”

→ `S2_ROLE_CHECK`

### se sem resposta

→ `followUpOrchestrator`

### se excedeu limite

→ `SX_NO_RESPONSE`

---

## Estado `S2_ROLE_CHECK`

### ação

Perguntar se a pessoa é responsável.

### se “não”

→ `RA_NON_RESPONSIBLE`

### se “sou eu”

→ `RB_RESPONSIBLE`

### se resposta ambígua

continuar clarificando responsabilidade

---

## Estado `RA_NON_RESPONSIBLE`

### ação

Pedir contato da pessoa certa.

### se fornece nome/cargo/número/horário

→ `RA_CONTACT_CAPTURED`

### se bloqueia

→ `RA_WAITING_CONTACT_INFO` com persistência controlada

### se insiste sem cooperação

→ `SX_BLOCKED`

---

## Estado `RB_RESPONSIBLE`

### ação

Perguntar sobre canal atual.

### se depende de WhatsApp/iFood/manual

→ `RB_PAIN_CLARIFICATION`

### se já tem canal

→ `RB_PAIN_CLARIFICATION` com foco em uso/efetividade

---

## Estado `RB_PAIN_CLARIFICATION`

### ação

Mostrar encaixe da dor.

### se houver abertura

→ `RB_VALUE_PRESENTED`

### se não houver abertura

objeção / follow-up / encerramento

---

## Estado `RB_VALUE_PRESENTED`

### ação

Apresentar oferta em 1 frase curta.

### próxima ação

convidar para reunião

→ `RB_MEETING_PROPOSED`

---

## Estado `RB_MEETING_PROPOSED`

### se aceita

→ `RB_MEETING_CONFIRMED`

### se “não tenho tempo”

manter estado e reformular convite

### se “manda por aqui”

reexplicar brevemente e repropor reunião

### se “não interessa”

→ `SX_NOT_INTERESTED` ou tentativa de recuperação curta

---

# 9) BANCO DE MENSAGENS OFICIAL

---

## 9.1 — BLOCO DE ABERTURA

### `OPENING_PRIMARY`

**Oi, sou Rafaela da equipe da Império Lord 🙂**
**Te chamei porque a gente tá falando com alguns deliveries sobre uma forma de vender sem mensalidade e sem taxa por pedido.**
**Posso te explicar rapidinho?**

### `OPENING_ALT_1`

**Oi, sou Rafaela da equipe da Império Lord 🙂**
**Tô entrando em contato porque ajudamos delivery a vender no próprio canal sem mensalidade e sem taxa em cima dos pedidos.**
**Posso te fazer uma pergunta rápida?**

### `OPENING_ALT_2`

**Oi, sou Rafaela da equipe da Império Lord.**
**Talvez isso faça sentido pro delivery de vocês: pedido próprio sem taxa por venda.**
**Posso te explicar?**

### `OPENING_ALT_3`

**Oi, sou Rafaela da equipe da Império Lord.**
**Te chamei por um motivo bem específico sobre o delivery de vocês.**
**Posso ser direta?**

---

## 9.2 — FOLLOW-UPS DE ABERTURA

### `FU_OPEN_1`

**Prometo ser objetiva: é sobre vocês terem um canal próprio de pedidos sem mensalidade e sem taxa por venda.**

### `FU_OPEN_2`

**Se não for você quem cuida dessa parte aí, me fala só quem vê isso e eu falo certo 🙂**

### `FU_OPEN_3`

**Te chamei porque isso costuma fazer diferença quando o delivery quer vender no próprio canal sem perder parte do pedido em taxa.**

### `FU_OPEN_4`

**A ideia não é te tomar tempo. É só entender se isso faz sentido pra operação de vocês ou não.**

### Regra de ordem

1. `FU_OPEN_1`
2. `FU_OPEN_2`
3. `FU_OPEN_3`
4. `FU_OPEN_4`

### Regra de limite

Máximo 4 tentativas totais na abertura.

---

## 9.3 — CHECAGEM DE PAPEL

### `ROLE_CHECK_PRIMARY`

**Você que cuida dessa parte do delivery aí ou é outra pessoa que vê isso?**

### `ROLE_CHECK_ALT_1`

**É você quem decide essa parte ou outra pessoa cuida disso?**

### `ROLE_CHECK_ALT_2`

**Quem vê essa parte aí é você ou outra pessoa da operação?**

---

## 9.4 — ROTA A: NÃO É O RESPONSÁVEL

### `NR_BASE_1`

**Perfeito. Prefiro falar com a pessoa certa pra não te tomar tempo. Quem costuma ver isso aí?**

### `NR_BASE_2`

**Entendi. Quem normalmente cuida dessa parte aí?**

### `NR_BASE_3`

**Certo. Quem decide isso por aí?**

---

## 9.5 — QUANDO PERGUNTAREM “SOBRE O QUÊ?”

### `ABOUT_SHORT_1`

**É sobre uma forma de o delivery vender no próprio canal, sem mensalidade e sem taxa por pedido.**

### `ABOUT_SHORT_2`

**É sobre pedido próprio sem taxa em cima da venda.**

### `ABOUT_SHORT_3`

**É algo ligado a canal próprio de pedidos e mais controle da operação.**

### `ABOUT_SHORT_4`

**É sobre vender sem repassar parte do pedido em taxa de plataforma.**

---

## 9.6 — PERSISTÊNCIA DA ROTA A

### `NR_PERSIST_1`

**Perfeito. Você consegue me passar o nome ou número de quem vê isso?**

### `NR_PERSIST_2`

**Se preferir, pode me dizer só o cargo de quem cuida dessa parte aí.**

### `NR_PERSIST_3`

**Pra eu não ficar falando com a pessoa errada, me passa só o responsável por isso.**

### `NR_PERSIST_4`

**Pode ser o número, o nome ou até o melhor horário pra eu falar com essa pessoa.**

### `NR_PERSIST_5`

**Se ficar mais fácil, você pode só encaminhar essa mensagem pra quem decide essa parte aí.**

### Regra

* máximo 5 tentativas úteis na rota A;
* se nenhuma informação vier, encerrar.

---

## 9.7 — ENCERRAMENTO DA ROTA A

### `NR_CLOSE_CAPTURED_1`

**Perfeito, valeu por me direcionar 🙂**

### `NR_CLOSE_CAPTURED_2`

**Perfeito. Vou falar certo com essa pessoa.**

### `NR_CLOSE_CAPTURED_3`

**Obrigado, ajudou bastante.**

---

## 9.8 — ROTA B: RESPONSÁVEL

### `RESP_DIAG_PRIMARY`

**Hoje vocês já têm canal próprio de pedidos ou dependem mais de WhatsApp/iFood?**

### `RESP_DIAG_ALT_1`

**Hoje os pedidos de vocês vêm mais por canal próprio ou por WhatsApp/iFood?**

### `RESP_DIAG_ALT_2`

**Vocês já têm pedido próprio ou a operação roda mais no WhatsApp/iFood?**

### `RESP_DIAG_ALT_3`

**Hoje vocês vendem mais por canal próprio ou por terceiros?**

---

## 9.9 — CONFIRMAÇÃO DE CENÁRIO

### `RESP_SCENARIO_THIRD_PARTY_1`

**Entendi. Então ainda fica bastante coisa passando por canal de terceiro ou atendimento manual, né?**

### `RESP_SCENARIO_THIRD_PARTY_2`

**Entendi. Então parte importante dos pedidos ainda depende de terceiros ou atendimento manual, certo?**

### `RESP_SCENARIO_OWN_CHANNEL_1`

**Boa. E hoje isso realmente roda bem ou ainda muita coisa fica no WhatsApp/manual?**

### `RESP_SCENARIO_OWN_CHANNEL_2`

**Entendi. E esse canal próprio hoje funciona redondo ou ainda fica muito pedido no manual?**

---

## 9.10 — PONTE DE VALOR

### `BRIDGE_1`

**É justamente essa parte que a gente resolve.**

### `BRIDGE_2`

**Foi por isso que te chamei.**

### `BRIDGE_3`

**Esse é exatamente o ponto que faz muita gente olhar nossa estrutura.**

### `BRIDGE_4`

**A ideia é tirar dependência de taxa e organizar melhor esse fluxo.**

---

## 9.11 — APRESENTAÇÃO CURTA DA OFERTA

### `VALUE_SHORT_PRIMARY`

**A gente trabalha com uma estrutura pro delivery vender no próprio canal, com site de pedidos, caixa básico e apoio de divulgação — sem mensalidade e sem taxa por pedido.**

### `VALUE_SHORT_ALT_1`

**A proposta é vocês terem um canal próprio de pedidos, sem taxa em cima da venda e com mais controle da operação.**

### `VALUE_SHORT_ALT_2`

**É uma forma de vender no canal de vocês, com pedido organizado, apoio de divulgação e sem cobrança por pedido.**

### `VALUE_SHORT_ALT_3`

**A ideia é parar de depender só de terceiros e ter um canal próprio sem mensalidade nem taxa por venda.**

---

## 9.12 — CONVITE PARA REUNIÃO

### `MEETING_INVITE_PRIMARY`

**Melhor do que te explicar por texto é te mostrar isso no prático. Você prefere hoje ou amanhã?**

### `MEETING_INVITE_ALT_1`

**Em 15 a 25 minutos você já consegue ver se isso faz sentido ou não. Qual horário fica melhor?**

### `MEETING_INVITE_ALT_2`

**Se fizer sentido, eu te mostro de forma rápida e direta. Você prefere hoje ou amanhã?**

### `MEETING_INVITE_ALT_3`

**Compensa mais eu te mostrar isso em uma conversa rápida do que te mandar textão. Qual horário te encaixa melhor?**

---

# 10) TRATAMENTO DE OBJEÇÕES

## 10.1 — “não tenho tempo”

### resposta

**Sem problema. Por isso mesmo a conversa é rápida, de 15 a 25 minutos. Qual horário costuma ficar mais leve pra você?**

### alternativa

**Entendi. Justamente por isso a ideia é ser algo rápido e direto. Qual horário fica melhor?**

---

## 10.2 — “manda por aqui”

### resposta

**Posso te adiantar por aqui, mas no prático fica muito mais claro em poucos minutos. Você prefere ver isso hoje ou amanhã?**

### alternativa

**Eu te adianto por aqui sim, só que em conversa rápida você entende bem melhor se serve pra operação de vocês. Qual horário funciona?**

---

## 10.3 — “quanto custa?”

### resposta-base

**Eu te passo isso sim. Antes, só quis entender se esse modelo faz sentido pro delivery de vocês, porque a lógica é bem diferente de pagar mensalidade e taxa por pedido.**

### se insistir

**Te explico certinho na conversa rápida, porque não é só site: entra canal próprio, caixa básico e apoio de divulgação.**

### se a política comercial permitir soltar faixa

Você pode criar um slot opcional:
**Existe um investimento único, sem mensalidade e sem taxa por pedido. Na conversa eu te mostro exatamente como fica.**

---

## 10.4 — “não tenho interesse”

### recuperação curta

**Tranquilo. Só pra eu entender: é porque vocês já têm isso resolvido ou porque não é prioridade agora?**

### se “já temos resolvido”

**Boa. E hoje esse canal próprio realmente roda bem ou ainda muito pedido fica no manual?**

### se “não é prioridade”

**Entendi. Posso retomar isso em outro momento mais adequado.**

### se continuar fechado

**Sem problema, obrigado pela sinceridade 🙂**

---

## 10.5 — “já temos sistema/site”

### resposta

**Boa. E hoje ele realmente concentra os pedidos ou ainda muita coisa fica espalhada no WhatsApp/manual?**

---

## 10.6 — “quem passou meu contato?”

### resposta segura

**Entrei em contato porque vi que vocês trabalham com delivery e achei que esse modelo poderia fazer sentido pra operação de vocês.**

Evitar:

* inventar indicação falsa;
* citar origem não autorizada;
* inventar relação pessoal.

---

# 11) EXTRAÇÃO DE ESTADO

O `prospectStateExtractor.service.ts` deve produzir um JSON estruturado por conversa.

## Schema recomendado

```json
{
  "routeType": "responsible | non_responsible | unknown",
  "leadRoleDetected": "owner | manager | attendant | receptionist | unknown",
  "responsibleDetected": false,
  "responsibleName": null,
  "responsibleRole": null,
  "responsiblePhone": null,
  "bestContactTime": null,
  "currentOrderChannel": "whatsapp | ifood | mixed | own_channel | manual | unknown",
  "hasOwnChannel": "yes | no | partial | unknown",
  "painType": [
    "dependency_on_platforms",
    "margin_loss",
    "manual_attendance",
    "lack_of_control"
  ],
  "interestLevel": "low | medium | high | unknown",
  "meetingStatus": "none | exploring | proposed | confirmed",
  "conversationOutcome": "in_progress | responsible_contact_captured | meeting_confirmed | blocked | not_interested | no_response",
  "lastMeaningfulStep": "opening | role_check | responsible_capture | diagnosis | value_presented | meeting_proposed",
  "followupStage": 0,
  "shouldCloseCurrentThread": false
}
```

## Regras de extração

### `responsibleDetected = true`

Quando o lead disser:

* sou eu
* eu cuido
* eu vejo isso
* eu decido
* sou o dono
* sou gerente

### `routeType = non_responsible`

Quando o lead disser:

* não sou eu
* quem vê isso é X
* o dono vê
* sou só atendente
* sou recepção

### `responsible_contact_captured`

Quando houver ao menos um dos seguintes:

* nome útil do responsável
* número do responsável
* cargo + horário
* encaminhamento confirmado

### `meetingStatus = proposed`

Quando o bot convidar para reunião.

### `meetingStatus = confirmed`

Quando houver aceite explícito ou horário definido.

---

# 12) PROMPTING INTERNO DO RESPONSE ENGINE

## Objetivo

A LLM não deve ser “autora livre”.
Ela deve ser uma **montadora controlada de respostas curtas**, obedecendo estratégia e banco semântico.

## Prompt-base de sistema recomendado

```text
Você é a camada de geração controlada da prospecção comercial da Império Lord.
Seu trabalho NÃO é improvisar um pitch livre.
Seu trabalho é gerar UMA única mensagem curta de WhatsApp, humana, direta, conversacional e aderente à etapa atual do fluxo.

Objetivos centrais:
- conseguir resposta
- identificar o responsável
- captar o contato do responsável quando necessário
- diagnosticar rapidamente o cenário quando estiver falando com o decisor
- conduzir para uma reunião curta de 15 a 25 minutos

Regras obrigatórias:
- apenas uma pergunta por mensagem
- no máximo 30 palavras
- sem textão
- sem linguagem corporativa
- sem soar como anúncio
- sem promessas exageradas
- sem inventar urgência
- sem inventar dados
- sem falar preço de abertura
- sem falar como robô
- sem repetir a mensagem anterior
- manter o foco da rota atual
- quando não for o responsável, o foco é obter o contato correto
- quando for o responsável, o foco é diagnosticar e levar para reunião

Oferta-base:
- canal próprio de pedidos
- sem mensalidade
- sem taxa por pedido
- caixa básico
- apoio de divulgação

Saída:
Retorne somente a mensagem final, pronta para WhatsApp.
```

## Input recomendado para o engine

```json
{
  "stage": "ROLE_CHECK",
  "routeType": "unknown",
  "leadLastMessage": "Pode falar",
  "conversationSummary": "Lead respondeu à abertura com abertura leve.",
  "microObjective": "discover_if_responsible",
  "microStrategy": "low_friction_role_check",
  "allowedAngles": ["clarity", "respect_time", "human"],
  "disallowedPatterns": ["corporate", "hard_pitch", "double_question", "text_wall"],
  "semanticHints": ["quem vê isso", "parte do delivery", "falar certo"],
  "maxWords": 20
}
```

---

# 13) BANK DE SEMÂNTICA CONTROLADA

## 13.1 — vocabulário permitido

* te chamei
* rapidinho
* ser direta
* faz sentido
* quem vê isso
* falar certo
* não te tomar tempo
* canal próprio
* pedido próprio
* taxa por pedido
* sem mensalidade
* no prático
* conversa rápida
* operação
* delivery
* pedido organizado

## 13.2 — blacklist absoluta

* otimizar processos
* aumentar eficiência
* alavancar
* escalar
* solução completa
* gestão integrada
* plataforma robusta
* redução de custos
* inovação
* transformação digital
* performance
* KPI
* ROI
* conversão garantida
* sem esforço
* sucesso garantido

## 13.3 — expressões humanas úteis

* te chamei por isso
* prometo ser objetiva
* prefiro falar com a pessoa certa
* pra não te tomar tempo
* isso é mais comum do que parece
* no prático fica mais claro
* melhor te mostrar do que explicar por texto

---

# 14) VALIDAÇÃO E REGENERAÇÃO

## 14.1 — regras do validador

Toda mensagem gerada deve passar por score.

## Score 0 imediato se:

* tiver mais de uma pergunta;
* tiver 2 ou mais quebras de linha;
* tiver mais de 30 palavras;
* usar termo da blacklist absoluta;
* parecer anúncio explícito;
* fugir da rota;
* falar preço sem permissão;
* prometer resultados exagerados.

## Score baixo se:

* repetir estrutura da mensagem anterior;
* estiver longa demais;
* soar formal demais;
* soar vaga demais;
* perder o foco do objetivo atual.

## Exemplo de checklist

```ts
type ValidationResult = {
  approved: boolean;
  score: number;
  reasons: string[];
  requiresRegeneration: boolean;
}
```

## Regras recomendadas

* `score >= 85`: aprova
* `score 70-84`: aprova com cautela
* `score < 70`: regenera
* máximo 3 regenerações

## Mensagem de reparo para a LLM

```text
Repare a mensagem.
Problemas encontrados:
- mais de uma pergunta
- tom de anúncio
- texto longo demais

Reescreva com:
- uma única pergunta
- até 22 palavras
- tom humano e direto
- sem pitch pesado
```

---

# 15) ORQUESTRAÇÃO DE FOLLOW-UP

## Finalidade

Evitar que o bot:

* abandone cedo demais;
* repita demais;
* mande follow-up incoerente.

## Regras

### Abertura sem resposta

* usar sequência `FU_OPEN_1` → `FU_OPEN_2` → `FU_OPEN_3` → `FU_OPEN_4`
* após isso: `SX_NO_RESPONSE`

### Rota A sem cooperação

* até 5 tentativas úteis
* cada tentativa deve pedir tipo diferente de informação:

  * nome
  * número
  * cargo
  * horário
  * encaminhamento

### Rota B com responsável frio

* até 5 tentativas totais úteis
* alternar ângulo:

  1. taxa/margem
  2. canal próprio
  3. controle/pedido organizado
  4. reunião curta
  5. última retomada objetiva

---

# 16) POLÍTICA DE PERSISTÊNCIA

## Persistência saudável

O bot pode continuar tentando quando:

* o lead não fechou a porta;
* o lead visualizou e não respondeu;
* o intermediário não ajudou, mas também não bloqueou;
* o responsável parece ocupado, não resistente.

## Persistência não saudável

Encerrar quando:

* o lead disser “não tenho interesse” duas vezes de forma clara;
* o lead pedir para parar;
* o lead bloquear ou hostilizar;
* o intermediário recusar claramente e repetidamente sem rota alternativa.

---

# 17) ANALYTICS E MÉTRICAS

## Métricas essenciais

* taxa de primeira resposta
* taxa de identificação do responsável
* taxa de captura do contato do responsável
* taxa de transição para rota B
* taxa de proposta de reunião
* taxa de reunião confirmada
* taxa de bloqueio na recepção
* taxa de abandono por no_response
* taxa de mensagens reprovadas no validator
* tempo médio até proposta de reunião

## Métricas por template

Cada template deve carregar:

* `templateId`
* `variantId`
* `stage`
* `outcome`

## Exemplo

```json
{
  "templateId": "OPENING_PRIMARY",
  "variantId": "v1",
  "stage": "opening",
  "outcome": "reply_positive_open"
}
```

---

# 18) A/B TESTING CONTROLADO

## Testar só uma variável por vez

Não mude ao mesmo tempo:

* nome da vendedora
* gancho
* ordem
* CTA

## Sugestões de teste

### Teste 1 — abertura

* variante A: “sem mensalidade e sem taxa por pedido”
* variante B: “canal próprio sem taxa por venda”

### Teste 2 — CTA

* variante A: “Posso te explicar rapidinho?”
* variante B: “Posso ser direta?”

### Teste 3 — reunião

* variante A: “Você prefere hoje ou amanhã?”
* variante B: “Qual horário fica melhor?”

---

# 19) CONTRATOS DE DADOS ENTRE SERVIÇOS

## Evento recebido da mensageria

```json
{
  "leadId": "uuid",
  "phone": "string",
  "messageId": "string",
  "text": "string",
  "timestamp": "iso",
  "channel": "whatsapp"
}
```

## Evento enriquecido pelo brain

```json
{
  "leadId": "uuid",
  "messageId": "string",
  "intent": "prospecting_reply",
  "confidence": 0.91,
  "semanticClass": "reply_is_responsible",
  "rawText": "sou eu"
}
```

## Evento emitido pela API Central

```json
{
  "leadId": "uuid",
  "conversationState": "RB_RESPONSIBLE",
  "nextMessage": "Hoje vocês já têm canal próprio de pedidos ou dependem mais de WhatsApp/iFood?",
  "messageTemplateId": "RESP_DIAG_PRIMARY",
  "validatorScore": 96,
  "metadataPatch": {
    "routeType": "responsible",
    "responsibleDetected": true
  }
}
```

---

# 20) ESQUEMA DE METADATA JSONB NO LEAD

## Estrutura sugerida

```json
{
  "prospecting": {
    "isActive": true,
    "conversationState": "RB_RESPONSIBLE",
    "routeType": "responsible",
    "responsibleDetected": true,
    "responsibleName": null,
    "responsibleRole": "owner",
    "responsiblePhone": null,
    "bestContactTime": null,
    "currentOrderChannel": "mixed",
    "hasOwnChannel": "partial",
    "painType": [
      "dependency_on_platforms",
      "manual_attendance"
    ],
    "interestLevel": "medium",
    "meetingStatus": "proposed",
    "conversationOutcome": "in_progress",
    "followupStage": 1,
    "lastMessageTemplateId": "MEETING_INVITE_PRIMARY",
    "lastMicroObjective": "propose_meeting",
    "lastUpdatedAt": "2026-03-02T22:00:00Z"
  }
}
```

---

# 21) PSEUDOCÓDIGO DO ORQUESTRADOR

```ts
async function handleProspectMessage(input: IncomingLeadMessage) {
  const lead = await leadRepo.get(input.leadId);
  const state = lead.metadata?.prospecting ?? createDefaultProspectState();

  const understanding = await intentEngine.classify(input.text, state);

  const nextDecision = prospectStrategyBank.decide({
    state,
    understanding,
    lead,
    lastLeadMessage: input.text
  });

  const candidate = await prospectResponseEngine.generate({
    state,
    understanding,
    strategy: nextDecision
  });

  const validation = prospectValidator.validate({
    message: candidate,
    state,
    understanding
  });

  const finalMessage = validation.approved
    ? candidate
    : await prospectResponseEngine.repair({
        original: candidate,
        validation
      });

  const extracted = await prospectStateExtractor.extract({
    lead,
    state,
    lastLeadMessage: input.text,
    assistantMessage: finalMessage,
    understanding,
    strategy: nextDecision
  });

  await leadRepo.patchProspecting(input.leadId, extracted.metadataPatch);

  if (extracted.shouldSendMessage) {
    await redis.publish("crm_to_bot", {
      leadId: input.leadId,
      text: finalMessage
    });
  }

  if (extracted.shouldCloseCurrentThread) {
    await queueService.closeLeadProspecting(input.leadId, extracted.conversationOutcome);
  }
}
```

---

# 22) DECISOR ESTRATÉGICO

## Interface recomendada

```ts
type ProspectDecisionInput = {
  state: ProspectState;
  understanding: UnderstandingResult;
  lead: Lead;
  lastLeadMessage: string;
};

type ProspectDecisionOutput = {
  stage: string;
  routeType: "responsible" | "non_responsible" | "unknown";
  microObjective: string;
  microStrategy: string;
  templateHint?: string;
  maxWords: number;
  canUseEmoji: boolean;
  shouldAskQuestion: boolean;
};
```

## Mapeamento recomendado

### Se `understanding = reply_not_responsible`

```ts
{
  stage: "RA_NON_RESPONSIBLE",
  routeType: "non_responsible",
  microObjective: "capture_responsible_contact",
  microStrategy: "respectful_redirection",
  maxWords: 18,
  canUseEmoji: true,
  shouldAskQuestion: true
}
```

### Se `understanding = reply_is_responsible`

```ts
{
  stage: "RB_CHANNEL_DIAGNOSIS",
  routeType: "responsible",
  microObjective: "discover_current_order_channel",
  microStrategy: "binary_channel_choice",
  maxWords: 18,
  canUseEmoji: false,
  shouldAskQuestion: true
}
```

### Se `understanding = reply_asks_price`

```ts
{
  stage: "RB_VALUE_PRESENTED",
  routeType: "responsible",
  microObjective: "hold_price_until_context",
  microStrategy: "context_before_price",
  maxWords: 22,
  canUseEmoji: false,
  shouldAskQuestion: false
}
```

---

# 23) CLASSIFICADOR DE ENTENDIMENTO

## Labels mínimas recomendadas

```ts
type ProspectUnderstanding =
  | "reply_positive_open"
  | "reply_asks_about"
  | "reply_not_responsible"
  | "reply_is_responsible"
  | "reply_gives_name"
  | "reply_gives_number"
  | "reply_gives_role"
  | "reply_gives_best_time"
  | "reply_blocks_contact"
  | "reply_depends_third_party"
  | "reply_has_own_channel"
  | "reply_has_manual_flow"
  | "reply_shows_interest"
  | "reply_no_time"
  | "reply_asks_price"
  | "reply_not_interested"
  | "reply_accepts_meeting"
  | "reply_rejects_meeting"
  | "reply_ambiguous";
```

## Regras heurísticas iniciais

### `reply_not_responsible`

Quando houver expressões como:

* não sou eu
* quem vê isso é
* é o dono
* é o gerente
* sou só atendente
* sou recepção

### `reply_is_responsible`

* sou eu
* eu cuido
* eu vejo
* eu decido
* eu mesmo
* sou o dono
* sou gerente

### `reply_depends_third_party`

* ifood
* whatsapp
* os dois
* não temos site
* só whatsapp
* mais ifood

### `reply_has_own_channel`

* já temos site
* temos sistema
* temos link próprio
* já temos canal

---

# 24) TESTES DE ACEITAÇÃO

## Caso 1 — abertura gera rota A

### entrada

Lead responde: “não, quem vê isso é o gerente”

### esperado

* `routeType = non_responsible`
* próxima mensagem = pedido de contato do gerente
* não apresentar pitch completo
* não propor reunião ainda

---

## Caso 2 — responsável depende de iFood/WhatsApp

### entrada

Lead responde: “sou eu, hoje vem mais pelo iFood e WhatsApp”

### esperado

* `routeType = responsible`
* identificar dependência de terceiros
* gerar confirmação curta da dor
* apresentar valor resumido
* propor reunião

---

## Caso 3 — responsável já tem site

### entrada

Lead responde: “já temos site”

### esperado

* não encerrar
* perguntar se o fluxo realmente roda bem ou ainda fica no manual
* explorar aderência antes de reunião

---

## Caso 4 — atendente pergunta “sobre o quê?”

### esperado

* responder com motivo curto
* continuar pedindo contato do responsável
* não vender para o atendente

---

## Caso 5 — lead pede preço cedo

### esperado

* responder com contexto
* não fugir da pergunta com evasiva ruim
* tentar manter a conversa na lógica da reunião

---

# 25) EXEMPLOS DE CONVERSA

---

## Exemplo A — rota A perfeita

**Bot:** Oi, sou Rafaela da equipe da Império Lord 🙂 Te chamei porque a gente tá falando com alguns deliveries sobre uma forma de vender sem mensalidade e sem taxa por pedido. Posso te explicar rapidinho?

**Lead:** Pode falar

**Bot:** Você que cuida dessa parte do delivery aí ou é outra pessoa que vê isso?

**Lead:** Não, quem vê isso é o gerente

**Bot:** Perfeito. Prefiro falar com a pessoa certa pra não te tomar tempo. Quem costuma ver isso aí?

**Lead:** É o Marcos

**Bot:** Você consegue me passar o número dele ou o melhor horário pra eu falar certo?

**Lead:** O número é X

**Bot:** Perfeito, valeu por me direcionar 🙂

### Resultado

* `conversationOutcome = responsible_contact_captured`
* encerrar thread atual

---

## Exemplo B — rota B perfeita

**Bot:** Oi, sou Rafaela da equipe da Império Lord 🙂 Te chamei porque a gente tá falando com alguns deliveries sobre uma forma de vender sem mensalidade e sem taxa por pedido. Posso te explicar rapidinho?

**Lead:** Sou eu, pode falar

**Bot:** Hoje vocês já têm canal próprio de pedidos ou dependem mais de WhatsApp/iFood?

**Lead:** Mais iFood e WhatsApp

**Bot:** Entendi. Então ainda fica bastante coisa passando por canal de terceiro ou atendimento manual, né?

**Lead:** Sim

**Bot:** É justamente essa parte que a gente resolve.

**Bot:** A gente trabalha com uma estrutura pro delivery vender no próprio canal, com site de pedidos, caixa básico e apoio de divulgação — sem mensalidade e sem taxa por pedido.

**Bot:** Melhor do que te explicar por texto é te mostrar isso no prático. Você prefere hoje ou amanhã?

### Resultado

* `meetingStatus = proposed`

---

## Exemplo C — objeção “não tenho tempo”

**Lead:** Agora não tenho tempo

**Bot:** Sem problema. Por isso mesmo a conversa é rápida, de 15 a 25 minutos. Qual horário costuma ficar mais leve pra você?

---

## Exemplo D — objeção “manda por aqui”

**Lead:** Manda por aqui

**Bot:** Posso te adiantar por aqui, mas no prático fica muito mais claro em poucos minutos. Você prefere ver isso hoje ou amanhã?

---

# 26) POLÍTICA DE ENCERRAMENTO AUTOMÁTICO

## Encerrar como `no_response`

Quando:

* abertura + 4 follow-ups sem qualquer retorno

## Encerrar como `blocked`

Quando:

* rota A esgota tentativas;
* não há nome, cargo, número, horário ou encaminhamento;
* há recusa explícita em ajudar.

## Encerrar como `not_interested`

Quando:

* o lead diz claramente que não quer;
* e a tentativa única de recuperação não abre porta.

## Encerrar como `meeting_confirmed`

Quando:

* há horário aceito;
* ou aceite explícito com próximo passo definido.

---

# 27) REGRAS DE QUALIDADE PARA O FRONT E LOGS

Para a tela de prospecção ficar realmente útil, o front precisa mostrar:

## por lead

* estado atual da máquina
* rota atual
* última intenção detectada
* última mensagem enviada
* score do validador
* número de follow-ups usados
* responsável detectado?
* contato do responsável capturado?
* reunião proposta?
* reunião confirmada?

## no log do cérebro da IA

Mostrar:

* `intent_detected`
* `route_decision`
* `microObjective`
* `template_selected`
* `validator_result`
* `state_extractor_patch`

Isso ajuda a depurar sem depender de “achismo”.

---

# 28) RECOMENDAÇÃO DE IMPLEMENTAÇÃO EM FASES

## Fase 1 — versão rígida

Sem improviso.

* só templates controlados;
* pouca geração livre;
* state machine forte;
* validator rígido.

## Fase 2 — geração assistida

Permitir à LLM:

* microvariações humanas;
* alternância semântica leve;
* reformulação de follow-ups.

## Fase 3 — otimização

* A/B testing;
* melhor timing;
* personalização por nicho;
* score de oportunidade.

---

# 29) DEFINIÇÃO FINAL DO COMPORTAMENTO DO BOT

## O bot deve ser

* humano
* objetivo
* curto
* estratégico
* persistente
* controlado

## O bot não deve ser

* anúncio
* robô óbvio
* atendente genérico
* pitch ambulante
* tagarela
* insistente sem inteligência

---

# 30) ESPEC FINAL PARA COPIAR COMO NORMA INTERNA

```text
O bot de prospecção da Império Lord deve operar como um sistema de conversa comercial curta e controlada no WhatsApp.

Objetivo:
1. conseguir resposta;
2. descobrir se quem responde é o responsável;
3. se não for, capturar o contato da pessoa certa;
4. se for, diagnosticar rapidamente se a operação depende de WhatsApp/iFood/manual ou já possui canal próprio;
5. apresentar a oferta em uma única frase curta;
6. propor reunião de 15 a 25 minutos;
7. encerrar a rota ao captar o contato do responsável ou confirmar reunião.

Oferta-base:
- canal próprio de pedidos
- sem mensalidade
- sem taxa por pedido
- caixa básico
- apoio de divulgação

Regras:
- sempre se identificar;
- sempre dar motivo;
- apenas uma pergunta por mensagem;
- sem textão;
- sem linguagem corporativa;
- sem promessas exageradas;
- sem urgência falsa;
- sem vender para intermediário;
- sem repetir a mesma mensagem;
- sem deixar a conversa solta fora da state machine.

Rotas:
A) não é responsável → captar responsável
B) é responsável → diagnosticar → apresentar valor → propor reunião

Critérios de saída:
- responsible_contact_captured
- meeting_confirmed
- blocked
- not_interested
- no_response
```



ADENDO TÉCNICO — CADÊNCIA HUMANA, TYPING, RATE LIMIT E TEMPO PROPORCIONAL
1) Objetivo deste módulo

Este módulo existe para 4 coisas:

deixar a conversa mais natural;

evitar respostas instantâneas “robóticas”;

impedir bursts, duplicações e follow-ups desordenados;

manter a operação mais alinhada com qualidade e menor risco de spam.

Ele não existe para:

fingir identidade inexistente;

esconder que existe automação;

disparar em massa sem controle;

insistir contra pedido de parada.

2) Regras de conformidade operacional
2.1 — Janela de 24 horas

Se o lead acabou de responder, você está dentro da janela conversacional e pode responder com mensagem livre. Fora da janela, a Meta documenta o uso de templates para mensagens business-initiated.

Campo recomendado
customerServiceWindowUntil: string | null
Regra

se now <= customerServiceWindowUntil → pode usar fluxo normal;

se now > customerServiceWindowUntil → só entra por template aprovado.

2.2 — Qualidade e limites

A Meta informa que o status do número, o quality rating e os messaging limits ficam visíveis no WhatsApp Manager.

Regra

se qualidade cair, reduzir volume imediatamente;

se a taxa de bloqueio/subreport subir, pausar campanhas novas;

se houver reclamações, suprimir follow-ups daquele segmento.

2.3 — Anti-spam / opt-out

A FAQ oficial do WhatsApp informa que continuar enviando spam pode levar à suspensão de marketing messages por 3 dias e depois restringir mais o recurso.

Regra dura

Qualquer resposta do tipo:

pare

parar

não quero

tira meu número

me remove

stop

sai

não chama mais

deve ativar supressão imediata.

Campo recomendado
optOutStatus: "active" | "opted_out" | "unknown"
optOutReason?: string
optOutAt?: string
3) MODELO DE TEMPO HUMANO

O tempo total antes de responder deve ser a soma de 4 camadas:

read delay — tempo de “ler” a mensagem recebida;

decision delay — tempo de “pensar”;

typing delay — tempo de digitação proporcional ao texto que será enviado;

jitter — pequena variação aleatória para não ficar mecânico.

Fórmula-base
totalDelayMs = readDelayMs + decisionDelayMs + typingDelayMs + jitterMs
4) READ DELAY — TEMPO DE LEITURA

Baseado no tamanho do texto recebido pelo lead.

Fórmula sugerida
readDelayMs = clamp(700 + inboundChars * 18, 1000, 6000)
Interpretação

mensagem curtíssima: ~1 a 2 segundos

mensagem média: ~2 a 4 segundos

mensagem longa: até 6 segundos

Ajuste por quantidade de mensagens consolidadas

Se o consolidateMessages() juntou várias mensagens do usuário:

readDelayMs += Math.min((messageCount - 1) * 400, 1600)

Isso evita que uma rajada de 3 mensagens receba resposta em 1 segundo.

5) DECISION DELAY — TEMPO DE “PENSAR”

Não deve depender só do texto, mas da complexidade da etapa.

Faixas recomendadas por estágio
Abertura / papel

800 a 1800 ms

Diagnóstico simples

1200 a 2500 ms

Objeção / clarificação

1800 a 4200 ms

Convite para reunião

1200 a 2400 ms

Exemplo
function getDecisionDelayMs(stage: ProspectStage): number {
  switch (stage) {
    case "ROLE_CHECK":
      return randomInt(800, 1800);
    case "RB_CHANNEL_DIAGNOSIS":
      return randomInt(1200, 2500);
    case "OBJECTION_HANDLING":
      return randomInt(1800, 4200);
    case "MEETING_PROPOSAL":
      return randomInt(1200, 2400);
    default:
      return randomInt(1000, 2200);
  }
}
6) TYPING DELAY — TEMPO PROPORCIONAL AO TEXTO ENVIADO

Esse é o mais importante para o efeito natural.

Fórmula sugerida
typingDelayMs = clamp(900 + outboundChars * 45, 1500, 9000)
Faixas práticas

até 20 caracteres: 1,5 a 2,5 s

21–60 caracteres: 2,5 a 4,5 s

61–120 caracteres: 4 a 7 s

121–180 caracteres: 6 a 9 s

acima disso: cortar a mensagem ou dividir; não compensar só com espera

Regra importante

Se a mensagem for longa demais, não aumente só o delay.
Prefira:

encurtar;

ou dividir em no máximo 2 bolhas.

7) JITTER — VARIAÇÃO NATURAL

Sem jitter, o tempo fica “certinho demais”.

Fórmula
jitterMs = randomInt(-400, 1200)

Ou proporcional:

jitterMs = Math.round(baseDelayMs * randomFloat(-0.12, 0.18))
Regra

nunca usar jitter gigantesco;

o objetivo é quebrar padrão, não parecer travado.

8) CAPS DE TEMPO TOTAL

O bot não pode demorar demais quando o lead está engajado.

Caps recomendados
Resposta curta e direta

cap total: 8 s

Resposta média

cap total: 15 s

Resposta mais pensada

cap total: 25 s

Objeção sensível

cap total: 30 s

Exemplo
if (isShortReply(outboundChars)) totalDelayMs = Math.min(totalDelayMs, 8000);
if (isMediumReply(outboundChars)) totalDelayMs = Math.min(totalDelayMs, 15000);
if (isLongReply(outboundChars)) totalDelayMs = Math.min(totalDelayMs, 25000);
9) TYPING INDICATOR / PRESENCE
Regra de produto

Use typing indicator apenas se o seu gateway realmente suportar isso.
Eu não consegui confirmar suporte oficial equivalente no material que consultei da Cloud API; então trate isso como recurso opcional do transport/gateway, não como premissa universal da API oficial.

Estratégia recomendada

Se suportado:

espera readDelay + decisionDelay;

envia “typing on”;

espera typingDelay;

envia a mensagem;

desliga presença/typing se necessário.

Pseudocódigo
async function sendWithHumanPacing(ctx: SendContext) {
  const readDelayMs = calcReadDelay(ctx.inboundChars, ctx.inboundMessageCount);
  const decisionDelayMs = getDecisionDelayMs(ctx.stage);
  const typingDelayMs = calcTypingDelay(ctx.outboundChars);
  const jitterMs = calcJitter(readDelayMs + decisionDelayMs + typingDelayMs);

  const preTypingMs = readDelayMs + decisionDelayMs;
  const finalTypingMs = Math.max(1200, typingDelayMs + jitterMs);

  await sleep(preTypingMs);

  if (ctx.transportSupportsTyping) {
    await transport.setTyping(ctx.phone, true);
  }

  await sleep(finalTypingMs);

  await transport.sendMessage(ctx.phone, ctx.text);

  if (ctx.transportSupportsTyping) {
    await transport.setTyping(ctx.phone, false);
  }
}
Fallback se não houver typing

Se não houver support:

só faça sleep(totalDelayMs) e envie.

melhor um atraso coerente do que “fingir” um recurso inexistente.

10) TEMPO POR TAMANHO DO TEXTO — PERFIL PRONTO
Perfil conservador

Bom para prospecção comercial.

até 35 caracteres

total: 2,5 a 5 s

36 a 80 caracteres

total: 4 a 8 s

81 a 140 caracteres

total: 6 a 12 s

141 a 220 caracteres

total: 9 a 16 s

>220 caracteres

reescrever ou dividir

11) DIVISÃO EM BOLHAS
Regra geral

No máximo 2 bolhas por turno do bot.

Quando dividir

Divida apenas se houver ganho real de naturalidade:

Bom

identificação

pedido de permissão

Exemplo:

“Oi, sou Rafaela da equipe da Império Lord 🙂”

“Te chamei porque a gente tá falando com alguns deliveries sobre uma forma de vender sem mensalidade e sem taxa por pedido.”

“Posso te explicar rapidinho?”

Mas, para prospecção fria, eu manteria isso em 2 bolhas no máximo, não 3.

Gap entre bolhas do mesmo turno
bubbleGapMs = randomInt(1500, 3500)
Regra

1 bolha: padrão

2 bolhas: permitido

3 bolhas: evitar em produção fria

12) RATE LIMIT POR TELEFONE
Regras por lead
Uma execução por telefone

Já definido com lock.

Uma fila de saída por telefone

Mesmo que o engine gere duas ações, só uma pode enviar; a outra entra em fila ou é descartada.

Gap mínimo entre envios para o mesmo telefone

mesmo turno: 1,5 a 3,5 s entre bolhas

turnos diferentes sem resposta do usuário: não mandar em sequência curta

Campo recomendado
lastOutboundAt?: string
nextEligibleSendAt?: string
activeSendLock?: boolean
Função
function canSendNow(state: ProspectState, now: number): boolean {
  if (state.activeSendLock) return false;
  if (!state.nextEligibleSendAt) return true;
  return now >= new Date(state.nextEligibleSendAt).getTime();
}
13) RATE LIMIT POR CAMPANHA

Aqui está o que realmente ajuda mais do que “parecer humano”.

Regras conservadoras

subir campanha em ondas, não tudo de uma vez;

randomizar distribuição de disparo;

limitar volume por número;

pausar segmentos com baixa resposta ou muito opt-out.

Exemplo de throttle
maxNewOpensPerMinutePerNumber = 6
maxActiveConversationsPerMinutePerNumber = 20
maxFollowupsPerHourPerNumber = 30

Esses números são conservadores de engenharia, não “números oficiais do WhatsApp”. Ajuste com base na sua operação e qualidade. O ponto importante é não criar picos artificiais.

14) FOLLOW-UP SCHEDULING SEGURO
Não usar follow-up em minutos

Se não houver resposta, follow-up em minutos tende a parecer spam.

Cadência sugerida para prospecção fria
abertura

t0

follow-up 1

+18h a +30h

follow-up 2

+48h a +72h

follow-up 3

+5 a +7 dias

Depois disso:

arquiva;

ou entra numa cadência de reativação muito posterior, se houver base legal/comercial e sem ter havido opt-out.

Regra

se o lead respondeu qualquer coisa, sai da cadência fria e entra no fluxo conversacional.

se o lead pediu para parar, supressão imediata.

15) DETECÇÃO DE MOMENTO RUIM

O bot deve responder diferente se o lead aparenta correria.

Marcadores

“agora não”

“tô corrido”

“depois”

“em atendimento”

“ocupado”

“sem tempo”

Ação

reduzir tamanho da próxima mensagem;

não insistir com explicação;

puxar agendamento curto.

Exemplo

Sem problema. Pra não te tomar tempo, isso eu te mostro em 15 a 25 minutos. Qual horário costuma ficar mais leve pra você?

16) COMPORTAMENTO PARA MENSAGENS CONSOLIDADAS

Se o usuário manda:

“opa”

“boa noite”

“pode dizer”

em 3 mensagens seguidas, o consolidator deve montar isso como um batch, e o timing deve usar:

inboundMessageCount = 3

inboundChars = soma dos textos

stage = ROLE_CHECK

Regra de envio

Responder uma vez só, depois de:

lock por telefone;

cálculo do pacing;

dedupe por batchKey.

17) ANTI-DUPLICAÇÃO NO SENDER

Mesmo com lock, eu adicionaria dedupe no envio final.

Chave
sendDedupKey = `${phone}:${batchVersion}:${messageTemplateId}:${outboundTextHash}`
Regra

Se já enviou essa chave:

não envia de novo.

18) METADATA NOVA NO LEAD

Acrescente estes campos ao JSONB:

{
  "pacing": {
    "lastInboundAt": "2026-03-02T23:10:00Z",
    "lastOutboundAt": "2026-03-02T23:10:08Z",
    "nextEligibleSendAt": "2026-03-02T23:10:12Z",
    "customerServiceWindowUntil": "2026-03-03T23:10:00Z",
    "transportSupportsTyping": true,
    "lastTypingDurationMs": 3200,
    "lastReadDelayMs": 1800,
    "lastDecisionDelayMs": 1400,
    "lastTotalDelayMs": 6700,
    "lastBatchVersion": 4,
    "lastSendDedupKey": "5511999999999:4:ROLE_CHECK:abc123"
  },
  "compliance": {
    "optOutStatus": "active",
    "lastOptOutSignal": null,
    "qualityRiskScore": "low",
    "followupCountCurrentThread": 1,
    "coldOutreachStage": "opening"
  }
}
19) SERVIÇO NOVO RECOMENDADO
humanPacing.service.ts
Responsabilidades

calcular delays;

decidir se usa typing;

calcular nextEligibleSendAt;

fornecer caps por estágio;

registrar métricas de pacing.

Interface
type HumanPacingInput = {
  phone: string;
  stage: string;
  inboundChars: number;
  inboundMessageCount: number;
  outboundChars: number;
  transportSupportsTyping: boolean;
  isFollowup: boolean;
  isObjection: boolean;
};

type HumanPacingPlan = {
  readDelayMs: number;
  decisionDelayMs: number;
  typingDelayMs: number;
  jitterMs: number;
  totalDelayMs: number;
  useTyping: boolean;
  splitIntoBubbles: boolean;
  bubbleGapMs?: number;
  nextEligibleSendAt: string;
};
20) IMPLEMENTAÇÃO DE REFERÊNCIA
function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calcReadDelay(inboundChars: number, inboundMessageCount: number) {
  const base = clamp(700 + inboundChars * 18, 1000, 6000);
  const burstExtra = Math.min(Math.max(inboundMessageCount - 1, 0) * 400, 1600);
  return base + burstExtra;
}

function calcTypingDelay(outboundChars: number) {
  return clamp(900 + outboundChars * 45, 1500, 9000);
}

function calcDecisionDelay(stage: string) {
  switch (stage) {
    case "ROLE_CHECK":
      return randomInt(800, 1800);
    case "RB_CHANNEL_DIAGNOSIS":
      return randomInt(1200, 2500);
    case "OBJECTION_HANDLING":
      return randomInt(1800, 4200);
    case "MEETING_PROPOSAL":
      return randomInt(1200, 2400);
    default:
      return randomInt(1000, 2200);
  }
}

function applyCap(totalDelayMs: number, outboundChars: number) {
  if (outboundChars <= 35) return Math.min(totalDelayMs, 8000);
  if (outboundChars <= 100) return Math.min(totalDelayMs, 15000);
  if (outboundChars <= 180) return Math.min(totalDelayMs, 25000);
  return Math.min(totalDelayMs, 30000);
}

function buildHumanPacingPlan(input: HumanPacingInput): HumanPacingPlan {
  const readDelayMs = calcReadDelay(input.inboundChars, input.inboundMessageCount);
  const decisionDelayMs = calcDecisionDelay(input.stage);
  const typingDelayMs = calcTypingDelay(input.outboundChars);
  const base = readDelayMs + decisionDelayMs + typingDelayMs;
  const jitterMs = Math.round(base * ((Math.random() * 0.30) - 0.12));
  const totalDelayMs = applyCap(base + jitterMs, input.outboundChars);

  return {
    readDelayMs,
    decisionDelayMs,
    typingDelayMs,
    jitterMs,
    totalDelayMs,
    useTyping: input.transportSupportsTyping,
    splitIntoBubbles: false,
    nextEligibleSendAt: new Date(Date.now() + totalDelayMs + 2000).toISOString()
  };
}
21) EXECUÇÃO DO SEND COM TYPING
async function sendMessageHumanized(ctx: {
  phone: string;
  text: string;
  stage: string;
  inboundChars: number;
  inboundMessageCount: number;
  transportSupportsTyping: boolean;
}) {
  const plan = buildHumanPacingPlan({
    phone: ctx.phone,
    stage: ctx.stage,
    inboundChars: ctx.inboundChars,
    inboundMessageCount: ctx.inboundMessageCount,
    outboundChars: ctx.text.length,
    transportSupportsTyping: ctx.transportSupportsTyping,
    isFollowup: false,
    isObjection: false
  });

  const preTyping = plan.readDelayMs + plan.decisionDelayMs;
  const typingOnly = Math.max(1200, plan.totalDelayMs - preTyping);

  await sleep(preTyping);

  if (plan.useTyping) {
    await transport.setTyping(ctx.phone, true);
  }

  await sleep(typingOnly);

  await transport.sendMessage(ctx.phone, ctx.text);

  if (plan.useTyping) {
    await transport.setTyping(ctx.phone, false);
  }

  await leadRepo.patchProspecting(ctx.phone, {
    pacing: {
      lastOutboundAt: new Date().toISOString(),
      nextEligibleSendAt: plan.nextEligibleSendAt,
      lastTypingDurationMs: typingOnly,
      lastReadDelayMs: plan.readDelayMs,
      lastDecisionDelayMs: plan.decisionDelayMs,
      lastTotalDelayMs: plan.totalDelayMs
    }
  });
}
22) REGRAS DE UX PARA O BOT
Deve

responder rápido o suficiente para manter o fio;

não responder instantaneamente;

encurtar mensagens se o lead estiver corrido;

respeitar janela de atendimento;

parar ao primeiro opt-out claro.

Não deve

simular conversa humana com delays absurdos;

mandar 3 bolhas sem necessidade;

seguir follow-up após pedido de parada;

responder em duplicidade;

transformar delay em muleta para texto ruim.

23) ADDENDUM FINAL PARA O SEU PLAYBOOK

Você pode incorporar estas normas:

Módulo de pacing humano:
- toda resposta do bot deve passar por cálculo de read delay, decision delay, typing delay e jitter;
- o typing delay deve ser proporcional ao tamanho do texto;
- se o transport suportar presença/typing, o bot pode exibir indicador de digitação durante o intervalo de typing;
- se não suportar, o sistema deve apenas atrasar o envio;
- deve existir cap de tempo total por tamanho de mensagem;
- deve existir nextEligibleSendAt por telefone;
- follow-ups não devem ocorrer em minutos para prospecção fria;
- qualquer opt-out deve suprimir novos envios;
- o pacing não substitui compliance, quality rating, messaging limits nem template rules fora da janela de 24 horas.
message.txt
17 KB