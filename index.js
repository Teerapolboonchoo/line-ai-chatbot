require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const cron = require('node-cron');
const app = express();

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

  const userText = event.message.text;

  // ถ้าขึ้นต้นด้วยคำว่า "เตือน"
  if (userText.startsWith("เตือน")) {

    const parts = userText.split(" ");
    if (parts.length < 3) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "รูปแบบไม่ถูกต้อง ตัวอย่าง: เตือน อ่านหนังสือ 20:00"
      });
    }

    const task = parts[1];
    const time = parts[2];

    const [hour, minute] = time.split(":");

    // ตั้ง cron job
    cron.schedule(`${minute} ${hour} * * *`, () => {
      client.pushMessage(event.source.userId, {
        type: "text",
        text: `🔔 ถึงเวลาแล้ว: ${task}`
      });
    });

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `ตั้งเตือน "${task}" เวลา ${time} เรียบร้อยแล้ว`
    });
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: `คุณพิมพ์ว่า: ${userText}`
  });
}


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
