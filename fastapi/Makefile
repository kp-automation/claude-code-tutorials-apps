.PHONY: install dev seed test run clean

install:
	pip install -e .

dev:
	pip install -e ".[dev]"

seed:
	python -m app.seed

test:
	pytest -v

test-cov:
	pytest --cov=app --cov-report=html --cov-report=term

run:
	uvicorn app.main:app --reload

migrate:
	alembic upgrade head

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf *.egg-info
	rm -f taskforge.db
	rm -f test.db
