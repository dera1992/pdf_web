from __future__ import annotations

import re
from collections import Counter

from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from pdf_web.ai.models import ChatMessage
from pdf_web.ai.models import ChatSession
from pdf_web.ai.models import EmbeddingChunk
from pdf_web.ai.models import RedactionSuggestion
from pdf_web.documents.models import WorkspaceRole
from pdf_web.permissions import require_role

from .serializers import ChatMessageSerializer
from .serializers import ChatSessionSerializer
from .serializers import RedactionSuggestionSerializer


class ChatSessionViewSet(ModelViewSet):
    serializer_class = ChatSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatSession.objects.filter(
            Q(document__workspace__owner=self.request.user)
            | Q(document__workspace__memberships__user=self.request.user)
        ).distinct()

    def perform_create(self, serializer):
        document = serializer.validated_data["document"]
        require_role(
            self.request.user,
            document.workspace,
            [WorkspaceRole.VIEWER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER],
        )
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="message")
    def message(self, request, pk=None):
        session = self.get_object()
        require_role(
            request.user,
            session.document.workspace,
            [WorkspaceRole.VIEWER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER],
        )
        user_message = request.data.get("content", "")
        ChatMessage.objects.create(session=session, role="user", content=user_message)

        intent, prompt, selected_text = _parse_message_context(user_message)
        ranked_chunks = _rank_chunks(
            EmbeddingChunk.objects.filter(version=session.document.current_version),
            query=prompt,
            selected_text=selected_text,
            limit=5,
        )
        assistant_content = _generate_grounded_response(intent=intent, prompt=prompt, ranked_chunks=ranked_chunks)
        message = ChatMessage.objects.create(session=session, role="assistant", content=assistant_content)
        citations = [
            {
                "id": f"chunk-{entry['chunk'].id}",
                "page": entry["chunk"].page_number,
                "label": _label_from_text(entry["chunk"].text),
                "relevance_score": round(entry["score"], 4),
                "match_reasons": entry["reasons"],
            }
            for entry in ranked_chunks
        ]
        supporting_text = [
            ((entry["chunk"].text or "").strip()[:280])
            for entry in ranked_chunks
            if (entry["chunk"].text or "").strip()
        ]
        payload = ChatMessageSerializer(message).data
        payload["citations"] = citations
        payload["supporting_text"] = supporting_text[:3]
        return Response(payload, status=status.HTTP_201_CREATED)


def _parse_message_context(raw_content: str) -> tuple[str, str, str]:
    if not raw_content:
        return "question", "", ""

    intent_match = re.search(r"^Intent:\s*(\w+)", raw_content, flags=re.IGNORECASE | re.MULTILINE)
    prompt_match = re.search(r"^User prompt:\s*(.+)$", raw_content, flags=re.IGNORECASE | re.MULTILINE)
    selected_text_match = re.search(r"Selected text:\s*(.+)", raw_content, flags=re.IGNORECASE | re.DOTALL)

    intent = (intent_match.group(1).strip().lower() if intent_match else "question")
    prompt = (prompt_match.group(1).strip() if prompt_match else raw_content.strip())
    selected_text = (selected_text_match.group(1).strip() if selected_text_match else "")
    return intent, prompt, selected_text


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", (text or "").lower())


def _label_from_text(text: str) -> str:
    snippet = (text or "").strip()
    if not snippet:
        return "Source excerpt"
    sentence = re.split(r"(?<=[.!?])\s+", snippet)[0]
    return sentence[:120]


def _rank_chunks(queryset, query: str, selected_text: str, limit: int = 5):
    chunks = list(queryset)
    if not chunks:
        return []

    query_tokens = _tokenize(query)
    selected_tokens = _tokenize(selected_text)
    query_counter = Counter(query_tokens)
    selected_counter = Counter(selected_tokens)

    ranked = []
    for chunk in chunks:
        chunk_text = (chunk.text or "").strip()
        chunk_tokens = _tokenize(chunk_text)
        chunk_counter = Counter(chunk_tokens)

        query_overlap = sum(min(chunk_counter[t], c) for t, c in query_counter.items())
        selected_overlap = sum(min(chunk_counter[t], c) for t, c in selected_counter.items())
        density = (query_overlap + (0.5 * selected_overlap)) / max(len(chunk_tokens), 1)
        coverage = query_overlap / max(len(query_tokens), 1)

        score = (2.5 * coverage) + (4 * density) + (0.8 * selected_overlap)
        reasons = []
        if query_overlap:
            reasons.append(f"query token overlap: {query_overlap}")
        if selected_overlap:
            reasons.append(f"selection overlap: {selected_overlap}")
        if not reasons:
            reasons.append("fallback by document order")

        ranked.append({"chunk": chunk, "score": score, "reasons": reasons})

    ranked.sort(key=lambda entry: (entry["score"], -entry["chunk"].chunk_index), reverse=True)
    return ranked[:limit]


def _generate_grounded_response(intent: str, prompt: str, ranked_chunks: list[dict]) -> str:
    if not ranked_chunks:
        return "I couldn't find indexed document context yet. Please try again after document indexing completes."

    top_snippets = [entry["chunk"].text.strip() for entry in ranked_chunks if entry["chunk"].text.strip()]
    top_snippets = top_snippets[:3]

    if intent == "summary":
        bullets = [f"- {snippet[:220]}" for snippet in top_snippets]
        return "Summary based on the most relevant passages:\n" + "\n".join(bullets)

    if intent == "explain":
        explanation = top_snippets[0][:320] if top_snippets else ""
        return (
            "Plain-language explanation:\n"
            f"{explanation}\n\n"
            "In short: this section describes key points from the document context shown in citations."
        )

    if prompt:
        answer_prefix = f"Answer to your question ({prompt[:120]}):"
    else:
        answer_prefix = "Answer to your question:"
    return answer_prefix + "\n" + "\n".join(f"- {snippet[:220]}" for snippet in top_snippets)


class RedactionSuggestionViewSet(ModelViewSet):
    serializer_class = RedactionSuggestionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RedactionSuggestion.objects.filter(
            Q(version__document__workspace__owner=self.request.user)
            | Q(version__document__workspace__memberships__user=self.request.user)
        ).distinct()
