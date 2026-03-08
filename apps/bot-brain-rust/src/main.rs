use log::{info, error, warn};
use tonic::{transport::Server, Request, Response, Status};
use fastembed::{TextEmbedding, InitOptions, EmbeddingModel};
use redis::Commands;
use serde_json::json;
use std::sync::{Arc, Mutex};
use std::{env, time::Instant};

pub mod dolphin {
    tonic::include_proto!("dolphin");
}

use dolphin::cognitive_engine_server::{CognitiveEngine, CognitiveEngineServer};
use dolphin::{IncomingMessage, ProcessStatus};

// ─── Intent Definitions ───────────────────────────────────────
use qdrant_client::qdrant::{CreateCollectionBuilder, Distance, VectorParamsBuilder, CreateFieldIndexCollectionBuilder, FieldType, PointStruct, UpsertPointsBuilder};
use std::collections::HashMap;

struct IntentDef {
    name: &'static str,
    examples: Vec<&'static str>,
}

fn get_intents() -> Vec<IntentDef> {
    vec![
        IntentDef {
            name: "intent.interesse_servico",
            examples: vec!["como funciona o sistema?", "gostaria de saber mais sobre o crm", "quero testar o software", "me explica o produto"],
        },
        IntentDef {
            name: "intent.pergunta_preco",
            examples: vec!["qual o valor?", "quanto custa?", "tem taxa de adesao?", "me passa os planos e precos", "ta caro?"],
        },
        IntentDef {
            name: "intent.agendar",
            examples: vec!["quero agendar uma reuniao", "podemos fazer uma call?", "me liga amanha", "marcar apresentacao"],
        },
        IntentDef {
            name: "intent.suporte_tecnico",
            examples: vec!["o sistema travou", "estou com um erro na tela", "bug no kanban", "preciso de ajuda técnica", "meu lead sumiu"],
        },
        IntentDef {
            name: "intent.objecao_preco",
            examples: vec!["ta muito caro pra mim", "o valor ta alto", "vou pensar e depois falo", "nao tenho orçamento agora", "pesado pro meu bolso"],
        },
        IntentDef {
            name: "intent.transferir_humano",
            examples: vec!["quero falar com humano", "me passa pra um atendente", "alguem real ai?", "nao quero falar com robo"],
        },
    ]
}

struct SemanticRouter {
    model: Mutex<TextEmbedding>,
    embedded_intents: Vec<(String, Vec<f32>)>,
}

impl SemanticRouter {
    fn new() -> Self {
        info!("⏳ Inicializando FastEmbed e baixando modelo ONNX...");
        let mut model = TextEmbedding::try_new(
            InitOptions::new(EmbeddingModel::BGEM3)
                .with_show_download_progress(true)
        ).expect("Falha ao inicializar modelo ONNX");
        
        info!("✅ Modelo ONNX carregado. Vetorizando intenções...");
        
        let intents = get_intents();
        let mut all_texts = Vec::new();
        let mut labels = Vec::new();

        for intent in intents {
            for ex in intent.examples {
                all_texts.push(ex.to_string());
                labels.push(intent.name.to_string());
            }
        }

        let embeddings = model.embed(all_texts, None).expect("Falha ao embutir intenções base");
        
        let mut router = SemanticRouter {
            model: Mutex::new(model),
            embedded_intents: Vec::new(),
        };

        for (idx, emb) in embeddings.into_iter().enumerate() {
            router.embedded_intents.push((labels[idx].clone(), emb));
        }

        info!("🧠 Router Semântico treinado com {} frases nativas.", router.embedded_intents.len());
        router
    }

