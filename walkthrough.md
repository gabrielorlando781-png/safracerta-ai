# SafraCerta.ai - Walkthrough 🚜🌾

O sistema SafraCerta.ai foi implementado com sucesso como uma aplicação completa e funcional para gestão agrícola inteligente.

## 🚀 O que foi construído

1.  **Backend Robusto**: Servidor Node.js com persistência de dados local (JSON) e suporte para fotos de pragas.
2.  **Interface Premium**: Design mobile-first com foco em alta usabilidade para o produtor rural, utilizando cores da natureza e grandes áreas de toque.
3.  **Inteligência de Linguagem (NLP)**: Motor de processamento que entende comandos como *"Gastei 200 reais com diesel no talhão 1"* ou *"Vendi 50 sacas de soja"*.
4.  **Monitoramento de Pragas (MIP)**: Integração com TensorFlow.js para análise de imagens diretamente no navegador, identificando pragas comuns (Pulgão, Lagarta, Percevejo).
5.  **Resiliência Offline**: Sistema de cache em LocalStorage que permite registrar dados no campo sem internet e sincronizar automaticamente ao retornar à sede.

## 📸 Demonstração do Dashboard

![Dashboard Background](file:///C:/Users/gabri/.gemini/antigravity/brain/e2b957c2-373e-4a06-a2a4-d869b9ca015f/safracerta_dashboard_bg_1777655597638.png)

## 🛠️ Como testar agora

1.  O servidor já está rodando em `http://localhost:3000`.
2.  Abra o navegador e acesse o endereço.
3.  **Teste de Voz**: Clique no ícone do microfone e diga: *"Gastei duzentos reais com sementes de soja"*. A IA irá categorizar e atualizar o gráfico instantaneamente.
4.  **Teste de Pragas**: Vá na aba "Pragas", clique em "Analisar Agora" (permita o acesso à câmera). A IA irá processar o que a câmera vê em tempo real.
5.  **Teste Offline**: Desligue o Wi-Fi, registre uma atividade, e ligue novamente. O sistema irá sincronizar os dados com o servidor automaticamente.

## 📂 Estrutura de Arquivos

- `server.js`: Lógica do servidor e API.
- `public/index.html`: Interface principal (SPA).
- `public/js/nlp.js`: O "cérebro" que entende o produtor.
- `public/js/mip.js`: O motor de visão computacional.
- `public/js/app.js`: Coordenação geral e sincronismo offline.

---
**Status**: Pronto para uso e demonstração.
