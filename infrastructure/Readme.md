# Infrastructure Deployment

1. Update parameter files
1. Temp: Update JWT secret
1. Do deployment: `az deployment group create -g rg-dfx-kyc-{env} -f infrastructure/bicep/dfx-kyc.bicep -p infrastructure/bicep/parameters/{env}.json`
