# ModelMeter Usage

## Add an API account

Run `ModelMeter: Add / Configure API Account`, select a provider, give the account an alias, and paste the API key.

## Monitor balance

Open the ModelMeter activity bar view. Providers with balance APIs show account balance. Providers without balance APIs still support local usage cost estimation.

## Add manual usage

Run `ModelMeter: Add Manual Usage Record`, choose a model, then enter input, cached input, and output token counts. ModelMeter estimates cost using built-in pricing or `modelmeter.customPricing`.

## Export usage

Run `ModelMeter: Export Usage CSV` to export the active account's local 30-day history.

## Clear history

Run `ModelMeter: Clear Usage History` to clear only the active account's local history. API keys are not deleted by this command.