    fn classify(&self, text: &str) -> (String, f32) {
        let embeddings = self.model.lock().unwrap().embed(vec![text.to_string()], None).unwrap();
        let query_vec = &embeddings[0];

        let mut best_intent = "intent.desconhecido".to_string();
        let mut best_score: f32 = -1.0;

        for (intent_name, intent_vec) in &self.embedded_intents {
            let score = cosine_similarity(query_vec, intent_vec);
            if score > best_score {
                best_score = score;
                best_intent = intent_name.clone();
            }
        }

        (best_intent, best_score)
    }
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let mut dot = 0.0;
    let mut norm_a = 0.0;
    let mut norm_b = 0.0;
    for i in 0..a.len() {
        dot += a[i] * b[i];
        norm_a += a[i] * a[i];
        norm_b += b[i] * b[i];
    }
    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }
    dot / (norm_a.sqrt() * norm_b.sqrt())
}

// ─── Engine Definition ────────────────────────────────────────
pub struct DolphinEngine {
    router: Arc<SemanticRouter>,
    redis_url: String,
    groq_api_key: Option<String>,
    qdrant_client: Option<Arc<qdrant_client::Qdrant>>,
}

#[tonic::async_trait]
impl CognitiveEngine for DolphinEngine {
    async fn process_message(
        &self,
        request: Request<IncomingMessage>,
    ) -> Result<Response<ProcessStatus>, Status> {
        let msg = request.into_inner();
        let trace_id = format!("trace-{}", msg.message_id);
        
        let start = Instant::now();

        // 1. Semantic Routing Local (ONNX)
        let (intent, confidence) = self.router.classify(&msg.text);
        
        let rt_duration = start.elapsed();
        info!(
            "🧠 [Trace: {}] {} -> Intenção: {} (Confiança: {:.2} | Latência: {:?})",
            msg.message_id, msg.phone_id, intent, confidence, rt_duration
        );

        // Phase 8: Extract mode from tenantId suffix without protobuf changes
        let mut actual_tenant = msg.tenant_id.clone();
        let mut mode = "support";
        if actual_tenant.ends_with("|prospecting") {
            mode = "prospecting";
            actual_tenant = actual_tenant.replace("|prospecting", "");
        } else if actual_tenant.ends_with("|support") {
            actual_tenant = actual_tenant.replace("|support", "");
        }

        // 2. Publish to Redis for Maestro (Bun)
        let mut final_intent = intent.clone();
        if let Ok(client) = redis::Client::open(self.redis_url.as_str()) {
            if let Ok(mut con) = client.get_connection() {
                // Se a intenção for muito baixa, ativamos o LLM Externa (Imersão)
                let mut llm_response = None;

                if confidence < 0.85 && mode != "prospecting" {
                    info!("⚠️ Confiança baixa ({:.2}). Acionando Groq LLM Externa...", confidence);
                    final_intent = "intent.complexa_llm".to_string();
                    
                    // Fetch recent memory from Qdrant if available
                    let mut memory_context = String::new();
                    if let Some(qdrant) = &self.qdrant_client {
                        info!("🔍 Buscando memória de longo prazo no Qdrant para {} (Tenant: {})...", msg.phone_id, msg.tenant_id);
                        use qdrant_client::qdrant::{SearchPointsBuilder, Filter, Condition};
                        
                        let filter = Filter::must([
                            Condition::matches("phone", msg.phone_id.clone()),
                            Condition::matches("tenant_id", msg.tenant_id.clone())
                        ]);
                        
                        // Generate real embeddings for searching
                        let query_embeddings = self.router.model.lock().unwrap()
                            .embed(vec![msg.text.clone()], None)
                            .unwrap_or_default();
                        
                        let query_vec: Vec<f32> = if query_embeddings.is_empty() {
                            vec![0.0f32; 1024]
                        } else {
                            query_embeddings[0].clone()
                        };
                        
                        let search_res = qdrant.search_points(
                            SearchPointsBuilder::new("lead_memory", query_vec, 3)
                                .filter(filter)
                                .with_payload(true)
                        ).await;

                        match search_res {
                            Ok(response) => {
                                for point in response.result {
                                    if let Some(payload) = point.payload.get("text") {
                                        memory_context.push_str(&format!("User/Bot: {}\n", payload));
                                    }
                                }
                            },
                            Err(e) => warn!("Falha ao buscar Qdrant: {}", e),
                        }
                    }

                    if let Some(key) = &self.groq_api_key {
                        match call_groq_llm(key, &msg.text, &memory_context).await {
                            Ok(res) => {
                                info!("🤖 Groq LLM Resposta: {}", res);
                                llm_response = Some(res);
                            },
                            Err(e) => error!("❌ Erro na Groq API: {}", e)
                        }
                    } else {
                        warn!("Groq API Key não configurada. Pulando geração LLM.");
                    }
                }

                let payload = json!({
                    "type": "message.received",
                    "phone": msg.phone_id,
                    "text": msg.text,
                    "intent": final_intent,
                    "confidence": confidence,
                    "llm_response": llm_response,
                    "timestamp": msg.timestamp,
                    "latency_ms": rt_duration.as_millis(),
                    "tenantId": actual_tenant,
                    "mode": mode
                });

                let _: () = con.publish("channel:bot_events", payload.to_string()).unwrap_or_else(|e| {
                    error!("Redis publish failed: {}", e);
                });
            } else {
                warn!("Redis não conectou");
            }
        }

        // Salvar memória assíncrona (support mode + confidence baixa = contexto relevante)
        if let Some(qdrant_arc) = &self.qdrant_client {
            let qdrant_clone = Arc::clone(qdrant_arc);
            let router_clone = Arc::clone(&self.router);
            let phone_clone = msg.phone_id.clone();
            let tenant_clone = actual_tenant.clone();
            let text_clone = msg.text.clone();
            let intent_clone = final_intent.clone();

            tokio::spawn(async move {
                save_lead_memory(
                    &qdrant_clone,
                    &router_clone,
                    &phone_clone,
                    &tenant_clone,
                    &text_clone,
                    &intent_clone,
                    confidence,
                ).await;
            });
        }

        let reply = ProcessStatus {
            received: true,
            trace_id,
        };

        Ok(Response::new(reply))
    }
}

