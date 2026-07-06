const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: "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"
});

// Número que receberá os relatórios
const NUMERO_RELATORIO = "258873429456@c.us";

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
client.on('ready', async () => {
    console.log('✅ Bot conectado!');

    try {
        await client.sendMessage(
            NUMERO_RELATORIO,
            '✅ Bot iniciado e sistema de relatórios ativo.'
        );
    } catch (err) {
        console.log('Erro ao enviar mensagem de teste:', err);
    }
});

// MENSAGENS
client.on('message', async (message) => {

    if (message.fromMe) return;

    const texto = message.body.trim();

    try {

        // ===== RELATÓRIO DE MENSAGEM RECEBIDA =====
        const contato = await message.getContact();

        await client.sendMessage(
            NUMERO_RELATORIO,
            `📩 NOVA MENSAGEM

👤 Nome: ${contato.pushname || "Sem nome"}
📱 Número: ${message.from.replace('@c.us', '')}

💬 Mensagem:
${message.body}

⏰ ${new Date().toLocaleString()}`
        );

        // ===== IA =====
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

            // ===== RELATÓRIO DA RESPOSTA DA IA =====
            await client.sendMessage(
                NUMERO_RELATORIO,
                `🤖 IA UTILIZADA

👤 Nome: ${contato.pushname || "Sem nome"}
📱 Número: ${message.from.replace('@c.us', '')}

❓ Pergunta:
${pergunta}

✅ Resposta:
${textoIA}

⏰ ${new Date().toLocaleString()}`
            );

            return;
        }

        // ===== COMANDO OI =====
        if (texto.toLowerCase() === 'oi') {

            await message.reply(
                'Olá 👋! Escreve: ia sua pergunta'
            );

            return;
        }

        // ===== COMANDO MENU =====
        if (texto.toLowerCase() === 'menu') {

            await message.reply(`📋 MENU

ia + pergunta → IA responde
oi → saudação
menu → opções`);

            return;
        }

    } catch (err) {

        console.log("❌ ERRO:", err);

        try {
            await message.reply("Erro ao processar a mensagem.");
        } catch {}
    }
});

client.initialize();