# P3 Economia · Crescimento Econômico (Mankiw, Cap. 8 e 9)

Site estático de revisão para prova de múltipla escolha: revisão conceitual dos capítulos (sem fórmulas), vídeo animado e narrado de revisão, diagramas interativos do modelo de Solow, quiz com explicações (treino ou simulado cronometrado), flashcards com repetição espaçada, jogos (V ou F, choques nível × crescimento, associação autor ↔ ideia), respostas-modelo da atividade do professor, busca (atalho `/`) e cola para imprimir. Tema claro/escuro, progresso salvo no navegador (localStorage).

## Rodar localmente
```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Publicar no GitHub Pages
1. Crie o repositório e envie os arquivos (os PDFs, livro e atividade, estão no `.gitignore`).
2. Em **Settings → Pages**, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
3. O site fica em `https://<usuario>.github.io/<repositorio>/`.

## Estrutura
- `index.html`: páginas (Início, Revisão, Diagramas, Quiz, Flashcards, Jogos, Atividade, Cola)
- `css/style.css`: estilos e temas
- `js/data.js`: todo o conteúdo (questões, flashcards, V/F, associações, choques, atividade); edite aqui para adicionar questões
- `js/charts.js`: gráficos SVG do modelo de Solow
- `js/video.js`: roteiro e animação do vídeo de revisão (player no site)
- `video/audio/`: narrações de cada fala (vozes neurais pt-BR) e `manifest.js` com as durações
- `video/revisao-crescimento.mp4`: o vídeo exportado, com narração e legenda
- `js/app.js`: lógica da aplicação