async fn call_groq_llm(api_key: &str, user_text: &str, memory: &str) -> Result<String, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    
    let system_prompt = format!(
        "Você é o Assistente de Suporte Técnico da Império Lord Master CRM. Seja direto, cortês e resolva as dúvidas do cliente de forma objetiva.\nNÃO TENTE VENDER NADA. Apenas responda ao que for perguntado com base no contexto.\n\nMemória Recente do Lead:\n{}\n\nSeja sucinto em sua resposta.",
        memory
    );

    let payload = json!({
        "model": "llama-3.1-8b-instant",
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": user_text }
        ],
        "temperature": 0.7,
        "max_tokens": 150
    });

    let res = client.post("https://api.groq.com/openai/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&payload)
        .send()
        .await?;

    let json_res: serde_json::Value = res.json().await?;
    
    if let Some(content) = json_res["choices"][0]["message"]["content"].as_str() {
        Ok(content.to_string())
    } else {
        Err("Resposta LLM inválida. Verifique limite de tokens ou API Key.".into())
    }
}
async fn init_qdrant(qdrant: &Arc<qdrant_client::Qdrant>) {
    let collection_name = "lead_memory";

    if let Ok(collections) = qdrant.list_collections().await {
        if collections.collections.iter().any(|c| c.name == collection_name) {
            info!("✅ Qdrant: Coleção '{}' detectada (1024 dims BGEM3).", collection_name);
            return;
        }
    }

    info!("🏗️ Qdrant: Inicializando coleção '{}' (1024 dims — BGEM3)...", collection_name);

    let res = qdrant.create_collection(
        CreateCollectionBuilder::new(collection_name)
            .vectors_config(VectorParamsBuilder::new(1024, Distance::Cosine))
    ).await;

    if res.is_ok() {
        // Índice por phone para filtro eficiente
        let _ = qdrant.create_field_index(
            CreateFieldIndexCollectionBuilder::new(collection_name, "phone", FieldType::Keyword)
        ).await;
        // Índice por tenant_id
        let _ = qdrant.create_field_index(
            CreateFieldIndexCollectionBuilder::new(collection_name, "tenant_id", FieldType::Keyword)
        ).await;
        // Índice por timestamp para busca recente
        let _ = qdrant.create_field_index(
            CreateFieldIndexCollectionBuilder::new(collection_name, "timestamp", FieldType::Float)
        ).await;
        info!("✅ Qdrant: Coleção 'lead_memory' criada com 1024 dims (BGEM3) e índices configurados.");
    } else {
        warn!("⚠️ Qdrant: Falha ao criar coleção: {:?}", res.err());
    }
}

