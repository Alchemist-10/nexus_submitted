# Deployment execution

1. Confirm free-tier constraints and obtain Vercel account connection.
2. Add authenticated short-batch worker endpoint and private cloud-preview transport; test failure/isolation/authorization.
3. Add reproducible private bucket/scheduler definitions. Keep secrets outside migrations and Git. Do not activate scheduling against an unverified URL.
4. Configure Vercel Hobby project/environment, deploy, set final HTTPS origin and Supabase auth redirects, then deploy final configuration.
5. Activate minute schedule with Vault-held credentials, stop duplicate local workers, and verify hosted requests and preview-only delivery.
6. Update Razorpay test webhook where authenticated access is available; run deployed acceptance and record any account-access-dependent steps precisely.
