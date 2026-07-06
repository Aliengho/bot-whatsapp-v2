const memoriaIA = {};

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');
const express = require('express');

const app = express();

// ==========================
// GROQ IA
// ==========================
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// ==========================
// ADMIN
// ==========================
const NUMERO_RELATORIO = "258873429456@c.us";

// ==========================
// DADOS
// ==========================
const conversas = {};
let ultimoId = 1000;

// ==========================
// WHATSAPP CLIENT (FIX RENDER)
// ==========================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

// ==========================
// QR CODE (Render logs)
// ==========================
client.on('qr', (qr) => {
    console.log('📱 Escaneia o QR Code abaixo:');
    qrcode.generate(qr, { small: true });
});

// ==========================
// READY
// ==========================
client.on('ready', async () => {
    console.log('✅ Bot conectado com sucesso!');

    try {
        await client.sendMessage(
            NUMERO_RELATORIO,
            '✅ Bot iniciado com sucesso no Render!'
        );
    } catch (err) {
        console.log("Erro ao enviar mensagem admin:", err);
    }
});

// ==========================
// MENSAGENS
// ==========================
client.on('message', async (message) => {

    const texto = message.body.trim();

    try {

        // ==========================
        // ADMIN
        // ==========================
        if (message.from === NUMERO_RELATORIO) {

            if (texto.toLowerCase().startsWith('responda ')) {

                const partes = texto.split(' ');
                const id = partes[1];
                const resposta = partes.slice(2).join(' ');

                if (!conversas[id]) return;

                await client.sendMessage(conversas[id].numero, resposta);

                await client.sendMessage(
                    NUMERO_RELATORIO,
                    `✅ Respondido ID ${id}`
                );

                return;
            }
        }

        if (message.fromMe) return;

        // ==========================
        // CONTACTO
        // ==========================
        const contato = await message.getContact();
        const idConversa = ++ultimoId;

        conversas[idConversa] = {
            numero: message.from,
            nome: contato.pushname || "Sem nome",
            mensagem: message.body
        };

        // ==========================
        // RELATÓRIO ADMIN
        // ==========================
        await client.sendMessage(
            NUMERO_RELATORIO,
            `📩 NOVA MENSAGEM

🆔 ID: ${idConversa}
👤 Nome: ${contato.pushname || "Sem nome"}
📱 Número: ${message.from.replace('@c.us', '')}

💬 Mensagem:
${message.body}`
        );

        // ==========================
        // IA (GROQ)
        // ==========================
        if (texto.toLowerCase().startsWith('ia ')) {

            const pergunta = texto.slice(3);
            const userId = message.from;

            if (!memoriaIA[userId]) {
                memoriaIA[userId] = [];
            }

            memoriaIA[userId].push({
                role: "user",
                content: pergunta
            });

            if (memoriaIA[userId].length > 10) {
                memoriaIA[userId].shift();
            }

            const resposta = await groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: "Responde em português simples e direto."
                    },
                    ...memoriaIA[userId]
                ],
                temperature: 0.7,
                max_tokens: 500
            });

            const textoIA = resposta.choices[0].message.content;

            memoriaIA[userId].push({
                role: "assistant",
                content: textoIA
            });

            await message.reply(textoIA);

            return;
        }

        // ==========================
        // COMANDOS SIMPLES
        // ==========================
        if (texto.toLowerCase() === 'oi') {
            return message.reply('Olá 👋 escreve: ia sua pergunta');
        }

        if (texto.toLowerCase() === 'menu') {
            return message.reply(`📋 MENU

🤖 ia + pergunta
👋 oi
📋 menu`);
        }

    } catch (err) {
        console.log("ERRO:", err);
    }
});

// ==========================
// EXPRESS (Render Web Service)
// ==========================
app.get('/', (req, res) => {
    res.send('Bot WhatsApp ativo 🚀');
});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
});

// ==========================
// START BOT
// ==========================
client.initialize();