const FENCE = '\x60\x60\x60';

export const INITIAL_WORKSPACE_DATA = {
  general: {
    messages: [
      {
        _id: 'seed-msg-gen-1',
        room: 'general',
        sender: 'Faruk_Lead',
        senderId: 'seed-1',
        text: 'Selam ekip! TeamSync AI çalışma alanımız aktif. Üst menüden Kanban panosuna, canlı ortak dokümana ve sprint analitiğine geçebilirsiniz.',
        isAi: false,
        isPinned: true,
        reactions: { '🚀': 3, '🔥': 2 }
      },
      {
        _id: 'seed-msg-gen-2',
        room: 'general',
        sender: 'TeamSync AI',
        senderId: 'ai-bot',
        text: '🤖 Merhaba! Ben TeamSync AI. Sohbete /plan [konu], /task [görev], /poll Soru | Şık1 | Şık2 veya /ai [soru] yazarak otomasyonları anında tetikleyebilirsiniz.',
        isAi: true,
        isPinned: false,
        reactions: { '👍': 2 }
      },
      {
        _id: 'seed-msg-gen-3',
        room: 'general',
        sender: 'Ece_Frontend',
        senderId: 'seed-2',
        text: 'Kanban sürükle-bırak ve ⌘K hızlı komut paleti entegrasyonunu tamamladım, kanal geçişleri anlık çalışıyor.',
        isAi: false,
        isPinned: false,
        reactions: { '❤️': 2 }
      },
      {
        _id: 'seed-msg-gen-4',
        room: 'general',
        sender: 'Mert_Backend',
        senderId: 'seed-3',
        text: '📊 Anket: Önbellek Katmanı Tercihi?',
        isAi: false,
        isPinned: false,
        reactions: {},
        poll: {
          question: 'Önbellek Katmanı Tercihi?',
          options: [
            { text: 'Redis Cluster', votes: 4 },
            { text: 'Upstash Serverless', votes: 2 },
            { text: 'In-Memory LRU', votes: 1 }
          ]
        }
      }
    ],
    tasks: [
      {
        _id: 'seed-task-gen-1',
        room: 'general',
        title: 'WebSocket (Socket.io) oda izolasyonu ve bağlantı testleri',
        status: 'done',
        priority: 'high',
        assignee: 'Faruk_Lead',
        subtasks: [
          { _id: 'st-gen-1', title: 'join_room event yapısını kur', completed: true },
          { _id: 'st-gen-2', title: 'CORS yapılandırmasını tamamla', completed: true }
        ]
      },
      {
        _id: 'seed-task-gen-2',
        room: 'general',
        title: 'Gemini AI asistanının /plan ve /task komutlarıyla entegrasyonu',
        status: 'in-progress',
        priority: 'high',
        assignee: 'Faruk_Lead',
        subtasks: [
          { _id: 'st-gen-3', title: 'Prompt şablonlarını hazırla', completed: true },
          { _id: 'st-gen-4', title: 'Otomatik Kanban kartı üretimini doğrula', completed: false }
        ]
      },
      {
        _id: 'seed-task-gen-3',
        room: 'general',
        title: 'Gerçek zamanlı ortak doküman (800ms Debounce Auto-Save)',
        status: 'done',
        priority: 'medium',
        assignee: 'Ece_Frontend',
        subtasks: [
          { _id: 'st-gen-5', title: 'Canlı soket senkronizasyonunu tamamla', completed: true }
        ]
      },
      {
        _id: 'seed-task-gen-4',
        room: 'general',
        title: 'Sprint raporu dışa aktarma (.md ve .json) modülü',
        status: 'todo',
        priority: 'medium',
        assignee: 'Mert_Backend',
        subtasks: [
          { _id: 'st-gen-6', title: 'Markdown çıktı şablonunu oluştur', completed: false }
        ]
      }
    ],
    doc: `# Genel Toplantı ve Mimari Notları\n\nBuraya takımca gerçek zamanlı notlar ve kod şablonları ekleyebilirsiniz.\n\n${FENCE}javascript\nconst status = "TeamSync AI Aktif";\nconsole.log(status);\n${FENCE}`
  },
  development: {
    messages: [
      {
        _id: 'seed-msg-dev-1',
        room: 'development',
        sender: 'Faruk_Lead',
        senderId: 'seed-1',
        text: `REST + WebSocket hibrit katmanında Optimistic UI yapısına geçtik. Örnek middleware şablonu:\n${FENCE}javascript\nexport const verifyWorkspaceSession = (req, res, next) => {\n  const requestId = req.headers['x-request-id'] || crypto.randomUUID();\n  req.context = { requestId, timestamp: Date.now() };\n  next();\n};\n${FENCE}`,
        isAi: false,
        isPinned: true,
        reactions: { '🔥': 3 }
      },
      {
        _id: 'seed-msg-dev-2',
        room: 'development',
        sender: 'Mert_Backend',
        senderId: 'seed-3',
        text: 'MongoDB indeksleri room alanına eklendi, sorgu süreleri 15ms altına indi.',
        isAi: false,
        isPinned: false,
        reactions: { '🚀': 2 }
      }
    ],
    tasks: [
      {
        _id: 'seed-task-dev-1',
        room: 'development',
        title: 'Optimistic UI ve LocalStorage önbellek senkronizasyonu',
        status: 'done',
        priority: 'high',
        assignee: 'Faruk_Lead',
        subtasks: [
          { _id: 'st-dev-1', title: 'Sıfır gecikmeli kanal geçişi', completed: true },
          { _id: 'st-dev-2', title: 'Arka plan veri birleştirme', completed: true }
        ]
      },
      {
        _id: 'seed-task-dev-2',
        room: 'development',
        title: 'API Rate Limiting ve güvenlik başlıkları (Helmet)',
        status: 'in-progress',
        priority: 'medium',
        assignee: 'Mert_Backend',
        subtasks: [
          { _id: 'st-dev-3', title: 'Express middleware entegrasyonu', completed: true },
          { _id: 'st-dev-4', title: 'Yük testi kontrolü', completed: false }
        ]
      }
    ],
    doc: '# Teknik Mimari & API Kontratları\n\n- Backend: Node.js, Express, Socket.io\n- Veritabanı: MongoDB Atlas\n- Frontend: React, Vite, Tailwind CSS, Optimistic Cache'
  },
  'sprint-planning': {
    messages: [
      {
        _id: 'seed-msg-sp-1',
        room: 'sprint-planning',
        sender: 'Faruk_Lead',
        senderId: 'seed-1',
        text: 'Sprint 4 hedefleri netleşti. Sol menüdeki "AI Sprint Planla (/plan)" butonuyla yeni modülleri otomatik görevlere bölebilirsiniz.',
        isAi: false,
        isPinned: true,
        reactions: { '🚀': 2 }
      },
      {
        _id: 'seed-msg-sp-2',
        room: 'sprint-planning',
        sender: 'Ece_Frontend',
        senderId: 'seed-2',
        text: 'Analitik sekmesinden sprint sonunda tek tıkla .md ve .json raporu alabiliyoruz.',
        isAi: false,
        isPinned: false,
        reactions: { '👍': 2 }
      }
    ],
    tasks: [
      {
        _id: 'seed-task-sp-1',
        room: 'sprint-planning',
        title: 'Q4 Ürün Yol Haritası ve Sprint Kapasite Planlaması',
        status: 'done',
        priority: 'high',
        assignee: 'Faruk_Lead',
        subtasks: [
          { _id: 'st-sp-1', title: 'Story point dağılımını belirle', completed: true }
        ]
      },
      {
        _id: 'seed-task-sp-2',
        room: 'sprint-planning',
        title: 'İK ve Canlı Demo Rol Geçiş Senaryoları',
        status: 'done',
        priority: 'medium',
        assignee: 'Ece_Frontend',
        subtasks: [
          { _id: 'st-sp-2', title: 'Tek tıkla profil geçişlerini doğrula', completed: true }
        ]
      },
      {
        _id: 'seed-task-sp-3',
        room: 'sprint-planning',
        title: 'Mobil ve Tablet Görünüm İyileştirmeleri',
        status: 'todo',
        priority: 'low',
        assignee: 'Ece_Frontend',
        subtasks: [
          { _id: 'st-sp-3', title: 'Responsive kırılımları test et', completed: false }
        ]
      }
    ],
    doc: '# Sprint Hedefleri\n\n1. Sıfır gecikmeli gerçek zamanlı iletişim altyapısı\n2. Yapay zeka destekli Kanban görev otomasyonu\n3. Canlı analitik ve dışa aktarılabilir raporlama'
  }
};
