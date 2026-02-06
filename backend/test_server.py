import importlib.util

import pytest


def test_fastapi_and_uvicorn_available():
    assert importlib.util.find_spec("fastapi") is not None
    assert importlib.util.find_spec("uvicorn") is not None


def test_docling_dependency_available_or_skipped():
    if importlib.util.find_spec("docling") is None:
        pytest.skip("docling is not installed in this environment")

    from docling.document_converter import DocumentConverter

    assert DocumentConverter is not None
