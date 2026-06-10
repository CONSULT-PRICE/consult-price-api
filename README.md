# consult-price-api

API em desenvolvimento que recebe o HTML de um cupom fiscal e o transforma em JSON.

## Como iniciar

```bash
npm start
```

Servidor padrao: `http://localhost:3000`

## Endpoint inicial

`POST /cupom`

Corpo esperado:

```json
{
	"html": "<html>...</html>",
	"qrCode": "https://exemplo-do-qr-code",
	"sourceUrl": "https://origem-opcional"
}
```

Resposta exemplo:

```json
{
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

## Proximo passo natural

Ler a URL do QR Code, baixar o HTML correspondente e persistir esse JSON no MongoDB.
