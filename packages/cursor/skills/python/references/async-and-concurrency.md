# Async e concorrência

## Quando usar async

- I/O bound com muitas conexões simultâneas (HTTP, websockets, DB async)
- **Não** usar async para CPU bound — preferir `multiprocessing` ou worker pool

## asyncio básico

```python
async def fetch_all(urls: list[str]) -> list[str]:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_one(session, u) for u in urls]
        return list(await asyncio.gather(*tasks))
```

- `asyncio.run(main())` no entrypoint; evitar mix de loops
- `asyncio.gather` para paralelo; tratar exceções com `return_exceptions=True` se necessário

## Sync vs async

- Não chamar função **blocking** dentro de coroutine sem `asyncio.to_thread` ou executor
- Biblioteca sync-only em hot path async → reconsiderar lib ou isolar em thread pool

## Timeouts e cancelamento

- `async with asyncio.timeout(seconds):` (3.11+) ou `wait_for` em versões anteriores
- Respeitar cancelamento — cleanup em `finally` ou `async with`

## Evitar

- Misturar threads e asyncio sem necessidade clara
- Compartilhar estado mutável entre tasks sem lock
- `time.sleep` em coroutine — usar `await asyncio.sleep`