// ─── Salvar memória no Qdrant após cada interação ─────────────
async fn save_lead_memory(
    qdrant: &Arc<qdrant_client::Qdrant>,
    router: &Arc<SemanticRouter>,
    phone: &str,
    tenant_id: &str,
    text: &str,
    intent: &str,
    confidence: f32,
) {
    // Gerar embedding do texto para armazenar
    let embeddings = router.model.lock().unwrap()
        .embed(vec![text.to_string()], None)
        .unwrap_or_default();

    if embeddings.is_empty() {
        warn!("Qdrant: Falha ao gerar embedding para memória de {}", phone);
        return;
    }

    let vector = embeddings[0].clone();

    // Criar payload com metadados
    let mut payload: HashMap<String, qdrant_client::qdrant::Value> = HashMap::new();
    payload.insert("phone".to_string(), phone.into());
    payload.insert("tenant_id".to_string(), tenant_id.into());
    payload.insert("text".to_string(), text.into());
    payload.insert("intent".to_string(), intent.into());
    payload.insert("confidence".to_string(), (confidence as f64).into());
    payload.insert(
        "timestamp".to_string(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs_f64()
            .into(),
    );

    // ID único baseado em phone + timestamp para evitar duplicatas exatas
    let point_id = format!("{}-{}", phone.replace("+", ""), uuid::Uuid::new_v4());
    let id_hash = point_id
        .bytes()
        .fold(0u64, |acc, b| acc.wrapping_mul(31).wrapping_add(b as u64));

    let point = PointStruct::new(id_hash, vector, payload);

    match qdrant.upsert_points(
        UpsertPointsBuilder::new("lead_memory", vec![point]).wait(false)
    ).await {
        Ok(_) => info!("🧠 Qdrant: Memória salva para {} (intent: {})", phone, intent),
        Err(e) => warn!("⚠️ Qdrant: Falha ao salvar memória: {}", e),
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    
    let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
    let groq_api_key = env::var("GROQ_API_KEY").ok();
    let qdrant_url = env::var("QDRANT_GRPC_URL").unwrap_or("http://127.0.0.1:6334".to_string());
    
    info!("🚀 Iniciando Dolphin Cérebro...");
    
    // Boot Qdrant Client
    let qdrant_client = match qdrant_client::Qdrant::from_url(&qdrant_url).build() {
        Ok(c) => {
            info!("🎒 Qdrant Client conectado com sucesso em {}", qdrant_url);
            let arc_c = Arc::new(c);
            init_qdrant(&arc_c).await;
            Some(arc_c)
        },
        Err(e) => {
            warn!("⚠️ Qdrant Client falhou: {}. LLM não terá memória de longo prazo.", e);
            None
        }
    };

    // Boot ONNX Model (Takes a few seconds on boot)
    let router = Arc::new(SemanticRouter::new());

    let engine = DolphinEngine {
        router,
        redis_url,
        groq_api_key,
        qdrant_client,
    };

    let addr = "[::]:4051".parse()?;
    info!("🦈 Motor Cognitivo Dolphin (Rust) ouvindo em {} (gRPC)", addr);

    Server::builder()
        .add_service(CognitiveEngineServer::new(engine))
        .serve(addr)
        .await?;

    Ok(())
}
