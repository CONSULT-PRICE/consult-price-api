# consult-price-api

API em desenvolvimento que recebe o HTML de um cupom fiscal, ou a URL do QR Code da Fazenda, transforma em JSON e salva no MongoDB.

## Como iniciar

```bash
npm start
```

Voce tambem pode criar um arquivo `.env` na raiz com a configuracao do MongoDB.

Servidor padrao: `http://localhost:3000`

MongoDB local padrao:

- URI: `mongodb://127.0.0.1:27017`
- Banco: `consult-price`
- Colecao: `cupons`

Variaveis opcionais:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `MONGODB_COLLECTION_NAME`
- `MONGODB_CONNECT_TIMEOUT_MS`
- `MONGODB_SERVER_SELECTION_TIMEOUT_MS`
- `REMOTE_FETCH_TIMEOUT_MS`

## Endpoint inicial

`POST /cupom`

Corpo esperado:

```json
{
	"html": "<html>...</html>",
	"qrCode": "https://portalsped.fazenda...",
	"sourceUrl": "https://portalsped.fazenda...",
	"qrCodeImageUrl": "https://exemplo.com/qr.png",
	"qrCodeImageBase64": "data:image/png;base64,iVBOR..."
}
```

Voce pode enviar:

- `html`, quando ja tiver o conteudo da pagina.
- `sourceUrl`, quando quiser que a API baixe o HTML da NFC-e.
- `qrCode`, quando o leitor devolver diretamente a URL da Fazenda.
- `qrCodeImageUrl`, quando tiver a imagem do QR Code hospedada em algum lugar.
- `qrCodeImageBase64`, quando enviar a imagem do QR Code direto no JSON.

Quando `qrCodeImageUrl` ou `qrCodeImageBase64` forem enviados, a API usa `jimp` + `qrcode-reader` para decodificar a imagem, extrair a URL da Fazenda e depois fazer o parsing do HTML com `cheerio`.

Resposta exemplo:

```json
{
	"_id": "6848d8d4f7a8f4b2a1234567",
	"estabelecimento": "Mercado Exemplo LTDA",
	"cnpj": "12.345.678/0001-90",
	"emittedAt": "10/06/2026 12:34:56",
	"accessKey": null,
	"total": 26.5,
	"items": [
		{
			"description": "Arroz",
			"quantity": 1,
			"unitPrice": null,
			"totalPrice": 10.5
		}
	],
	"itemCount": 1,
	"source": {
		"qrCode": "https://exemplo-do-qr-code",
		"sourceUrl": "https://origem-opcional",
		"importedAt": "2026-06-10T00:00:00.000Z"
	},
	"metadata": {
		"title": "Cupom Fiscal",
		"rawHtmlLength": 1234
	}
}
```

## Como testar com MongoDB local

1. Garanta que o MongoDB esteja rodando no `localhost:27017`.
2. Inicie a API com `npm start`.
3. Envie um `POST /cupom` com `sourceUrl`, `qrCode`, `qrCodeImageUrl`, `qrCodeImageBase64` ou `html`.
4. Confira o documento salvo na colecao `cupons` do banco `consult-price`.

## Como testar com uma conexao Mongo existente

1. Copie a URI que voce ja usa no VS Code.
2. Crie um arquivo `.env` baseado em `.env.example`.
3. Reinicie a API com `npm start`.
4. Teste `GET /health/db` antes de testar `POST /cupom`.

## Proximo passo natural

Separar testes automatizados e evoluir o schema persistido conforme as consultas que voces vao fazer no MongoDB.
