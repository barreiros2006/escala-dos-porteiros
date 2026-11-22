# Escala de Porteiros CCB – PWA

## Publicar no GitHub Pages
1. Envie todos os arquivos deste pacote para a RAIZ do repositório, substituindo os atuais.
2. Settings > Pages > Deploy from a branch > main > /(root) > Save.
3. Aguarde 1 a 2 minutos e recarregue o site (Ctrl + F5).

## Atualizar a escala para todos
1. Entre no Modo ADM (senha 2580), altere os porteiros e clique em Salvar alterações.
2. No ADM, clique em Exportar JSON (gera `escala.json`).
3. No GitHub, substitua o `escala.json` antigo pelo novo.

## Regras
- O app sempre abre no ano e mês atuais.
- Todos os domingos do ano são gerados automaticamente.
- 3 grupos, 4 porteiros por grupo.
- A cada domingo os porteiros mudam de posição (Pedido de Oração, Átrio, Porta do Meio, Banheiro).
- O rodízio usa a ordem cadastrada no domingo 03/01/2027 como referência e continua entre os anos.
- Exportar Excel, Exportar JSON e Importar JSON ficam somente no Modo ADM.
