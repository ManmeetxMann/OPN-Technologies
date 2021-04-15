.DEFAULT_GOAL := makefile_options
makefile_options:
	@echo Use This to Deploy Indexes. e.g. make deploy_indexes_to_dev

deploy_indexes_to_local:
	cd ./opn-platform-local;cp ../firestore.indexes.json ./firestore.indexes.json;firebase deploy --only firestore:indexes;rm ./firestore.indexes.json

deploy_indexes_to_infra_dev:
	cd ./opn-platform-infra-dev;cp ../firestore.indexes.json ./firestore.indexes.json;firebase deploy --only firestore:indexes;rm ./firestore.indexes.json

deploy_indexes_to_dev:
	cd ./opn-platform-dev;cp ../firestore.indexes.json ./firestore.indexes.json;firebase deploy --only firestore:indexes;rm ./firestore.indexes.json

deploy_indexes_to_preprod:
	cd ./opn-platform-preprod;cp ../firestore.indexes.json ./firestore.indexes.json;firebase deploy --only firestore:indexes;rm ./firestore.indexes.json

deploy_indexes_to_ca_prod:
	cd ./opn-platform-ca-prod;cp ../firestore.indexes.json ./firestore.indexes.json;firebase deploy --only firestore:indexes;rm ./firestore.indexes.json