# Keep Moving — task runner.
#
# There is no backend of our own. The app is a Vite SPA talking to hosted
# Supabase, and there are no edge functions, so `dev` is one process with
# hot module reload, not two. See "Why there is no db-watch" at the bottom.

SHELL := /bin/bash
.DEFAULT_GOAL := help

PORT ?= 5173
ENV_FILE := .env.local

.PHONY: help install dev run build preview verify check migrations clean reset \
        db-check db-status db-push db-new db-lint db-types

help: ## Show this help
	@echo "Keep Moving — make targets"
	@echo
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-11s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "  PORT=$(PORT) (override: make dev PORT=3000)"

# --- guards -----------------------------------------------------------------

# Vite inlines import.meta.env at build time. Without credentials the app
# correctly compiles down to just the setup screen — and verify-build fails
# rather than letting a near-empty bundle look like a success.
$(ENV_FILE):
	@echo "error: $(ENV_FILE) is missing."
	@echo "       cp .env.example $(ENV_FILE) and paste your anon key."
	@exit 1

node_modules: package.json package-lock.json
	npm install
	@touch node_modules

# --- running ----------------------------------------------------------------

install: node_modules ## Install dependencies

dev: node_modules $(ENV_FILE) ## Dev server with hot reload (the everyday loop)
	npm run dev -- --port $(PORT)

run: build ## Build for production, then serve that build locally
	npm run preview -- --port $(PORT)

preview: ## Serve an existing build without rebuilding
	npm run preview -- --port $(PORT)

# --- building ---------------------------------------------------------------

build: node_modules $(ENV_FILE) ## Production build + verify every screen shipped
	npm run build

verify: ## Re-run the bundle check against the current dist/
	npm run verify

check: build migrations ## What CI runs: build, screens present, migrations sane
	@echo "ok"

migrations: ## Migrations well-named and committed (no network)
	@node scripts/check-migrations.mjs

# --- database (acts on the LINKED REMOTE project) ---------------------------

db-check: ## Fail if the linked project and supabase/migrations disagree
	@node scripts/check-drift.mjs

db-status: ## Show every migration's local/remote state
	supabase migration list

db-push: ## Apply pending migrations to the linked project
	supabase db push

db-new: ## Scaffold a migration: make db-new NAME=add_something
	@test -n "$(NAME)" || { echo "usage: make db-new NAME=add_something"; exit 1; }
	supabase migration new $(NAME)

db-lint: ## Lint the schema (run after anything that adds a table)
	supabase db lint

db-types: ## Regenerate TypeScript types from the linked schema
	npm run db:types

# --- housekeeping -----------------------------------------------------------

clean: ## Remove build output and Vite's cache
	rm -rf dist node_modules/.vite

reset: clean ## Also drop node_modules
	rm -rf node_modules

# --- Why there is no db-watch -----------------------------------------------
#
# "Reload the backend on change" would mean re-applying supabase/migrations on
# every save. But config.toml is linked to the hosted project, so that would
# run schema changes against the real database each time a file is written —
# and migrations do not roll back.
#
# The safe version of that loop is a local stack: `supabase start` (needs
# Docker) plus `supabase db reset` on change, against a throwaway database.
# That is worth adding if this ever grows edge functions or a local workflow.
# Until then, `make db-push` stays deliberately manual.
