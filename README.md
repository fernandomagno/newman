# Painel de Execução Postman

Painel web simples para:
1. Executar (play) uma collection do Postman.
2. Visualizar o histórico de execuções.
3. Visualizar os relatórios de execução (gerados pelo Newman/HTMLExtra).

## Como rodar

```powershell
npm install
npm start
```

Depois acesse: http://localhost:3000

## GitHub Codespaces

1. Envie este repositório para o GitHub e crie um Codespace pela opção **Code > Codespaces**.
2. O Codespace instala as dependências automaticamente com `npm ci` na criação do ambiente.
3. No terminal integrado, execute:

   ```sh
   npm start
   ```

4. Abra a aba **Ports** e acesse a porta `3000`. O Codespaces também pode abrir o navegador automaticamente.

A porta é encaminhada como privada. Para compartilhar o painel, altere a visibilidade da porta conscientemente na aba **Ports**.

## Uso

1. Na aba **Executar Collection**, selecione o arquivo `.json` da collection exportada do Postman
   (e opcionalmente o `.json` do ambiente) e clique em **Play**.
2. Na aba **Histórico de Execuções**, veja todas as execuções já realizadas (data, status, nº de requisições e falhas).
3. Na aba **Relatórios**, abra o relatório HTML detalhado de qualquer execução.

Os dados de histórico ficam salvos em `data/history.json` e os relatórios HTML em `reports/`.
