require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// ================= CONFIG =================
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

// ================= SUPABASE =================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ================= WEBHOOK =================
app.post(
  '/webhook',
  line.middleware(config),
  async (req, res) => {
    try {
      await Promise.all(req.body.events.map(handleEvent));
      res.status(200).end();
    } catch (err) {
      console.error(err);
      res.status(500).end();
    }
  }
);

// ================= HANDLE EVENT =================
async function handleEvent(event) {

  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;

  if (userMessage.startsWith("เตือน")) {

    const parts = userMessage.split(" ");

    if (parts.length < 3) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "รูปแบบผิด พิมพ์แบบนี้: เตือน 21:30 อ่านหนังสือ"
      });
    }

    const time = parts[1];
    const text = parts.slice(2).join(" ");

    // 🔥 บันทึกลง Database
    const { error } = await supabase
      .from('tasks')
      .insert([
        {
          user_id: event.source.userId,
          time: time,
          text: text
        }
      ]);

    if (error) {
      console.error("Insert error:", error);
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "เกิดข้อผิดพลาดในการบันทึก"
      });
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `บันทึกแล้ว! จะเตือนเวลา ${time}`
    });
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: "พิมพ์แบบนี้นะ: เตือน 21:30 อ่านหนังสือ"
  });
}

// ================= CRON =================
cron.schedule('* * * * *', async () => {

  const now = new Date();

  const currentTime = now.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  console.log("เวลาปัจจุบัน:", currentTime);

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*');

  if (error) {
    console.error("Fetch error:", error);
    return;
  }

  for (let i = 0; i < tasks.length; i++) {

    const task = tasks[i];

    if (task.time === currentTime) {

      await client.pushMessage(task.user_id, {
        type: "text",
        text: `⏰ ถึงเวลาแล้ว: ${task.text}`
      });

      // 🔥 ลบหลังแจ้งเตือน
      await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);

      console.log("แจ้งเตือนแล้ว:", task.text);
    }
  }

}, {
  timezone: "Asia/Bangkok"
});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
