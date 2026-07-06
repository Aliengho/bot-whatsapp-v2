const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();

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
// WHATSAPP CLIENT (RENDER SAFE)
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
// QR CODE
// ==========================
client.on('qr', (qr) => {
    console.log('📱 Escaneia o QR Code:');
    qrcode.generate(qr, { small: true });
});

// ==========================
// READY
// ==========================
client.on('ready', async () => {
    console.log('✅ Bot conectado!');

    try {
        await client.sendMessage(
            NUMERO_RELATORIO,
            '✅ Bot online no Render!'
        );
    } catch (err) {
        console.log(err);
    }
});

// ==========================
// MENSAGENS
// ==========================
client.on('message', async (message) => {

    const texto = message.body.trim();

    try {

        // ==========================
        // IGNORAR BOT
        // ==========================
        if (message.fromMe) return;

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

💬 ${message.body}`
        );

        // ==========================
        // COMANDOS
        // ==========================
        if (texto.toLowerCase() === 'oi') {
            return message.reply('Olá 👋');
        }

        if (texto.toLowerCase() === 'menu') {
            return message.reply(`📋 MENU

oi → saudação
menu → opções`);
        }

        // ==========================
        // ADMIN RESPOSTA
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
            }
        }

    } catch (err) {
        console.log("ERRO:", err);
    }
});

// ==========================
// EXPRESS SERVER (RENDER)
// ==========================
app.get('/', (req, res) => {
    res.send('Bot WhatsApp ativo 🚀');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
});

// ==========================
// START BOT
// ==========================
client.initialize();