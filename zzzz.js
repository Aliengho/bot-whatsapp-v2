const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');

// 🔴 COLOCA A TUA API KEY DA GROQ AQUI
const groq = new Groq({
    apiKey: "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"
});

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// QR CODE
client.on('qr', (qr) => {
    console.log('📱 Escaneie o QR Code:');
    qrcode.generate(qr, { small: true });
});

// CONECTADO
client.on('ready', () => {
    console.log('✅ Bot conectado!');
});

// DEBUG (ver mensagens recebidas)
client.on('message', (msg) => {
    console.log('📩:', msg.body);
});

// MENSAGENS
client.on('message', async (message) => {

    const texto = message.body.trim();

    if (message.fromMe) return;

    try {

        // 🤖 IA (ativa com "ia ")
        if (texto.toLowerCase().startsWith('ia ')) {

            const pergunta = texto.slice(3);

            console.log("🧠 Pergunta:", pergunta);

            const resposta = await groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: "Você é um assistente útil e responde em português simples."
                    },
                    {
                        role: "user",
                        content: pergunta
                    }
                ]
            });

            const textoIA = resposta.choices[0].message.content;

            await message.reply(textoIA);
            return;
        }

        // 👋 comandos normais
        if (texto.toLowerCase() === 'oi') {
            await message.reply('Olá 👋! Escreve: ia sua pergunta');
            return;
        }

        if (texto.toLowerCase() === 'menu') {
            await message.reply(`📋 MENU

ia + pergunta → IA responde
oi → saudação
menu → opções`);
            return;
        }

    } catch (err) {
        console.log("❌ ERRO IA:", err);
        await message.reply("Erro ao consultar IA.");
    }
});

client.initialize();