import Message from '../models/Message.js';
import Task from '../models/Task.js';
import Document from '../models/Document.js';

const DEFAULT_DOCS = {
  general: '# Genel Toplantı ve Mimari Notları\n\nBuraya takımca gerçek zamanlı notlar ve kod şablonları ekleyebilirsiniz.\n\n```javascript\nconst status = "TeamSync AI Aktif";\nconsole.log(status);\n```',
  development: '# Teknik Mimari & API Kontratları\n\n- Backend: Node.js, Express, Socket.io (Port 5001)\n- Veritabanı: MongoDB Atlas\n- Frontend: React, Vite, Tailwind CSS v4',
  'sprint-planning': '# Sprint Hedefleri\n\n1. Gerçek zamanlı iletişim altyapısı\n2. Kanban görev otomasyonu\n3. Canlı analitik ve raporlama'
};

export const seedInitialData = async () => {
  try {
    const taskCount = await Task.countDocuments();
    if (taskCount === 0) {
      await Task.insertMany([
        {
          room: 'general',
          title: ' WebSocket (Socket.io) oda izolasyonu ve bağlantı testleri',
          status: 'done',
          priority: 'high',
          assignee: 'Faruk_Lead',
          subtasks: [
            { title: 'join_room event yapısını kur', completed: true },
            { title: 'CORS yapılandırmasını tamamla', completed: true }
          ]
        },
        {
          room: 'general',
          title: 'Gemini AI asistanının /plan ve /task komutlarıyla entegrasyonu',
          status: 'in-progress',
          priority: 'high',
          assignee: 'Faruk_Lead',
          subtasks: [
            { title: 'Prompt şablonlarını hazırla', completed: true },
            { title: 'Otomatik Kanban kartı üretimini test et', completed: false }
          ]
        },
        {
          room: 'general',
          title: 'Sprint raporu dışa aktarma (.md ve .json) modülü',
          status: 'todo',
          priority: 'medium',
          assignee: 'Dev_Team',
          subtasks: [
            { title: 'Markdown şablonunu oluştur', completed: false }
          ]
        }
      ]);
    }

    const msgCount = await Message.countDocuments();
    if (msgCount === 0) {
      await Message.insertMany([
        {
          room: 'general',
          sender: 'Faruk_Lead',
          senderId: 'seed-1',
          text: 'Selam ekip! TeamSync AI çalışma alanımız aktif. Üst menüden Kanban panosuna ve canlı dokümanlara geçebilirsiniz.',
          isAi: false,
          isPinned: true
        },
        {
          room: 'general',
          sender: 'TeamSync AI',
          senderId: 'ai-bot',
          text: '🤖 Merhaba! Ben TeamSync AI. Sohbete `/plan [konu]`, `/task [görev]`, `/poll Soru | Şık1 | Şık2` veya `/ai [soru]` yazarak otomasyonları tetikleyebilirsiniz.',
          isAi: true
        }
      ]);
    }
  } catch (error) {
    console.error('Seed hatası:', error.message);
  }
};

export const getMessagesByRoom = async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room })
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTasksByRoom = async (req, res) => {
  try {
    const tasks = await Task.find({ room: req.params.room }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDocByRoom = async (req, res) => {
  try {
    const { room } = req.params;
    let doc = await Document.findOne({ room });
    if (!doc) {
      doc = await Document.create({
        room,
        content: DEFAULT_DOCS[room] || '# Kanal Dokümanı\n\nNotlarınızı buraya yazın...'
      });
    }
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};