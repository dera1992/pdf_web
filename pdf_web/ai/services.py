from __future__ import annotations

from pdf_web.ai.models import EmbeddingChunk


def embed_document(version, user) -> None:
    text = version.text_content or ""
    words = text.split()
    chunk_size = 200
    chunks = [" ".join(words[i : i + chunk_size]) for i in range(0, len(words), chunk_size)]
    EmbeddingChunk.objects.filter(version=version).delete()
    for index, chunk in enumerate(chunks or [text]):
        EmbeddingChunk.objects.create(
            version=version,
            page_number=1,
            chunk_index=index,
            text=chunk,
            embedding=[0.0] * 1536,
            metadata={"source": "mvp"},
        )
