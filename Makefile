# 404 Pets — dev tasks

VERSION := $(shell sed -n 's/.*"version": "\([^"]*\)".*/\1/p' manifest.json)
DIST    := dist
ZIP     := $(DIST)/404-pets-$(VERSION).zip
PORT    ?= 8404

.PHONY: help check icons zip serve clean

help: ## Show this help
	@grep -E '^[a-z]+:.*##' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  make %-8s %s\n", $$1, $$2}'

check: ## Syntax-check the JavaScript
	node --check content/pet.js
	node --check popup/popup.js
	@echo "JS OK"

icons: ## Regenerate the extension icons (16/48/128)
	python3 scripts/gen_icons.py

zip: check ## Build a distributable zip in dist/
	mkdir -p $(DIST)
	rm -f $(ZIP)
	python3 -m zipfile -c $(ZIP) manifest.json content popup icons
	@echo "built $(ZIP)"

serve: ## Serve the repo for the demo page (demo/index.html)
	@echo "demo at http://leaf-rain:$(PORT)/demo/index.html"
	python3 -m http.server $(PORT) --bind 0.0.0.0

clean: ## Remove build artifacts
	rm -rf $(DIST)
