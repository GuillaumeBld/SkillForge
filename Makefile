.PHONY: install ingest seed embed demand test run

install:
	pip3 install -r requirements.txt

# Run in order: seed → embed → demand → run
ingest:
	python3 scripts/ingest_lmic.py

seed:
	python3 scripts/seed_occupations.py

embed:
	python3 scripts/generate_embeddings.py --model all-MiniLM-L6-v2

embed-full:
	python3 scripts/generate_embeddings.py --model all-mpnet-base-v2

demand:
	python3 scripts/seed_demand.py

setup: seed embed demand

test:
	python3 -m pytest tests/ -v

run:
	python3 -m uvicorn api.main:app --reload --port 8000

run-prod:
	python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 2
