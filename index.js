require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const cron = require('node-cron');
const app = express();

let tasks = [];

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};


const client = new line.Client(config);

app.post(
  '/webhook',
  line.middleware(config),
  (req, res) => {
    Promise
      .all(req.body.events.map(handleEvent))
      .then((result) => res.json(result))
      .catch((err) => {
        console.error(err);
        res.status(500).end();
      });
  }
);


function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;

  // รูปแบบ: เตือน 21:30 อ่านหนังสือ
  if (userMessage.startsWith("เตือน")) {

    const parts = userMessage.split(" ");
    const time = parts[1]; // 21:30
    const text = parts.slice(2).join(" "); // อ่านหนังสือ

    tasks.push({
      time,
      text,
      userId: event.source.userId
    });

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

cron.schedule('* * * * *', async () => {
  const now = new Date();
  const currentTime =
    now.getHours().toString().padStart(2, '0') +
    ':' +
    now.getMinutes().toString().padStart(2, '0');

  tasks.forEach(async (task) => {
    if (task.time === currentTime) {
      await client.pushMessage(task.userId, {
        type: "text",
        text: `⏰ ถึงเวลาแล้ว: ${task.text}`
      });
    }
  });
});
