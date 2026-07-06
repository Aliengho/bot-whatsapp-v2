const memoriaIA = {};
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: "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"
});

// Número administrador
const NUMERO_RELATORIO = "258873429456@c.us";

// Armazena conversas
const conversas = {};
let ultimoId = 1000;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
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

    const texto = message.body.trim();

    try {

        // ==========================
        // COMANDOS DO ADMIN
        // ==========================
        if (message.from === NUMERO_RELATORIO) {

            if (texto.toLowerCase().startsWith('responda ')) {

                const partes = texto.split(' ');

                const id = partes[1];
                const respostaManual = partes.slice(2).join(' ');

                if (!conversas[id]) {

                    await client.sendMessage(
                        NUMERO_RELATORIO,
                        '❌ ID não encontrado.'
                    );

                    return;
                }

                await client.sendMessage(
                    conversas[id].numero,
                    respostaManual
                );

                await client.sendMessage(
                    NUMERO_RELATORIO,
                    `✅ Resposta enviada para ${conversas[id].nome}`
                );

                return;
            }
        }

        // Ignorar mensagens enviadas pelo próprio bot
        if (message.fromMe) return;

        // ==========================
        // DADOS DO CONTACTO
        // ==========================
        const contato = await message.getContact();

        // Criar ID único
        const idConversa = ++ultimoId;

        conversas[idConversa] = {
            numero: message.from,
            nome: contato.pushname || "Sem nome",
            mensagem: message.body
        };

        // ==========================
        // RELATÓRIO
        // ==========================
        await client.sendMessage(
            NUMERO_RELATORIO,
            `📩 NOVA MENSAGEM

🆔 ID: ${idConversa}

👤 Nome: ${contato.pushname || "Sem nome"}
📱 Número: ${message.from.replace('@c.us', '')}

💬 Mensagem:
${message.body}

⏰ ${new Date().toLocaleString()}

Para responder:
responda ${idConversa} sua mensagem`
        );

        // ==========================
        // IA
        // ==========================
       if (texto.toLowerCase().startsWith('ia ')) {

    const pergunta = texto.slice(3);
    const userId = message.from;

    console.log("🧠 Pergunta:", pergunta);

    // cria memória se não existir
    if (!memoriaIA[userId]) {
        memoriaIA[userId] = [];
    }

    // adiciona pergunta
    memoriaIA[userId].push({
        role: "user",
        content: pergunta
    });

    // limita memória
    if (memoriaIA[userId].length > 10) {
        memoriaIA[userId].shift();
    }

    const resposta = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
            {
                role: "system",
                content: "Você é um assistente útil e responde em português simples. Lembra do contexto da conversa."
            },
            ...memoriaIA[userId]
        ],
        temperature: 0.7,
        max_tokens: 500
    });

    const textoIA = resposta.choices[0].message.content;

    // guardar resposta
    memoriaIA[userId].push({
        role: "assistant",
        content: textoIA
    });

    await message.reply(textoIA);

    await client.sendMessage(
        NUMERO_RELATORIO,
        `🤖 IA UTILIZADA

🆔 ID: ${idConversa}
👤 Nome: ${contato.pushname || "Sem nome"}
📱 Número: ${message.from.replace('@c.us', '')}

❓ Pergunta:
${pergunta}

✅ Resposta:
${textoIA}`
    );

    return;
}
        // ==========================
        // OI
        // ==========================
        if (texto.toLowerCase() === 'oi') {

            await message.reply(
                'Olá 👋! Escreve: ia sua pergunta'
            );

            return;
        }

        // ==========================
        // MENU
        // ==========================
        if (texto.toLowerCase() === 'menu') {

            await message.reply(`📋 MENU

🤖 ia + pergunta → IA responde
👋 oi → saudação
📋 menu → opções

Exemplo:
ia quem descobriu Moçambique?`);

            return;
        }

    } catch (err) {

        console.log("❌ ERRO:", err);

        try {
            await message.reply(
                "Erro ao processar a mensagem."
            );
        } catch {}
    }
});

client.initialize();