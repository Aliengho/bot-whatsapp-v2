package com.example.passwordgenerator;

import android.content.ClipboardManager;
import android.content.ClipData;
import android.content.Context;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONObject;

import java.io.IOException;

import okhttp3.*;

public class MainActivity extends AppCompatActivity {

    EditText edtTamanho;
    Button btnGerar, btnCopiar;
    TextView txtSenha;

    // 🔴 COLOCA A TUA CHAVE AQUI
    private static final String GROQ_API_KEY = "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";

    OkHttpClient client = new OkHttpClient();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        edtTamanho = findViewById(R.id.edtTamanho);
        btnGerar = findViewById(R.id.btnGerar);
        btnCopiar = findViewById(R.id.btnCopiar);
        txtSenha = findViewById(R.id.txtSenha);

        btnGerar.setOnClickListener(v -> {

            String texto = edtTamanho.getText().toString();

            if (texto.isEmpty()) {
                txtSenha.setText("Digite um tamanho!");
                return;
            }

            int tamanho = Integer.parseInt(texto);

            chamarIA(tamanho);
        });

        btnCopiar.setOnClickListener(v -> {

            String senha = txtSenha.getText().toString();

            if (senha.isEmpty() ||
                    senha.contains("Digite") ||
                    senha.contains("Erro")) {

                txtSenha.setText("Gere uma senha primeiro!");
                return;
            }

            ClipboardManager clipboard =
                    (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);

            ClipData clip =
                    ClipData.newPlainText("senha", senha);

            clipboard.setPrimaryClip(clip);

            txtSenha.setText("✔ Senha copiada com sucesso!");
        });
    }

    // ================= IA GROQ =================
    void chamarIA(int tamanho) {

        String prompt = "Gera uma senha forte de " + tamanho +
                " caracteres e diz se é fraca, média ou forte";

        String json = "{"
                + "\"model\":\"llama-3.1-8b-instant\","
                + "\"messages\":[{\"role\":\"user\",\"content\":\"" + prompt + "\"}]"
                + "}";

        RequestBody body = RequestBody.create(
                json,
                MediaType.get("application/json; charset=utf-8")
        );

        Request request = new Request.Builder()
                .url("https://api.groq.com/openai/v1/chat/completions")
                .addHeader("Authorization", "Bearer " + GROQ_API_KEY)
                .addHeader("Content-Type", "application/json")
                .post(body)
                .build();

        client.newCall(request).enqueue(new Callback() {

            @Override
            public void onFailure(Call call, IOException e) {
                runOnUiThread(() ->
                        txtSenha.setText("Erro de ligação: " + e.getMessage()));
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {

                String res = response.body() != null ? response.body().string() : "";

                try {
                    JSONObject obj = new JSONObject(res);

                    if (obj.has("error")) {
                        runOnUiThread(() ->
                                txtSenha.setText("Erro IA: chave inválida ou sem acesso"));
                        return;
                    }

                    String respostaIA =
                            obj.getJSONArray("choices")
                                    .getJSONObject(0)
                                    .getJSONObject("message")
                                    .getString("content");

                    runOnUiThread(() ->
                            txtSenha.setText(respostaIA));

                } catch (Exception e) {
                    runOnUiThread(() ->
                            txtSenha.setText("Erro JSON: " + e.getMessage()));
                }
            }
        });
    }
}