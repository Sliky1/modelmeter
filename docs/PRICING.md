# Pricing

Built-in pricing is expressed as USD per 1M tokens and is used for local cost estimation only.

You can override pricing with VS Code settings:

```json
{
  "modelmeter.customPricing": {
    "openai:gpt-4o": {
      "input": 2.5,
      "output": 10,
      "cachedInput": 1.25
    },
    "my-custom-model": {
      "input": 1,
      "output": 2
    }
  }
}
```

Lookup order:

1. `provider:model`
2. `model`
3. built-in provider model
4. provider default model
5. zero-cost fallback
