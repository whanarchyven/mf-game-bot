require('dotenv').config(); // Подключаем переменные окружения
const TelegramBot = require('node-telegram-bot-api');
const {MongoClient} = require('mongodb');

// Получаем переменные окружения
const token = process.env.TELEGRAM_BOT_TOKEN;
const mongoConnectionString = process.env.MONGO_DB_CONNECTION_STRING;

if (!token || !mongoConnectionString) {
    throw new Error("Отсутствуют необходимые переменные окружения в .env");
}

// Создаём экземпляр бота
const bot = new TelegramBot(token, {polling: true});

// Подключаемся к MongoDB
const client = new MongoClient(mongoConnectionString);
console.log("Подключение к MongoDB...");
client.connect()
    .then(() => {
        console.log("Успешное подключение к MongoDB");
    })
    .catch((err) => {
        console.error("Ошибка подключения к MongoDB:", err);
    });

const db = client.db('metaforest-backend'); // Выбираем базу данных
const referralsCollection = db.collection('referrals'); // Создаём/подключаем коллекцию

// Обработка входящих сообщений
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    let referralParam = '';

    // Если сообщение начинается с команды /start, проверяем наличие параметра
    if (msg.text && msg.text.startsWith('/start')) {
        const parts = msg.text.split(' ');
        if (parts.length > 1) {
            referralParam = decodeURIComponent(parts[1]);

            // Сохраняем реферальный параметр в MongoDB
            if (referralParam.length > 0) {
                const referrer = await db.collection('metaforest-game').findOne({'user.userInfo.id': referralParam})
                if (referrer) { //если найден
                    try {
                        // await db.collection('metaforest-game').findOneAndUpdate({'user.userInfo.id': referralParam}, {
                        //     $push: {
                        //         referrals: msg.from.id
                        //     }
                        // })
                        const isReferrerExist = await referralsCollection.findOne({user_id: msg.from.id})
                        if (!isReferrerExist) {
                            await referralsCollection.insertOne({user_id: msg.from.id, referrer: referralParam})
                            console.log(`Сохранён реферал: ${referralParam} для пользователя ${msg.from.id}`);
                        }
                    } catch (err) {
                        console.error("Ошибка сохранения в MongoDB:", err);
                    }

                }
            }
        }
    }

    // Формируем URL для открытия веб-приложения
    let webAppUrl = 'https://zaburdaev.space/';


    console.log(`Referral parameter: ${referralParam}`);

    // Отправляем сообщение с кнопкой для открытия WebView
    bot.sendMessage(chatId, `Открыть приложение`, {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: `Открыть приложение`,
                        web_app: {url: webAppUrl}
                    }
                ]
            ]
        }
    });
});
