# Escala de Porteiros CCB – PWA

## Publicar no GitHub Pages
1. No repositório `escala-dos-porteiros`, substitua os arquivos pelos deste pacote (na raiz, não envie o ZIP nem uma pasta).
2. Settings > Pages > Deploy from a branch > main > /(root) > Save.
3. Aguarde 1 a 2 minutos e abra o site. Na primeira vez, recarregue a página duas vezes.

## Atualizar a escala para todos
1. Entre no Modo ADM (senha 2580), altere os porteiros e clique em Salvar alterações.
2. Clique em Exportar JSON (gera `escala.json`).
3. No GitHub, substitua o `escala.json` antigo pelo novo.

## Regras
- O app sempre abre no ano e mês atuais.
- Todos os domingos do ano são gerados automaticamente.
- 3 grupos, 4 porteiros por grupo.
- A cada domingo os porteiros mudam de posição (Porta Frente, Átrio, Porta Meio, Banheiro).
- O rodízio usa a ordem cadastrada no domingo 03/01/2027 como referência e continua sem interrupção entre os anos.
