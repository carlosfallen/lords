# Bot Whatsmeow (Go)

This is the pure Go implementation of the WhatsApp Engine for Império Lord Master CRM, described in Módulo 7.1.

### Features
- Connects to WhatsApp using the robust `whatsmeow` library.
- Acts as a completely blind "machine gun", processing without blocking.
- Listens to New WhatsApp Messages -> Pushes them to Redis Queue (`CRM:bot:inbound_messages`).
- Subscribes to Redis Channel (`CRM:bot:outbound_stream`) -> Forwards to WhatsApp.

### How to Run
```bash
cd apps/bot-whatsmeow
go build -o bot-whatsmeow main.go
./bot-whatsmeow
```
During the first run, it will print a string `evt.Code`. You should convert this string to a QR Code using an online generator or a CLI tool like `qrencode -t UTF8 "STRING"` to scan with your WhatsApp.
